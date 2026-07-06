"""Pydantic models for Letterboxd scraping."""

from pydantic import BaseModel, Field


class Film(BaseModel):
    """A single film entry scraped from a Letterboxd watchlist page.

    Metadata is intentionally lean: only what the watchlist HTML exposes.
    Richer fields (TMDB id, genres, runtime) are filled later by the
    enrichment layer, not here.
    """

    slug: str
    """Letterboxd slug, the natural key (e.g. ``"carolina-caroline"``)."""

    title: str
    """Display title without the trailing year (e.g. ``"Carolina Caroline"``)."""

    year: int | None = None
    """Release year when present in the page, otherwise ``None``."""

    poster_url: str | None = None
    """Absolute URL of the Letterboxd poster resolver, when available."""


class WatchlistPage(BaseModel):
    """One paginated page of a watchlist: its films plus the watchlist total.

    ``total_count`` is the whole-watchlist size read from the page header, not
    the number of films on this page.
    """

    films: list[Film]
    total_count: int


class FilmEnrichment(BaseModel):
    """TMDB metadata for a single film — the "filtre" enrichment (CIN-46).

    Best-effort: produced only when a TMDB search+details lookup succeeds.
    Absence (`None` upstream) means the film stays unenriched, not that the
    film doesn't exist.
    """

    tmdb_id: int
    genres: list[int]
    """TMDB genre ids — never localized names (see docs/db-schema.md)."""

    runtime: int | None
    year: int | None
    """From TMDB `release_date`; may differ slightly from the Letterboxd year."""

    origin_country: list[str]
    """ISO 3166-1 country codes from `production_countries` — never `original_language`."""


class EnrichedFilm(BaseModel):
    """A scraped film merged with its (optional) TMDB enrichment.

    Ready to upsert into `films` as-is via `.model_dump()`. `genres`/
    `origin_country` stay empty and `runtime`/`tmdb_id` stay `None` when
    enrichment failed or found no match — treated as "non filtrable" by the
    duration filter downstream, never excluded outright.
    """

    letterboxd_slug: str
    title: str
    year: int | None
    poster_url: str | None
    tmdb_id: int | None = None
    genres: list[str] = Field(default_factory=list)
    runtime: int | None = None
    origin_country: list[str] = Field(default_factory=list)
