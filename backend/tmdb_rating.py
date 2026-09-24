"""TMDB rating lookup — vote_average, FR display only (CIN-104).

Live-fetched and TTL-cached, not persisted to the `films` table: unlike
genres/runtime/director, a rating changes as TMDB users vote, so a cached DB
column would go stale (see docs/db-schema.md, "Ce qui n'est volontairement
pas dans ce schéma"). Mirrors `watch_providers.py`'s pattern — same reasoning,
same shared `TTLCache`, same "failures raise" contract.
"""

import os

import httpx
from pydantic import BaseModel

from cache import TTLCache

_BASE_URL = "https://api.themoviedb.org/3"
_REQUEST_TIMEOUT = 10.0
_CACHE_TTL_SECONDS = 6 * 60 * 60  # 6h


def _api_key() -> str:
    return os.environ.get("TMDB_API_KEY", "")


class RatingResponse(BaseModel):
    vote_average: float | None
    """None when TMDB has no votes yet for this film (`vote_count == 0`) —
    distinct from a genuine low score of 0."""


_cache: TTLCache[int, RatingResponse] = TTLCache(_CACHE_TTL_SECONDS)


async def get_rating(tmdb_id: int, *, client: httpx.AsyncClient | None = None) -> RatingResponse:
    """Fetch a film's TMDB rating, serving a cached result when one is still
    fresh (see module docstring).

    Raises on network error, timeout, or non-200 TMDB response — same
    contract as `watch_providers.get_watch_providers`.
    """
    cached = _cache.get(tmdb_id)
    if cached is not None:
        return cached
    result = await _fetch_rating(tmdb_id, client=client)
    _cache.set(tmdb_id, result)
    return result


async def _fetch_rating(
    tmdb_id: int, *, client: httpx.AsyncClient | None = None
) -> RatingResponse:
    owns_client = client is None
    if client is None:
        client = httpx.AsyncClient(timeout=_REQUEST_TIMEOUT)
    try:
        response = await client.get(
            f"{_BASE_URL}/movie/{tmdb_id}",
            params={"api_key": _api_key()},
        )
        response.raise_for_status()
        data = response.json()
    finally:
        if owns_client:
            await client.aclose()

    vote_count = data.get("vote_count") or 0
    vote_average = data.get("vote_average") if vote_count > 0 else None
    return RatingResponse(vote_average=vote_average)
