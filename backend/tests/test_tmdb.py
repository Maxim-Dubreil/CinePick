"""Tests for the TMDB enrichment client (CIN-46 jalon 1)."""

import httpx

import tmdb
from models import Film
from tmdb import enrich_many, search_and_enrich


def _client(handler) -> httpx.AsyncClient:
    return httpx.AsyncClient(transport=httpx.MockTransport(handler))


async def test_search_and_enrich_nominal():
    def handler(request: httpx.Request) -> httpx.Response:
        if "/search/movie" in str(request.url):
            return httpx.Response(200, json={"results": [{"id": 42}]})
        if "/movie/42" in str(request.url):
            return httpx.Response(
                200,
                json={
                    "runtime": 120,
                    "release_date": "2021-03-04",
                    "genres": [
                        {"id": 28, "name": "Action"},
                        {"id": 12, "name": "Adventure"},
                    ],
                    "production_countries": [
                        {"iso_3166_1": "US", "name": "United States of America"}
                    ],
                },
            )
        return httpx.Response(404)

    async with _client(handler) as client:
        result = await search_and_enrich("Some Film", 2021, client=client)

    assert result is not None
    assert result.tmdb_id == 42
    assert result.runtime == 120
    assert result.year == 2021
    assert result.genres == [28, 12]
    assert result.origin_country == ["US"]


async def test_search_and_enrich_no_match_returns_none():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"results": []})

    async with _client(handler) as client:
        result = await search_and_enrich("Unknown Film", 1999, client=client)

    assert result is None


async def test_search_and_enrich_network_error_returns_none():
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectTimeout("timed out")

    async with _client(handler) as client:
        result = await search_and_enrich("Some Film", 2021, client=client)

    assert result is None


async def test_search_and_enrich_details_error_returns_none():
    def handler(request: httpx.Request) -> httpx.Response:
        if "/search/movie" in str(request.url):
            return httpx.Response(200, json={"results": [{"id": 42}]})
        return httpx.Response(500)

    async with _client(handler) as client:
        result = await search_and_enrich("Some Film", 2021, client=client)

    assert result is None


async def test_search_and_enrich_malformed_search_result_returns_none():
    """A search result missing the `id` key must degrade to None, not raise
    KeyError (any failure is best-effort, per this module's contract)."""

    def handler(request: httpx.Request) -> httpx.Response:
        if "/search/movie" in str(request.url):
            return httpx.Response(200, json={"results": [{}]})
        return httpx.Response(404)

    async with _client(handler) as client:
        result = await search_and_enrich("Some Film", 2021, client=client)

    assert result is None


async def test_search_and_enrich_malformed_details_returns_none():
    """Details JSON with a genre missing `id` must degrade to None, not raise
    KeyError."""

    def handler(request: httpx.Request) -> httpx.Response:
        if "/search/movie" in str(request.url):
            return httpx.Response(200, json={"results": [{"id": 42}]})
        if "/movie/42" in str(request.url):
            return httpx.Response(200, json={"genres": [{"name": "Action"}]})
        return httpx.Response(404)

    async with _client(handler) as client:
        result = await search_and_enrich("Some Film", 2021, client=client)

    assert result is None


async def test_enrich_many_maps_by_slug(monkeypatch):
    films = [
        Film(slug="film-a", title="Film A", year=2020, poster_url=None),
        Film(slug="film-b", title="Film B", year=2021, poster_url=None),
    ]

    async def fake_search_and_enrich(title, year, *, client=None):
        return None

    monkeypatch.setattr(tmdb, "search_and_enrich", fake_search_and_enrich)

    result = await enrich_many(films, concurrency=2)

    assert result == {"film-a": None, "film-b": None}
