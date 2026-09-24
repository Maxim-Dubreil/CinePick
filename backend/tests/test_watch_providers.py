"""Tests for the watch-providers TMDB client (CIN-103)."""

import httpx
import pytest

import watch_providers as watch_providers_module
from cache import TTLCache
from watch_providers import get_watch_providers


@pytest.fixture(autouse=True)
def reset_cache():
    """The module-level cache is process-global state — without a fresh
    instance per test, tests sharing a `tmdb_id` (most of them use 238)
    would see each other's cached results instead of hitting their own
    mock TMDB response."""
    watch_providers_module._cache = TTLCache(watch_providers_module._CACHE_TTL_SECONDS)


def _client(handler) -> httpx.AsyncClient:
    return httpx.AsyncClient(transport=httpx.MockTransport(handler))


def _response(fr_results: dict) -> httpx.Response:
    return httpx.Response(200, json={"id": 238, "results": {"FR": fr_results}})


async def test_get_watch_providers_le_parrain_fixture():
    """Real FR payload for Le Parrain (tmdb 238, captured 2026-09-24): mixed
    whitelisted/non-whitelisted providers, Paramount+ listed under both its
    canonical id and its Amazon Channel variant, Molotov only under `ads`."""

    def handler(request: httpx.Request) -> httpx.Response:
        return _response(
            {
                "link": "https://www.themoviedb.org/movie/238-the-godfather/watch?locale=FR",
                "buy": [
                    {"provider_id": 2, "provider_name": "Apple TV Store", "logo_path": "/a.png"},
                    {"provider_id": 61, "provider_name": "Orange VOD", "logo_path": "/b.png"},
                ],
                "flatrate": [
                    {"provider_id": 531, "provider_name": "Paramount Plus", "logo_path": "/c.png"},
                    {"provider_id": 193, "provider_name": "SFR Play", "logo_path": "/d.png"},
                    {
                        "provider_id": 582,
                        "provider_name": "Paramount+ Amazon Channel",
                        "logo_path": "/e.png",
                    },
                ],
                "ads": [
                    {"provider_id": 1967, "provider_name": "Molotov TV", "logo_path": "/f.png"},
                ],
                "rent": [
                    {"provider_id": 2, "provider_name": "Apple TV Store", "logo_path": "/a.png"},
                    {"provider_id": 61, "provider_name": "Orange VOD", "logo_path": "/b.png"},
                ],
            }
        )

    async with _client(handler) as client:
        result = await get_watch_providers(238, client=client)

    by_id = {p.provider_id: p for p in result.providers}
    assert set(by_id) == {2, 531, 1967}, "Orange VOD/SFR Play aren't whitelisted"

    # Paramount+ (531) and its Amazon Channel variant (582) collapse into one.
    assert by_id[531].name == "Paramount+"
    assert by_id[531].category == "subscription"
    assert by_id[531].ads is False

    # Molotov is only listed under `ads` -> "avec pub" mention.
    assert by_id[1967].name == "Molotov"
    assert by_id[1967].category == "free"
    assert by_id[1967].ads is True

    # Apple TV Store listed under both `buy` and `rent` -> deduplicated once.
    assert by_id[2].name == "Apple TV"
    assert by_id[2].category == "rent_buy"

    assert result.link == "https://www.themoviedb.org/movie/238-the-godfather/watch?locale=FR"


async def test_get_watch_providers_logo_url_is_absolute():
    def handler(request: httpx.Request) -> httpx.Response:
        return _response(
            {"flatrate": [{"provider_id": 8, "provider_name": "Netflix", "logo_path": "/x.png"}]}
        )

    async with _client(handler) as client:
        result = await get_watch_providers(238, client=client)

    assert result.providers[0].logo_url == "https://image.tmdb.org/t/p/w92/x.png"


async def test_get_watch_providers_no_fr_offer_is_empty_not_error():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"id": 999, "results": {}})

    async with _client(handler) as client:
        result = await get_watch_providers(999, client=client)

    assert result.providers == []
    assert result.link is None


async def test_get_watch_providers_tmdb_error_raises():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500)

    async with _client(handler) as client:
        with pytest.raises(httpx.HTTPStatusError):
            await get_watch_providers(238, client=client)


async def test_get_watch_providers_network_error_raises():
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectTimeout("timed out")

    async with _client(handler) as client:
        with pytest.raises(httpx.ConnectTimeout):
            await get_watch_providers(238, client=client)


async def test_get_watch_providers_same_platform_in_two_categories_shows_both():
    """A platform legitimately offering both an ad-supported tier and a full
    subscription (distinct TMDB provider_ids, same canonical platform) must
    show in both categories — deduplication is per (platform, category), not
    per platform alone, so the ad tier never shadows the real subscription."""

    def handler(request: httpx.Request) -> httpx.Response:
        return _response(
            {
                "flatrate": [
                    {"provider_id": 8, "provider_name": "Netflix", "logo_path": "/x.png"}
                ],
                "ads": [
                    {
                        "provider_id": 1796,
                        "provider_name": "Netflix Standard with Ads",
                        "logo_path": "/y.png",
                    }
                ],
            }
        )

    async with _client(handler) as client:
        result = await get_watch_providers(238, client=client)

    by_category = {p.category: p for p in result.providers}
    assert len(result.providers) == 2
    assert by_category["subscription"].provider_id == 8
    assert by_category["subscription"].ads is False
    assert by_category["free"].provider_id == 8
    assert by_category["free"].ads is True


async def test_get_watch_providers_second_call_is_served_from_cache():
    calls = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        return _response(
            {"flatrate": [{"provider_id": 8, "provider_name": "Netflix", "logo_path": "/x.png"}]}
        )

    async with _client(handler) as client:
        first = await get_watch_providers(238, client=client)
        second = await get_watch_providers(238, client=client)

    assert len(calls) == 1, "the second call must be served from cache, not hit TMDB again"
    assert second == first


async def test_get_watch_providers_refetches_after_ttl_expiry():
    now = [0.0]
    watch_providers_module._cache = TTLCache(ttl_seconds=10, clock=lambda: now[0])
    calls = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        return _response(
            {"flatrate": [{"provider_id": 8, "provider_name": "Netflix", "logo_path": "/x.png"}]}
        )

    async with _client(handler) as client:
        await get_watch_providers(238, client=client)
        now[0] = 10  # exactly at the TTL boundary: must be treated as expired
        await get_watch_providers(238, client=client)

    assert len(calls) == 2


async def test_get_watch_providers_does_not_cache_tmdb_errors():
    """A failed lookup must never be remembered as if it were the film's
    real availability — the next call has to retry TMDB."""
    responses = iter([httpx.Response(500), _response({"flatrate": []})])

    def handler(request: httpx.Request) -> httpx.Response:
        return next(responses)

    async with _client(handler) as client:
        with pytest.raises(httpx.HTTPStatusError):
            await get_watch_providers(238, client=client)
        result = await get_watch_providers(238, client=client)

    assert result.providers == []
