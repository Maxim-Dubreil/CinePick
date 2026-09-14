"""Tests for the Letterboxd scraping socle (CIN-67).

`parse_watchlist_page` is tested against a frozen real fixture (a verbatim
slice of a populated public watchlist). `get_watchlist_count` is tested with
`httpx.MockTransport` so no network is hit.
"""

from pathlib import Path

import httpx
import pytest

from scraper import (
    ProfileNotFoundError,
    WatchlistPrivateError,
    WatchlistScrapeError,
    get_full_watchlist,
    get_watchlist_count,
    parse_watchlist_page,
)

FIXTURES = Path(__file__).parent / "fixtures"


def _load(name: str) -> str:
    return (FIXTURES / name).read_text(encoding="utf-8")


def _client(handler) -> httpx.AsyncClient:
    """An AsyncClient whose requests are served by `handler`, no network."""
    return httpx.AsyncClient(transport=httpx.MockTransport(handler))


# --- parse_watchlist_page --------------------------------------------------


def test_parse_returns_all_films():
    films = parse_watchlist_page(_load("watchlist_populated.html"))
    assert len(films) == 28


def test_parse_first_film_fields():
    films = parse_watchlist_page(_load("watchlist_populated.html"))
    first = films[0]
    assert first.slug == "carolina-caroline"
    assert first.title == "Carolina Caroline"
    assert first.year == 2025
    assert first.poster_url == "https://letterboxd.com/film/carolina-caroline/image-150/"


def test_parse_film_without_year_has_none():
    films = parse_watchlist_page(_load("watchlist_populated.html"))
    ray_gunn = next(f for f in films if f.slug == "ray-gunn")
    assert ray_gunn.title == "Ray Gunn"
    assert ray_gunn.year is None


# --- get_watchlist_count ---------------------------------------------------


async def test_count_nominal():
    html = _load("watchlist_populated.html")

    def handler(request: httpx.Request) -> httpx.Response:
        assert "dave/watchlist" in str(request.url)
        return httpx.Response(200, text=html)

    async with _client(handler) as client:
        assert await get_watchlist_count("dave", client=client) == 602


async def test_count_profile_not_found():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(404, text="Not found")

    async with _client(handler) as client:
        with pytest.raises(ProfileNotFoundError):
            await get_watchlist_count("ghost", client=client)


async def test_count_private_watchlist():
    # Letterboxd returns HTTP 403 for locked accounts (confirmed on real account).
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(403, text=_load("watchlist_private.html"))

    async with _client(handler) as client:
        with pytest.raises(WatchlistPrivateError):
            await get_watchlist_count("secretive", client=client)


async def test_count_network_error():
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectTimeout("timed out")

    async with _client(handler) as client:
        with pytest.raises(WatchlistScrapeError):
            await get_watchlist_count("dave", client=client)


# --- get_full_watchlist -----------------------------------------------------


def _page_html(slugs: list[str], total: int) -> str:
    cells = "".join(
        f'<div class="react-component" data-component-class="LazyPoster" '
        f'data-item-slug="{slug}" data-item-name="{slug.title()} (2020)" '
        f'data-poster-url="/film/{slug}/image-150/"></div>'
        for slug in slugs
    )
    return f'<div class="js-watchlist-content" data-num-entries="{total}">{cells}</div>'


async def test_get_full_watchlist_single_page_no_extra_fetch():
    html = _page_html(["film-a", "film-b", "film-c"], total=3)
    call_count = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal call_count
        call_count += 1
        return httpx.Response(200, text=html)

    async with _client(handler) as client:
        films = await get_full_watchlist("dave", client=client)

    assert [f.slug for f in films] == ["film-a", "film-b", "film-c"]
    assert call_count == 1


async def test_get_full_watchlist_paginates_across_pages():
    page1 = _page_html(["film-a", "film-b", "film-c"], total=7)
    page2 = _page_html(["film-d", "film-e", "film-f"], total=7)
    page3 = _page_html(["film-g"], total=7)

    def handler(request: httpx.Request) -> httpx.Response:
        url = str(request.url)
        if "/page/2/" in url:
            return httpx.Response(200, text=page2)
        if "/page/3/" in url:
            return httpx.Response(200, text=page3)
        return httpx.Response(200, text=page1)

    async with _client(handler) as client:
        films = await get_full_watchlist("dave", client=client)

    assert [f.slug for f in films] == [
        "film-a",
        "film-b",
        "film-c",
        "film-d",
        "film-e",
        "film-f",
        "film-g",
    ]


async def test_get_full_watchlist_empty_watchlist():
    html = _page_html([], total=0)

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, text=html)

    async with _client(handler) as client:
        films = await get_full_watchlist("dave", client=client)

    assert films == []


async def test_get_full_watchlist_aborts_on_page_failure():
    page1 = _page_html(["film-a", "film-b", "film-c"], total=7)

    def handler(request: httpx.Request) -> httpx.Response:
        url = str(request.url)
        if "/page/2/" in url:
            raise httpx.ConnectTimeout("timed out")
        return httpx.Response(200, text=page1)

    async with _client(handler) as client:
        with pytest.raises(WatchlistScrapeError):
            await get_full_watchlist("dave", client=client)


async def test_get_full_watchlist_aborts_on_multiple_page_failures():
    """Verify typed exception is raised when multiple pages fail simultaneously.

    With _PAGE_CONCURRENCY=5, multiple concurrent pages can fail around the same
    time (e.g., network drops mid-sync). The except* should handle ExceptionGroup
    with 2+ typed exceptions and re-raise the first as a typed exception, not
    the raw ExceptionGroup itself.
    """
    page1 = _page_html(["film-a", "film-b", "film-c"], total=10)

    def handler(request: httpx.Request) -> httpx.Response:
        url = str(request.url)
        # Pages 2 and 3 both fail: simulates concurrent failures under semaphore
        if "/page/2/" in url or "/page/3/" in url:
            raise httpx.ConnectTimeout("network dropped")
        return httpx.Response(200, text=page1)

    async with _client(handler) as client:
        with pytest.raises(WatchlistScrapeError):
            await get_full_watchlist("dave", client=client)
