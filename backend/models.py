"""Pydantic models for Letterboxd scraping."""

from pydantic import BaseModel


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
