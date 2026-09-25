"""Where-to-watch lookup — TMDB `watch/providers`, FR only (CIN-103).

Unlike `tmdb.py`'s enrichment client, failures here are NOT swallowed: a
network error, timeout, or non-200 TMDB response raises, so the route can
turn it into a 502 and the frontend can tell "TMDB is down" (hide the block)
apart from "no FR offer for this film" (200 with an empty `providers` list).

Cached in-process for `_CACHE_TTL_SECONDS` (see `cache.py`) — availability
doesn't change minute to minute, and this is the same shared `TTLCache`
other volatile TMDB-derived data (e.g. ratings) is meant to reuse. Only
successful results are cached: `get_watch_providers` raises before reaching
the `_cache.set` call, so a TMDB failure is never remembered as if it were
the film's real (lack of) availability.
"""

from typing import Literal

import httpx
from pydantic import BaseModel

import tmdb
from cache import TTLCache
from watch_providers_whitelist import CANONICAL_PROVIDERS, resolve

_BASE_URL = "https://api.themoviedb.org/3"
_LOGO_BASE_URL = "https://image.tmdb.org/t/p/w92"
_REQUEST_TIMEOUT = 10.0
_CACHE_TTL_SECONDS = 6 * 60 * 60  # 6h

# Order matters: it's the iteration order below, which decides which raw
# TMDB entry wins when the same platform is deduplicated across categories
# (e.g. a provider listed under both `rent` and `buy`) and whether `ads` ends
# up true or false for it.
_CATEGORY_MAP: dict[str, Literal["free", "subscription", "rent_buy"]] = {
    "free": "free",
    "ads": "free",
    "flatrate": "subscription",
    "rent": "rent_buy",
    "buy": "rent_buy",
}



class WatchProvider(BaseModel):
    provider_id: int
    name: str
    logo_url: str
    category: Literal["free", "subscription", "rent_buy"]
    ads: bool
    """True when this platform only offers the film ad-supported (TMDB's
    `ads` bucket) — the frontend shows an "avec pub" mention for it."""


class WatchProvidersResponse(BaseModel):
    providers: list[WatchProvider]
    link: str | None
    """TMDB's "where to watch" page for this film — one link shared by every
    provider (TMDB doesn't expose a per-platform deep link)."""


_cache: TTLCache[int, WatchProvidersResponse] = TTLCache(_CACHE_TTL_SECONDS)


async def get_watch_providers(
    tmdb_id: int, *, client: httpx.AsyncClient | None = None
) -> WatchProvidersResponse:
    """Fetch and normalize FR watch providers for a film, serving a cached
    result when one is still fresh (see module docstring).

    Raises on network error, timeout, or non-200 TMDB response — see the
    module docstring for why this deliberately doesn't degrade to None like
    `tmdb.py` does.
    """
    cached = _cache.get(tmdb_id)
    if cached is not None:
        return cached
    result = await _fetch_watch_providers(tmdb_id, client=client)
    _cache.set(tmdb_id, result)
    return result


async def _fetch_watch_providers(
    tmdb_id: int, *, client: httpx.AsyncClient | None = None
) -> WatchProvidersResponse:
    owns_client = client is None
    if client is None:
        client = httpx.AsyncClient(timeout=_REQUEST_TIMEOUT)
    try:
        response = await client.get(
            f"{_BASE_URL}/movie/{tmdb_id}/watch/providers",
            headers=tmdb.auth_headers(),
        )
        response.raise_for_status()
        data = response.json()
    finally:
        if owns_client:
            await client.aclose()

    fr = (data.get("results") or {}).get("FR") or {}
    # Keyed by (canonical_id, category) rather than canonical_id alone: the
    # same platform can legitimately appear in two different *categories*
    # (e.g. Netflix's ad tier under "ads" -> free, full Netflix under
    # "flatrate" -> subscription both resolve to canonical id 8) and both are
    # real, distinct ways to watch — only same-category duplicates (e.g. a
    # platform's Amazon Channel variant) should collapse into one.
    seen: dict[tuple[int, str], WatchProvider] = {}
    for tmdb_category, category in _CATEGORY_MAP.items():
        for entry in fr.get(tmdb_category, []):
            canonical_id = resolve(entry["provider_id"])
            if canonical_id is None:
                continue
            key = (canonical_id, category)
            if key in seen:
                continue
            seen[key] = WatchProvider(
                provider_id=canonical_id,
                name=CANONICAL_PROVIDERS[canonical_id],
                logo_url=_LOGO_BASE_URL + entry["logo_path"],
                category=category,
                ads=tmdb_category == "ads",
            )

    return WatchProvidersResponse(providers=list(seen.values()), link=fr.get("link"))
