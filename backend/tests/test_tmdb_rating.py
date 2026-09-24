"""Tests for the TMDB rating client (CIN-104)."""

import httpx
import pytest

import tmdb_rating as tmdb_rating_module
from cache import TTLCache
from tmdb_rating import get_rating


@pytest.fixture(autouse=True)
def reset_cache():
    """The module-level cache is process-global state — without a fresh
    instance per test, tests sharing a `tmdb_id` (most of them use 238)
    would see each other's cached results instead of hitting their own
    mock TMDB response."""
    tmdb_rating_module._cache = TTLCache(tmdb_rating_module._CACHE_TTL_SECONDS)


def _client(handler) -> httpx.AsyncClient:
    return httpx.AsyncClient(transport=httpx.MockTransport(handler))


def _response(vote_average: float, vote_count: int) -> httpx.Response:
    return httpx.Response(
        200, json={"id": 238, "vote_average": vote_average, "vote_count": vote_count}
    )


async def test_get_rating_nominal():
    def handler(request: httpx.Request) -> httpx.Response:
        return _response(8.7, 19000)

    async with _client(handler) as client:
        result = await get_rating(238, client=client)

    assert result.vote_average == 8.7


async def test_get_rating_no_votes_is_none_not_zero():
    """A film TMDB has never had voted on returns `vote_average: 0.0` with
    `vote_count: 0` — that must surface as `None`, not a genuine 0/10."""

    def handler(request: httpx.Request) -> httpx.Response:
        return _response(0.0, 0)

    async with _client(handler) as client:
        result = await get_rating(999, client=client)

    assert result.vote_average is None


async def test_get_rating_tmdb_error_raises():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500)

    async with _client(handler) as client:
        with pytest.raises(httpx.HTTPStatusError):
            await get_rating(238, client=client)


async def test_get_rating_network_error_raises():
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectTimeout("timed out")

    async with _client(handler) as client:
        with pytest.raises(httpx.ConnectTimeout):
            await get_rating(238, client=client)


async def test_get_rating_second_call_is_served_from_cache():
    calls = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        return _response(8.7, 19000)

    async with _client(handler) as client:
        first = await get_rating(238, client=client)
        second = await get_rating(238, client=client)

    assert len(calls) == 1, "the second call must be served from cache, not hit TMDB again"
    assert second == first


async def test_get_rating_refetches_after_ttl_expiry():
    now = [0.0]
    tmdb_rating_module._cache = TTLCache(ttl_seconds=10, clock=lambda: now[0])
    calls = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        return _response(8.7, 19000)

    async with _client(handler) as client:
        await get_rating(238, client=client)
        now[0] = 10  # exactly at the TTL boundary: must be treated as expired
        await get_rating(238, client=client)

    assert len(calls) == 2


async def test_get_rating_does_not_cache_tmdb_errors():
    """A failed lookup must never be remembered as if it were the film's
    real rating — the next call has to retry TMDB."""
    responses = iter([httpx.Response(500), _response(8.7, 19000)])

    def handler(request: httpx.Request) -> httpx.Response:
        return next(responses)

    async with _client(handler) as client:
        with pytest.raises(httpx.HTTPStatusError):
            await get_rating(238, client=client)
        result = await get_rating(238, client=client)

    assert result.vote_average == 8.7
