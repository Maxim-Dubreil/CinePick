"""Watchlist storage: films cache + per-user watchlist links (CIN-47/CIN-46).

`films` is a shared cache (one row per film regardless of how many users have
it in their watchlist) — upserting here never touches other users' links.
`user_watchlist_items` uses a soft delete (`removed_at`): a film leaving a
user's watchlist gets timestamped, never deleted, so history survives a
resync.
"""

from datetime import UTC, datetime
from typing import TypedDict

from models import EnrichedFilm, Film, FilmEnrichment
from supabase_client import supabase


class FilmRow(TypedDict):
    """Response row from films table upsert."""

    letterboxd_slug: str
    id: str


class WatchlistRow(TypedDict):
    """Response row from user_watchlist_items table select."""

    film_id: str
    removed_at: str | None

_FILMS_TABLE = "films"
_WATCHLIST_TABLE = "user_watchlist_items"


def merge_enrichment(film: Film, enrichment: FilmEnrichment | None) -> EnrichedFilm:
    """Combine a scraped film with its optional TMDB enrichment for storage."""
    if enrichment is None:
        return EnrichedFilm(
            letterboxd_slug=film.slug,
            title=film.title,
            year=film.year,
            poster_url=film.poster_url,
        )
    return EnrichedFilm(
        letterboxd_slug=film.slug,
        title=film.title,
        year=enrichment.year if enrichment.year is not None else film.year,
        poster_url=film.poster_url,
        tmdb_id=enrichment.tmdb_id,
        genres=[str(genre_id) for genre_id in enrichment.genres],
        runtime=enrichment.runtime,
        origin_country=enrichment.origin_country,
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
        record = film.model_dump(exclude={"tmdb_id", "genres", "runtime", "origin_country"})
        if film.tmdb_id is not None:
            record["tmdb_id"] = film.tmdb_id
            record["genres"] = film.genres
            record["runtime"] = film.runtime
            record["origin_country"] = film.origin_country
        records.append(record)
    response = (
        supabase.table(_FILMS_TABLE).upsert(records, on_conflict="letterboxd_slug").execute()
    )
    data: list[FilmRow] = response.data  # type: ignore[assignment]
    return {row["letterboxd_slug"]: row["id"] for row in data}


def sync_user_watchlist(user_id: str, active_film_ids: set[str]) -> None:
    """Reconcile a user's watchlist with the freshly scraped set of film ids.

    Films newly present are inserted; films no longer present are soft-deleted
    (`removed_at` set); films that reappear have `removed_at` cleared. Rows
    unchanged between syncs are left untouched.
    """
    now = datetime.now(UTC).isoformat()

    existing = supabase.table(_WATCHLIST_TABLE).select("film_id, removed_at").eq(
        "user_id", user_id
    ).execute()
    existing_data: list[WatchlistRow] = existing.data  # type: ignore[assignment]
    existing_active = {row["film_id"] for row in existing_data if row["removed_at"] is None}
    existing_removed = {row["film_id"] for row in existing_data if row["removed_at"] is not None}

    new_film_ids = active_film_ids - existing_active - existing_removed
    if new_film_ids:
        supabase.table(_WATCHLIST_TABLE).insert(
            [{"user_id": user_id, "film_id": fid, "added_at": now} for fid in new_film_ids]
        ).execute()

    removed_film_ids = existing_active - active_film_ids
    if removed_film_ids:
        supabase.table(_WATCHLIST_TABLE).update({"removed_at": now}).eq(
            "user_id", user_id
        ).in_("film_id", list(removed_film_ids)).execute()

    reappeared_film_ids = existing_removed & active_film_ids
    if reappeared_film_ids:
        supabase.table(_WATCHLIST_TABLE).update({"removed_at": None}).eq(
            "user_id", user_id
        ).in_("film_id", list(reappeared_film_ids)).execute()
