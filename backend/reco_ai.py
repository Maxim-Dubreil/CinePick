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
import os

from google import genai

from models import RecommendRequest, WatchlistFilm

_MODEL = "gemini-2.5-flash"


class AIProviderError(Exception):
    """Raised on any AI call failure, or a response naming a film outside
    the candidate set."""


def _build_prompt(candidates: list[WatchlistFilm], answers: RecommendRequest) -> str:
    films_block = "\n".join(
        f"- id={f.id} | {f.title} ({f.year or '?'}) | {f.overview or 'no synopsis'}"
        for f in candidates
    )
    return (
        "Pick exactly one film from this list for someone who wants to feel "
        f"{', '.join(answers.emotion)}, in a {', '.join(answers.ambiance)} mood, "
        f"watching {answers.withWho}. Reply with ONLY a JSON object like "
        '{"film_id": "<id>"}, using one of the ids below, nothing else.\n\n'
        f"{films_block}"
    )


async def _call_gemini(prompt: str) -> str:
    """The only function touching the real Gemini SDK — monkeypatched in tests."""
    client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    response = await client.aio.models.generate_content(model=_MODEL, contents=prompt)
    return response.text


async def pick_film(candidates: list[WatchlistFilm], answers: RecommendRequest) -> WatchlistFilm:
    prompt = _build_prompt(candidates, answers)
    try:
        raw = await _call_gemini(prompt)
        chosen_id = json.loads(raw)["film_id"]
    except Exception as exc:
        raise AIProviderError("AI call failed or returned an unparseable response") from exc

    for film in candidates:
        if film.id == chosen_id:
            return film
    raise AIProviderError(f"AI picked film id {chosen_id!r}, outside the candidate set")
