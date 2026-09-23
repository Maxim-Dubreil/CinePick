"""AI recommendation proxy (CIN-49).

Named generically (not `gemini.py`) so a future provider swap only touches
this file's internals, never its callers. `_call_gemini` is the sole
function talking to the real SDK, isolated for testability (same pattern as
`tmdb.py`'s `_search_movie_id`/`_fetch_details`).

Only retry: a 5xx from the primary model switches once to a fallback model
(same prompt, same validation). Never falls back to a random pick: any other
failure — a network/API error, a malformed response, or a response naming a
film outside `candidates` — raises `AIProviderError` and lets the caller
decide (see `main.py`, which turns this into a 502). Reproposing a film
outside the already-filtered watchlist would violate the North Star's
principle #2.
"""

import json
import logging
import os

from google import genai
from google.genai import errors, types

from models import RankedCandidate, RecommendRequest, WatchlistFilm

logger = logging.getLogger(__name__)

_MODEL = "gemini-3.1-flash-lite"
# Used only when _MODEL answers a 5xx (Google overload). Thinking is kept at
# "minimal": at the default level it takes 20s+ on this prompt, close to
# _REQUEST_TIMEOUT. A "-preview" model can be retired by Google — see CIN-94
# in docs/specs/ai.md before swapping it.
_FALLBACK_MODEL = "gemini-3-flash-preview"
_REQUEST_TIMEOUT = 30.0
_OVERVIEW_MAX_CHARS = 200
_MAX_CANDIDATES = 3
_RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "candidates": {
            "type": "array",
            "minItems": 1,
            "maxItems": _MAX_CANDIDATES,
            "items": {
                "type": "object",
                "properties": {
                    "film_id": {"type": "string"},
                    "rank": {"type": "integer", "minimum": 1, "maximum": _MAX_CANDIDATES},
                    "match_score": {"type": "integer", "minimum": 0, "maximum": 100},
                    "critique": {"type": "string", "maxLength": 1000},
                },
                "required": ["film_id", "rank", "match_score", "critique"],
            },
        }
    },
    "required": ["candidates"],
}
_NO_PREFERENCE = ("none", "any")


class AIProviderError(Exception):
    """Raised on any AI call failure, or a response naming a film outside
    the candidate set."""


def _soft_signals(answers: RecommendRequest) -> str:
    """Render the soft signals (emotion/ambiance/withWho/subtitles) as a
    natural-language clause for the prompt, omitting any that carry a
    "no preference" sentinel (`"none"`/`"any"`) instead of leaking it into
    the prompt text."""
    parts = []
    emotions = [v for v in answers.emotion if v not in _NO_PREFERENCE]
    if emotions:
        parts.append(f"wants to feel {', '.join(emotions)}")
    ambiances = [v for v in answers.ambiance if v not in _NO_PREFERENCE]
    if ambiances:
        parts.append(f"wants a {', '.join(ambiances)} mood")
    if answers.withWho not in _NO_PREFERENCE:
        parts.append(f"watching {answers.withWho}")
    if answers.subtitles not in _NO_PREFERENCE:
        parts.append(f"subtitles {answers.subtitles}")
    return ", ".join(parts) if parts else "has no specific preference"


def _build_prompt(candidates: list[WatchlistFilm], answers: RecommendRequest) -> str:
    films_block = "\n".join(
        f"- id={f.id} | {f.title} ({f.year or '?'}) | "
        f"{(f.overview or 'no synopsis')[:_OVERVIEW_MAX_CHARS]}"
        for f in candidates
    )
    return (
        f"Pick up to {_MAX_CANDIDATES} films from this list, ranked best first, "
        f"for someone who {_soft_signals(answers)}. For each, give a match_score "
        "(0-100) and a 1-2 sentence critique, written in French, referencing at "
        "least one of their preferences. Reply with ONLY a JSON object like "
        '{"candidates": [{"film_id": "<id>", "rank": 1, "match_score": 90, '
        '"critique": "..."}]}, using only ids from the list below, nothing else.'
        f"\n\n{films_block}"
    )


async def _call_gemini(prompt: str) -> str:
    """The only function touching the real Gemini SDK — monkeypatched in tests."""
    client = genai.Client(
        api_key=os.environ["GEMINI_API_KEY"],
        http_options=types.HttpOptions(timeout=int(_REQUEST_TIMEOUT * 1000)),
    )
    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=_RESPONSE_SCHEMA,
    )
    try:
        response = await client.aio.models.generate_content(
            model=_MODEL, contents=prompt, config=config
        )
    except errors.ServerError:
        logger.warning("Gemini %s unavailable, falling back to %s", _MODEL, _FALLBACK_MODEL)
        config.thinking_config = types.ThinkingConfig(thinking_level=types.ThinkingLevel.MINIMAL)
        response = await client.aio.models.generate_content(
            model=_FALLBACK_MODEL, contents=prompt, config=config
        )
    if response.text is None:
        raise ValueError("Gemini response has no text content")
    return response.text


async def pick_candidates(
    candidates: list[WatchlistFilm], answers: RecommendRequest
) -> list[RankedCandidate]:
    """Ask Gemini to rank up to 3 films among `candidates`. Every returned id
    must belong to `candidates` — if even one doesn't, or the response is
    malformed or empty, raises `AIProviderError` (never retries, never
    falls back to a partial or default pick)."""
    prompt = _build_prompt(candidates, answers)
    by_id = {film.id: film for film in candidates}
    try:
        raw = await _call_gemini(prompt)
        parsed = json.loads(raw)["candidates"]
        if not parsed:
            raise ValueError("AI returned zero candidates")
        if len(parsed) > _MAX_CANDIDATES or len({c["film_id"] for c in parsed}) != len(parsed):
            raise ValueError("AI returned more than the max candidates, or duplicate film ids")
        ranks = [candidate["rank"] for candidate in parsed]
        if ranks != list(range(1, len(parsed) + 1)):
            raise ValueError("AI returned non-sequential ranks")
        results = [
            RankedCandidate(
                film=by_id[c["film_id"]],
                rank=c["rank"],
                match_score=c["match_score"],
                critique=c["critique"],
            )
            for c in parsed
        ]
    except Exception as exc:
        logger.exception("Gemini call failed or returned an unparseable response")
        raise AIProviderError("AI call failed or returned an unparseable response") from exc
    return results
