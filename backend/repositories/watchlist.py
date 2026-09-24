"""Watchlist storage: films cache + per-user watchlist links (CIN-47/CIN-46).

`films` is a shared cache (one row per film regardless of how many users have
it in their watchlist) — upserting here never touches other users' links.
`user_watchlist_items` uses a soft delete (`removed_at`): a film leaving a
user's watchlist gets timestamped, never deleted, so history survives a
resync.
"""

from datetime import datetime
from typing import TypedDict

from models import EnrichedFilm, Film, FilmEnrichment, WatchlistFilm
from supabase_client import supabase


class FilmRow(TypedDict):
    """Response row from films table upsert."""

    letterboxd_slug: str
    id: str


_FILMS_TABLE = "films"
_WATCHLIST_TABLE = "user_watchlist_items"

_ENRICHMENT_FIELDS = (
    "tmdb_id",
    "genres",
    "runtime",
    "origin_country",
    "overview",
    "director",
    "actors",
)
"""TMDB-derived columns on `films`, refreshed together — omitted entirely
from the upsert record when a film has no enrichment (see `upsert_films`)."""


def merge_enrichment(film: Film, enrichment: FilmEnrichment | None) -> EnrichedFilm:
    """Combine a scraped film with its optional TMDB enrichment for storage.

    `poster_url` always comes from TMDB's CDN, never from the scraped
    `film.poster_url` — that one is a Letterboxd resolver endpoint, not an
    image, and is never directly displayable (CIN-81).
    """
    if enrichment is None:
        return EnrichedFilm(
            letterboxd_slug=film.slug,
            title=film.title,
            year=film.year,
            poster_url=None,
        )
    return EnrichedFilm(
        letterboxd_slug=film.slug,
        title=film.title,
        year=enrichment.year if enrichment.year is not None else film.year,
        poster_url=enrichment.poster_url,
        tmdb_id=enrichment.tmdb_id,
        genres=[str(genre_id) for genre_id in enrichment.genres],
        runtime=enrichment.runtime,
        origin_country=enrichment.origin_country,
        overview=enrichment.overview,
        director=enrichment.director,
        actors=enrichment.actors,
    )


def upsert_films(films: list[EnrichedFilm]) -> dict[str, str]:
    """Upsert films into the shared cache, keyed by `letterboxd_slug`.

    Returns a `{letterboxd_slug: film_id}` map for every film passed in.
    Refreshes enrichment fields on every call when enrichment succeeded —
    but when a film has no enrichment (`tmdb_id is None`), the TMDB-derived
    columns are omitted from its record entirely, so a resync during a TMDB
    outage never overwrites another sync's previously-good enrichment in this
    shared cache.
    """
    if not films:
        return {}
    records = []
    for film in films:
        record = film.model_dump(exclude=set(_ENRICHMENT_FIELDS))
        if film.tmdb_id is not None:
            for field in _ENRICHMENT_FIELDS:
                record[field] = getattr(film, field)
        records.append(record)
    response = (
        supabase.table(_FILMS_TABLE).upsert(records, on_conflict="letterboxd_slug").execute()
    )
    data: list[FilmRow] = response.data  # type: ignore[assignment]
    return {row["letterboxd_slug"]: row["id"] for row in data}


def sync_user_watchlist(user_id: str, active_film_ids: set[str]) -> None:
    """Reconcile a user's watchlist with the freshly scraped set of film ids.

    Delegates to the `sync_user_watchlist` SQL function (deactivate-then-upsert
    in one transaction, see `supabase/migrations/`), grantable only to the
    service role this client authenticates as.
    """
    supabase.rpc(
        "sync_user_watchlist",
        {
            "p_user_id": user_id,
            "p_active_film_ids": sorted(active_film_ids),
        },
    ).execute()


class WatchlistItemRow(TypedDict):
    """One row of a `user_watchlist_items` select joined against `films`."""

    added_at: str
    films: dict


def get_active_watchlist(user_id: str) -> list[WatchlistFilm]:
    """Read a user's currently active watchlist (soft-deleted rows excluded)."""
    response = (
        supabase.table(_WATCHLIST_TABLE)
        .select("added_at, films(*)")
        .eq("user_id", user_id)
        .is_("removed_at", "null")
        .execute()
    )
    rows: list[WatchlistItemRow] = response.data  # type: ignore[assignment]
    return [
        WatchlistFilm(
            **row["films"],
            added_at=datetime.fromisoformat(row["added_at"]),
        )
        for row in rows
    ]
