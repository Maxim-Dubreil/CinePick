"""AI recommendation proxy (CIN-49).

Named generically (not `gemini.py`) so a future provider swap only touches
this file's internals, never its callers. `_call_gemini` is the sole
function talking to the real SDK, isolated for testability (same pattern as
`tmdb.py`'s `_search_movie_id`/`_fetch_details`).

Never retries and never falls back to a random pick: any failure — a
network/API error, a malformed response, or a response naming a film outside
`candidates` — raises `AIProviderError` and lets the caller decide (see
`main.py`, which turns this into a 502). Reproposing a film outside the
already-filtered watchlist would violate the North Star's principle #2.
"""

import json
import logging
import os

from google import genai
from google.genai import types

from models import RecommendRequest, WatchlistFilm

logger = logging.getLogger(__name__)

_MODEL = "gemini-3.6-flash"
_REQUEST_TIMEOUT = 10.0
_OVERVIEW_MAX_CHARS = 200
_RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {"film_id": {"type": "string"}},
    "required": ["film_id"],
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
        f"Pick exactly one film from this list for someone who {_soft_signals(answers)}. "
        'Reply with ONLY a JSON object like {"film_id": "<id>"}, using one of the ids '
        f"below, nothing else.\n\n{films_block}"
    )


async def _call_gemini(prompt: str) -> str:
    """The only function touching the real Gemini SDK — monkeypatched in tests."""
    client = genai.Client(
        api_key=os.environ["GEMINI_API_KEY"],
        http_options=types.HttpOptions(timeout=int(_REQUEST_TIMEOUT * 1000)),
    )
    response = await client.aio.models.generate_content(
        model=_MODEL,
        contents=prompt,
        config={
            "response_mime_type": "application/json",
            "response_schema": _RESPONSE_SCHEMA,
        },
    )
    if response.text is None:
        raise ValueError("Gemini response has no text content")
    return response.text


async def pick_film(candidates: list[WatchlistFilm], answers: RecommendRequest) -> WatchlistFilm:
    """Ask Gemini to pick exactly one film id among `candidates`, returning
    the matching `WatchlistFilm`."""
    prompt = _build_prompt(candidates, answers)
    try:
        raw = await _call_gemini(prompt)
        chosen_id = json.loads(raw)["film_id"]
    except Exception as exc:
        logger.exception("Gemini call failed or returned an unparseable response")
        raise AIProviderError("AI call failed or returned an unparseable response") from exc

    for film in candidates:
        if film.id == chosen_id:
            return film
    raise AIProviderError(f"AI picked film id {chosen_id!r}, outside the candidate set")
