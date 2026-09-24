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
_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500"
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


def _parse_director(credits: dict) -> str | None:
    for member in credits.get("crew", []):
        if member.get("job") == "Director":
            return member.get("name")
    return None


def _parse_cast(credits: dict) -> list[str]:
    """Up to 5 main cast names, TMDB billing order (`cast[].order`, already
    ascending in the API response — sorted explicitly here rather than
    relying on that)."""
    cast = sorted(credits.get("cast", []), key=lambda member: member["order"])
    return [member["name"] for member in cast[:5]]


def _details_request(client: httpx.AsyncClient, tmdb_id: int):
    return client.get(
        f"{_BASE_URL}/movie/{tmdb_id}",
        params={"api_key": _api_key(), "language": "fr-FR"},
    )


def _credits_request(client: httpx.AsyncClient, tmdb_id: int):
    """Cast/crew, fetched with no `language` param (TMDB defaults to
    en-US) — deliberately separate from the details call's `language=fr-FR`.
    TMDB falls back to a person's `original_name` (native script) when no
    name translation exists for the requested locale, and that happens far
    more often for `fr-FR` than `en-US` (e.g. many Japanese crew have no
    French "known as" entry but do have an English/romanized one) — so
    credits stay in Latin script even though the rest of the film's metadata
    is fetched in French."""
    return client.get(
        f"{_BASE_URL}/movie/{tmdb_id}/credits",
        params={"api_key": _api_key()},
    )


async def _fetch_details(client: httpx.AsyncClient, tmdb_id: int) -> FilmEnrichment | None:
    # Run both requests concurrently — they're independent (credits doesn't
    # need anything from the details response) — rather than adding a full
    # extra sequential round trip per film on top of the search call that
    # already precedes this.
    details_response, credits_response = await asyncio.gather(
        _details_request(client, tmdb_id), _credits_request(client, tmdb_id)
    )
    if details_response.status_code != 200:
        return None
    data = details_response.json()
    credits = credits_response.json() if credits_response.status_code == 200 else {}
    poster_path = data.get("poster_path")
    return FilmEnrichment(
        tmdb_id=tmdb_id,
        genres=[g["id"] for g in data.get("genres", [])],
        runtime=data.get("runtime"),
        year=_parse_year(data.get("release_date")),
        origin_country=[c["iso_3166_1"] for c in data.get("production_countries", [])],
        overview=data.get("overview") or None,
        poster_url=_IMAGE_BASE_URL + poster_path if poster_path else None,
        director=_parse_director(credits),
        actors=_parse_cast(credits),
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
        except Exception:
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
