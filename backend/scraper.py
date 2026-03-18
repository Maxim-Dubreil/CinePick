import asyncio
import re
import httpx
from bs4 import BeautifulSoup

BASE_URL = "https://letterboxd.com"
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) "
        "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
    )
}
PAGE_SIZE = 28
MAX_PAGES = 20

# Matches "Some Title (2023)" or "Some Title" (no year)
_TITLE_YEAR_RE = re.compile(r"^(.+?)\s*\((\d{4})\)$")


class ScraperError(Exception):
    def __init__(self, kind: str, message: str):
        super().__init__(message)
        self.kind = kind  # 'not_found' | 'private' | 'network'


async def scrape_watchlist(username: str) -> list[dict]:
    """
    Scrape the Letterboxd watchlist for a given username.
    Returns a list of dicts with keys: title, year, slug.
    Raises ScraperError on known failure modes.

    Letterboxd now renders films as:
      <div class="react-component"
           data-component-class="LazyPoster"
           data-item-name="Pixote (1980)"
           data-item-slug="pixote"
           data-film-id="22918" ...>
    """
    films: list[dict] = []

    async with httpx.AsyncClient(headers=HEADERS, follow_redirects=True, timeout=15) as client:
        for page in range(1, MAX_PAGES + 1):
            url = f"{BASE_URL}/{username}/watchlist/page/{page}/"

            try:
                response = await client.get(url)
            except httpx.RequestError as exc:
                raise ScraperError("network", f"Network error while fetching {url}: {exc}") from exc

            if response.status_code == 404:
                if page == 1:
                    raise ScraperError("not_found", f"User '{username}' not found on Letterboxd.")
                break

            if response.status_code != 200:
                raise ScraperError("network", f"Unexpected status {response.status_code} for {url}")

            soup = BeautifulSoup(response.text, "html.parser")

            # Detect private profile
            if page == 1:
                body_text = soup.get_text()
                if "private" in body_text.lower() or "not public" in body_text.lower():
                    empty = soup.find("section", class_="watchlist-empty")
                    if empty:
                        raise ScraperError("private", f"Watchlist for '{username}' is private.")

            # New Letterboxd structure: react-component LazyPoster divs
            items = soup.select(
                'div.react-component[data-component-class="LazyPoster"]'
            )

            if not items:
                break  # No films on this page — end of watchlist

            for item in items:
                raw_name = item.get("data-item-name", "").strip()
                slug = item.get("data-item-slug", "").strip()

                # Parse "Title (Year)" → title, year
                match = _TITLE_YEAR_RE.match(raw_name)
                if match:
                    title = match.group(1).strip()
                    year = match.group(2)
                else:
                    title = raw_name
                    year = ""

                if title:
                    films.append({"title": title, "year": year, "slug": slug})

            if len(items) < PAGE_SIZE:
                break

            await asyncio.sleep(0.5)

    if not films:
        raise ScraperError(
            "not_found",
            f"No films found in watchlist for '{username}'. It may be empty or private.",
        )

    return films
