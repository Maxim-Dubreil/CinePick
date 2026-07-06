"""Letterboxd watchlist scraping socle (CIN-67).

Letterboxd has no public API, so we scrape the public HTML pages server-side
(the front-end is blocked by CORS). A populated public watchlist renders its
film grid and total inline, so a plain ``httpx`` GET + ``selectolax`` parse is
enough — no headless browser needed.

HTML selectors are fragile, so they live isolated here as constants and are
covered by tests against a frozen real fixture.
"""

import asyncio
import re

import httpx
from selectolax.parser import HTMLParser

from models import Film

_LETTERBOXD_BASE = "https://letterboxd.com"
_WATCHLIST_URL = _LETTERBOXD_BASE + "/{username}/watchlist/"

# A browser-like UA: Letterboxd serves a degraded page to obvious bots.
_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 CinePick/0.1"
)
_REQUEST_TIMEOUT = 10.0
_WATCHLIST_PAGE_URL = _LETTERBOXD_BASE + "/{username}/watchlist/page/{page}/"
_PAGE_CONCURRENCY = 5

# --- isolated selectors (the fragile part) ---------------------------------

# Container holding the watchlist; its data-num-entries attribute is the total.
_WATCHLIST_CONTENT = "div.js-watchlist-content"
_NUM_ENTRIES_ATTR = "data-num-entries"
# One film cell in the React poster grid.
_POSTER_SELECTOR = 'div.react-component[data-component-class="LazyPoster"]'
_SLUG_ATTR = "data-item-slug"
_NAME_ATTR = "data-item-name"  # "Title (YYYY)" or just "Title"
_POSTER_URL_ATTR = "data-poster-url"

_TITLE_YEAR_RE = re.compile(r"^(?P<title>.*) \((?P<year>\d{4})\)$")


# --- typed errors ----------------------------------------------------------


class ScraperError(Exception):
    """Base class for all scraping failures."""


class ProfileNotFoundError(ScraperError):
    """The Letterboxd username does not exist (HTTP 404)."""


class WatchlistPrivateError(ScraperError):
    """The profile exists but its watchlist is not publicly readable."""


class WatchlistScrapeError(ScraperError):
    """Network/timeout/unexpected upstream failure while scraping."""


# --- parsing (pure) --------------------------------------------------------


def _split_title_year(name: str) -> tuple[str, int | None]:
    """Split a Letterboxd display name into title and optional release year."""
    match = _TITLE_YEAR_RE.match(name)
    if match:
        return match.group("title"), int(match.group("year"))
    return name, None


def parse_watchlist_page(html: str) -> list[Film]:
    """Extract the films of a single watchlist page from its HTML.

    Pure function: takes raw HTML, returns the films found on that page in
    document order. Cells missing a slug or name are skipped rather than
    raising, since a single malformed cell should not drop the whole page.
    """
    tree = HTMLParser(html)
    films: list[Film] = []
    for node in tree.css(_POSTER_SELECTOR):
        slug = node.attributes.get(_SLUG_ATTR)
        name = node.attributes.get(_NAME_ATTR)
        if not slug or not name:
            continue
        title, year = _split_title_year(name)
        poster_path = node.attributes.get(_POSTER_URL_ATTR)
        poster_url = _LETTERBOXD_BASE + poster_path if poster_path else None
        films.append(Film(slug=slug, title=title, year=year, poster_url=poster_url))
    return films


def _extract_count(html: str) -> int | None:
    """Read the watchlist total from the page header, or None if absent.

    Returns None when the watchlist container is missing (private watchlist).
    A public-but-empty watchlist still has the container with a 0, so 0 is a
    valid count, distinct from None.
    """
    container = HTMLParser(html).css_first(_WATCHLIST_CONTENT)
    if container is None:
        return None
    raw = container.attributes.get(_NUM_ENTRIES_ATTR)
    if raw is None or not raw.isdigit():
        return None
    return int(raw)


# --- fetching --------------------------------------------------------------


async def _get(client: httpx.AsyncClient, url: str) -> httpx.Response:
    """GET `url`, mapping transport/status errors to the typed exceptions above."""
    try:
        response = await client.get(url)
    except httpx.HTTPError as exc:
        raise WatchlistScrapeError(f"request to {url} failed: {exc}") from exc
    if response.status_code == 404:
        raise ProfileNotFoundError(url)
    if response.status_code == 403:
        raise WatchlistPrivateError(url)
    if response.status_code >= 400:
        raise WatchlistScrapeError(f"unexpected status {response.status_code} for {url}")
    return response


async def get_watchlist_count(username: str, *, client: httpx.AsyncClient | None = None) -> int:
    """Return the total number of films in a user's public watchlist.

    Reads the total from the page header without paginating the whole list.
    Pass `client` to reuse a shared AsyncClient (e.g. from the request handler);
    otherwise a short-lived one is created and closed.

    Raises:
        ProfileNotFoundError: the username does not exist (404).
        WatchlistPrivateError: the profile exists but the watchlist is hidden.
        WatchlistScrapeError: network, timeout, or unexpected upstream error.
    """
    url = _WATCHLIST_URL.format(username=username)
    owns_client = client is None
    if client is None:
        client = httpx.AsyncClient(
            headers={"User-Agent": _USER_AGENT},
            follow_redirects=True,
            timeout=_REQUEST_TIMEOUT,
        )
    try:
        response = await _get(client, url)
        count = _extract_count(response.text)
        if count is None:
            raise WatchlistPrivateError(username)
        return count
    finally:
        if owns_client:
            await client.aclose()


async def get_full_watchlist(
    username: str, *, client: httpx.AsyncClient | None = None
) -> list[Film]:
    """Return every film in a user's public watchlist, across all pages.

    Fetches page 1 first to learn the total count and the real page size,
    then fetches the remaining pages concurrently (bounded by
    `_PAGE_CONCURRENCY`). Any page failing to load aborts the whole call —
    a partial watchlist is never returned silently, since callers replace
    the user's stored watchlist wholesale.

    Raises the same typed errors as `get_watchlist_count`.
    """
    owns_client = client is None
    if client is None:
        client = httpx.AsyncClient(
            headers={"User-Agent": _USER_AGENT},
            follow_redirects=True,
            timeout=_REQUEST_TIMEOUT,
        )
    try:
        first_url = _WATCHLIST_URL.format(username=username)
        first_response = await _get(client, first_url)
        first_films = parse_watchlist_page(first_response.text)
        total = _extract_count(first_response.text)
        if total is None:
            raise WatchlistPrivateError(username)
        if not first_films or total <= len(first_films):
            return first_films

        page_size = len(first_films)
        total_pages = -(-total // page_size)  # ceil division
        semaphore = asyncio.Semaphore(_PAGE_CONCURRENCY)

        async def _fetch_page(page: int) -> list[Film]:
            async with semaphore:
                url = _WATCHLIST_PAGE_URL.format(username=username, page=page)
                response = await _get(client, url)
                return parse_watchlist_page(response.text)

        pages = await asyncio.gather(*(_fetch_page(p) for p in range(2, total_pages + 1)))
        films = list(first_films)
        for page_films in pages:
            films.extend(page_films)
        return films
    finally:
        if owns_client:
            await client.aclose()
