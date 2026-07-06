"""TMDB enrichment client — the "filtre" enrichment (CIN-46 jalon 1).

Best-effort only: any failure (no match, network error, unexpected response)
returns None rather than raising. Enrichment is additive on top of the
scraped watchlist, never a reason to fail the whole sync — a film with no
TMDB match simply stays with `runtime`/`genres` unset, treated as
"non filtrable" downstream (see docs/db-schema.md).
"""

import asyncio
import os

import httpx

from models import Film, FilmEnrichment

_BASE_URL = "https://api.themoviedb.org/3"
_REQUEST_TIMEOUT = 10.0


def _api_key() -> str:
    return os.environ.get("TMDB_API_KEY", "")


def _parse_year(release_date: str | None) -> int | None:
    if not release_date or len(release_date) < 4:
        return None
    try:
        return int(release_date[:4])
    except ValueError:
        return None


async def _search_movie_id(
    client: httpx.AsyncClient, title: str, year: int | None
) -> int | None:
    params: dict[str, str] = {"api_key": _api_key(), "query": title}
    if year is not None:
        params["year"] = str(year)
    response = await client.get(f"{_BASE_URL}/search/movie", params=params)
    if response.status_code != 200:
        return None
    results = response.json().get("results", [])
    if not results:
        return None
    return results[0]["id"]


async def _fetch_details(client: httpx.AsyncClient, tmdb_id: int) -> FilmEnrichment | None:
    response = await client.get(f"{_BASE_URL}/movie/{tmdb_id}", params={"api_key": _api_key()})
    if response.status_code != 200:
        return None
    data = response.json()
    return FilmEnrichment(
        tmdb_id=tmdb_id,
        genres=[g["id"] for g in data.get("genres", [])],
        runtime=data.get("runtime"),
        year=_parse_year(data.get("release_date")),
        origin_country=[c["iso_3166_1"] for c in data.get("production_countries", [])],
    )


async def search_and_enrich(
    title: str, year: int | None, *, client: httpx.AsyncClient | None = None
) -> FilmEnrichment | None:
    """Best-effort TMDB lookup: search by title/year, then fetch details.

    Returns None on no match, network error, or unexpected response — never
    raises. Pass `client` to reuse a shared AsyncClient (e.g. from
    `enrich_many`); otherwise a short-lived one is created and closed.
    """
    owns_client = client is None
    if client is None:
        client = httpx.AsyncClient(timeout=_REQUEST_TIMEOUT)
    try:
        try:
            tmdb_id = await _search_movie_id(client, title, year)
            if tmdb_id is None:
                return None
            return await _fetch_details(client, tmdb_id)
        except httpx.HTTPError:
            return None
    finally:
        if owns_client:
            await client.aclose()


async def enrich_many(
    films: list[Film], *, concurrency: int = 5
) -> dict[str, FilmEnrichment | None]:
    """Enrich a batch of scraped films, bounded by `concurrency` in-flight calls.

    Returns a `{film.slug: FilmEnrichment | None}` map covering every film
    passed in — `None` entries mean that film stays unenriched.
    """
    semaphore = asyncio.Semaphore(concurrency)

    async def _one(client: httpx.AsyncClient, film: Film) -> tuple[str, FilmEnrichment | None]:
        async with semaphore:
            return film.slug, await search_and_enrich(film.title, film.year, client=client)

    async with httpx.AsyncClient(timeout=_REQUEST_TIMEOUT) as client:
        results = await asyncio.gather(*(_one(client, film) for film in films))
    return dict(results)
