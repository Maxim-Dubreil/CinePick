import pytest
import httpx
import respx
from scraper import scrape_watchlist, ScraperError

WATCHLIST_PAGE_HTML = """
<html><body>
<ul class="poster-list">
  <li class="poster-container">
    <div class="film-poster" data-film-slug="past-lives" data-film-release-year="2023">
      <img alt="Past Lives" />
    </div>
  </li>
  <li class="poster-container">
    <div class="film-poster" data-film-slug="the-brutalist" data-film-release-year="2024">
      <img alt="The Brutalist" />
    </div>
  </li>
</ul>
</body></html>
"""

NOT_FOUND_HTML = "<html><body><p>Sorry, we can't find the page you've requested.</p></body></html>"

PRIVATE_HTML = """
<html><body>
<section class="watchlist-empty">
  <p>This member's watchlist is not public.</p>
</section>
</body></html>
"""


@pytest.mark.asyncio
@respx.mock
async def test_scrape_returns_films():
    respx.get("https://letterboxd.com/testuser/watchlist/page/1/").mock(
        return_value=httpx.Response(200, text=WATCHLIST_PAGE_HTML)
    )
    # Page 2 returns 404 to signal end
    respx.get("https://letterboxd.com/testuser/watchlist/page/2/").mock(
        return_value=httpx.Response(404)
    )

    films = await scrape_watchlist("testuser")

    assert len(films) == 2
    assert films[0]["title"] == "Past Lives"
    assert films[0]["year"] == "2023"
    assert films[0]["slug"] == "past-lives"
    assert films[1]["title"] == "The Brutalist"


@pytest.mark.asyncio
@respx.mock
async def test_scrape_not_found():
    respx.get("https://letterboxd.com/unknownxyz/watchlist/page/1/").mock(
        return_value=httpx.Response(404)
    )

    with pytest.raises(ScraperError) as exc_info:
        await scrape_watchlist("unknownxyz")

    assert exc_info.value.kind == "not_found"


@pytest.mark.asyncio
@respx.mock
async def test_scrape_private_watchlist():
    respx.get("https://letterboxd.com/privateuser/watchlist/page/1/").mock(
        return_value=httpx.Response(200, text=PRIVATE_HTML)
    )

    with pytest.raises(ScraperError) as exc_info:
        await scrape_watchlist("privateuser")

    assert exc_info.value.kind in ("private", "not_found")


@pytest.mark.asyncio
@respx.mock
async def test_scrape_network_error():
    respx.get("https://letterboxd.com/testuser/watchlist/page/1/").mock(
        side_effect=httpx.ConnectError("connection refused")
    )

    with pytest.raises(ScraperError) as exc_info:
        await scrape_watchlist("testuser")

    assert exc_info.value.kind == "network"
