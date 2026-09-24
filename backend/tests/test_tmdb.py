"""Tests for the TMDB enrichment client (CIN-46 jalon 1)."""

import httpx

import tmdb
from models import Film
from tmdb import enrich_many, search_and_enrich


def _client(handler) -> httpx.AsyncClient:
    return httpx.AsyncClient(transport=httpx.MockTransport(handler))


async def test_search_and_enrich_nominal():
    def handler(request: httpx.Request) -> httpx.Response:
        url = str(request.url)
        if "/search/movie" in url:
            return httpx.Response(200, json={"results": [{"id": 42}]})
        if "/credits" in url:
            return httpx.Response(200, json={})
        if "/movie/42" in url:
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


async def test_search_and_enrich_credits_error_still_returns_details():
    """A failed `/credits` call is best-effort (see `_fetch_credits`) — it
    must not take down the rest of the enrichment, just leave director/actors
    unset."""

    def handler(request: httpx.Request) -> httpx.Response:
        url = str(request.url)
        if "/search/movie" in url:
            return httpx.Response(200, json={"results": [{"id": 42}]})
        if "/credits" in url:
            return httpx.Response(500)
        if "/movie/42" in url:
            return httpx.Response(200, json={"genres": [], "runtime": 120})
        return httpx.Response(404)

    async with _client(handler) as client:
        result = await search_and_enrich("Some Film", 2021, client=client)

    assert result is not None
    assert result.runtime == 120
    assert result.director is None
    assert result.actors == []


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
        url = str(request.url)
        if "/search/movie" in url:
            return httpx.Response(200, json={"results": [{"id": 42}]})
        if "/credits" in url:
            return httpx.Response(200, json={})
        if "/movie/42" in url:
            return httpx.Response(200, json={"genres": [{"name": "Action"}]})
        return httpx.Response(404)

    async with _client(handler) as client:
        result = await search_and_enrich("Some Film", 2021, client=client)

    assert result is None


async def test_search_and_enrich_captures_overview():
    def handler(request: httpx.Request) -> httpx.Response:
        url = str(request.url)
        if "/search/movie" in url:
            return httpx.Response(200, json={"results": [{"id": 42}]})
        if "/credits" in url:
            return httpx.Response(200, json={})
        if "/movie/42" in url:
            return httpx.Response(
                200,
                json={
                    "runtime": 120,
                    "release_date": "2021-03-04",
                    "genres": [{"id": 28, "name": "Action"}],
                    "production_countries": [{"iso_3166_1": "US", "name": "United States"}],
                    "overview": "A test synopsis.",
                },
            )
        return httpx.Response(404)

    async with _client(handler) as client:
        result = await search_and_enrich("Some Film", 2021, client=client)

    assert result is not None
    assert result.overview == "A test synopsis."


async def test_search_and_enrich_missing_overview_is_none():
    def handler(request: httpx.Request) -> httpx.Response:
        url = str(request.url)
        if "/search/movie" in url:
            return httpx.Response(200, json={"results": [{"id": 42}]})
        if "/credits" in url:
            return httpx.Response(200, json={})
        if "/movie/42" in url:
            return httpx.Response(200, json={"genres": []})
        return httpx.Response(404)

    async with _client(handler) as client:
        result = await search_and_enrich("Some Film", 2021, client=client)

    assert result is not None
    assert result.overview is None


async def test_search_and_enrich_captures_director():
    def handler(request: httpx.Request) -> httpx.Response:
        url = str(request.url)
        if "/search/movie" in url:
            return httpx.Response(200, json={"results": [{"id": 42}]})
        if "/credits" in url:
            return httpx.Response(
                200,
                json={
                    "crew": [
                        {"job": "Producer", "name": "Someone Else"},
                        {"job": "Director", "name": "A Director"},
                    ]
                },
            )
        if "/movie/42" in url:
            return httpx.Response(200, json={"genres": []})
        return httpx.Response(404)

    async with _client(handler) as client:
        result = await search_and_enrich("Some Film", 2021, client=client)

    assert result is not None
    assert result.director == "A Director"


async def test_search_and_enrich_missing_director_is_none():
    def handler(request: httpx.Request) -> httpx.Response:
        url = str(request.url)
        if "/search/movie" in url:
            return httpx.Response(200, json={"results": [{"id": 42}]})
        if "/credits" in url:
            return httpx.Response(200, json={"crew": [{"job": "Producer"}]})
        if "/movie/42" in url:
            return httpx.Response(200, json={"genres": []})
        return httpx.Response(404)

    async with _client(handler) as client:
        result = await search_and_enrich("Some Film", 2021, client=client)

    assert result is not None
    assert result.director is None


async def test_search_and_enrich_credits_have_no_language_param():
    """The `/credits` call must not carry `language` — TMDB falls back to a
    person's `original_name` (native script) when no translation exists for
    the requested locale, which happens far more often for `fr-FR` than the
    default `en-US` (CIN-104 follow-up: a Japanese director rendered in
    kanji on Result because the old single `language=fr-FR` call covered
    credits too)."""
    captured: dict[str, str | None] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        url = str(request.url)
        if "/search/movie" in url:
            return httpx.Response(200, json={"results": [{"id": 42}]})
        if "/credits" in url:
            captured["credits_language"] = request.url.params.get("language")
            return httpx.Response(200, json={})
        if "/movie/42" in url:
            captured["details_language"] = request.url.params.get("language")
            return httpx.Response(200, json={"genres": []})
        return httpx.Response(404)

    async with _client(handler) as client:
        result = await search_and_enrich("Some Film", 2021, client=client)

    assert result is not None
    assert captured["details_language"] == "fr-FR"
    assert captured["credits_language"] is None


async def test_search_and_enrich_captures_cast_up_to_five_in_billing_order():
    def handler(request: httpx.Request) -> httpx.Response:
        url = str(request.url)
        if "/search/movie" in url:
            return httpx.Response(200, json={"results": [{"id": 42}]})
        if "/credits" in url:
            return httpx.Response(
                200,
                json={
                    "cast": [
                        {"order": 2, "name": "Third Billed"},
                        {"order": 0, "name": "Lead"},
                        {"order": 1, "name": "Second Billed"},
                        {"order": 3, "name": "Fourth Billed"},
                        {"order": 4, "name": "Fifth Billed"},
                        {"order": 5, "name": "Sixth Billed"},
                    ]
                },
            )
        if "/movie/42" in url:
            return httpx.Response(200, json={"genres": []})
        return httpx.Response(404)

    async with _client(handler) as client:
        result = await search_and_enrich("Some Film", 2021, client=client)

    assert result is not None
    assert result.actors == [
        "Lead",
        "Second Billed",
        "Third Billed",
        "Fourth Billed",
        "Fifth Billed",
    ]


async def test_search_and_enrich_missing_cast_is_empty():
    def handler(request: httpx.Request) -> httpx.Response:
        url = str(request.url)
        if "/search/movie" in url:
            return httpx.Response(200, json={"results": [{"id": 42}]})
        if "/credits" in url:
            return httpx.Response(200, json={"crew": []})
        if "/movie/42" in url:
            return httpx.Response(200, json={"genres": []})
        return httpx.Response(404)

    async with _client(handler) as client:
        result = await search_and_enrich("Some Film", 2021, client=client)

    assert result is not None
    assert result.actors == []


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
