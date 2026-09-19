"""Tests for the watchlist storage repository (CIN-47/CIN-46)."""

import uuid
from unittest.mock import MagicMock

import pytest

from models import EnrichedFilm, Film, FilmEnrichment
from repositories import watchlist
from supabase_client import supabase


def _table_mock(supabase_mock, table_name: str) -> MagicMock:
    """Make `supabase_mock.table(table_name)` return a dedicated, inspectable mock."""
    table = MagicMock()
    supabase_mock.table.side_effect = lambda name, _t=table_name, _m=table: (
        _m if name == _t else MagicMock()
    )
    return table


# --- merge_enrichment --------------------------------------------------------


def test_merge_enrichment_with_data():
    film = Film(slug="film-a", title="Film A", year=2020, poster_url="http://x/p.jpg")
    enrichment = FilmEnrichment(
        tmdb_id=42, genres=[28, 12], runtime=120, year=2021, origin_country=["US"],
        overview="A test synopsis.", director="Some Director",
    )

    merged = watchlist.merge_enrichment(film, enrichment)

    assert merged.letterboxd_slug == "film-a"
    assert merged.tmdb_id == 42
    assert merged.genres == ["28", "12"]
    assert merged.runtime == 120
    assert merged.year == 2021  # TMDB year wins over the scraped year
    assert merged.origin_country == ["US"]
    assert merged.overview == "A test synopsis."
    assert merged.director == "Some Director"


def test_merge_enrichment_without_data_keeps_scraped_fields():
    film = Film(slug="film-a", title="Film A", year=2020, poster_url="http://x/p.jpg")

    merged = watchlist.merge_enrichment(film, None)

    assert merged.letterboxd_slug == "film-a"
    assert merged.title == "Film A"
    assert merged.year == 2020
    assert merged.tmdb_id is None
    assert merged.genres == []
    assert merged.runtime is None
    assert merged.origin_country == []


# --- upsert_films --------------------------------------------------------


def test_upsert_films_returns_slug_to_id_map(supabase_mock):
    table = _table_mock(supabase_mock, "films")
    table.upsert.return_value.execute.return_value = MagicMock(
        data=[
            {"letterboxd_slug": "film-a", "id": "uuid-a"},
            {"letterboxd_slug": "film-b", "id": "uuid-b"},
        ]
    )
    films = [
        EnrichedFilm(letterboxd_slug="film-a", title="Film A", year=2020, poster_url=None),
        EnrichedFilm(letterboxd_slug="film-b", title="Film B", year=2021, poster_url=None),
    ]

    result = watchlist.upsert_films(films)

    assert result == {"film-a": "uuid-a", "film-b": "uuid-b"}
    args, kwargs = table.upsert.call_args
    assert kwargs["on_conflict"] == "letterboxd_slug"
    assert args[0][0]["letterboxd_slug"] == "film-a"


def test_upsert_films_empty_list_skips_call(supabase_mock):
    table = _table_mock(supabase_mock, "films")

    assert watchlist.upsert_films([]) == {}
    table.upsert.assert_not_called()


def test_upsert_films_omits_enrichment_keys_when_unenriched(supabase_mock):
    """A film with no TMDB enrichment must not overwrite the shared cache's
    previously-good enrichment columns — those keys must be absent from the
    upsert record entirely, not just null/empty."""
    table = _table_mock(supabase_mock, "films")
    table.upsert.return_value.execute.return_value = MagicMock(
        data=[
            {"letterboxd_slug": "film-a", "id": "uuid-a"},
            {"letterboxd_slug": "film-b", "id": "uuid-b"},
        ]
    )
    films = [
        EnrichedFilm(letterboxd_slug="film-a", title="Film A", year=2020, poster_url=None),
        EnrichedFilm(
            letterboxd_slug="film-b",
            title="Film B",
            year=2021,
            poster_url=None,
            tmdb_id=42,
            genres=["28"],
            runtime=120,
            origin_country=["US"],
            overview="A test synopsis.",
            director="Some Director",
        ),
    ]

    watchlist.upsert_films(films)

    records = table.upsert.call_args[0][0]
    unenriched_record = next(r for r in records if r["letterboxd_slug"] == "film-a")
    enriched_record = next(r for r in records if r["letterboxd_slug"] == "film-b")

    for key in ("tmdb_id", "genres", "runtime", "origin_country", "director"):
        assert key not in unenriched_record

    assert "overview" not in unenriched_record
    assert enriched_record["tmdb_id"] == 42
    assert enriched_record["genres"] == ["28"]
    assert enriched_record["runtime"] == 120
    assert enriched_record["origin_country"] == ["US"]
    assert enriched_record["overview"] == "A test synopsis."
    assert enriched_record["director"] == "Some Director"


@pytest.mark.integration
def test_upsert_films_mixed_batch_against_real_db(require_integration):
    """Regression test for a real bug the mocked tests above cannot catch:

    PostgREST's bulk upsert treats a key missing from one row (but present on
    another row in the same batch) as an explicit NULL for that row, not as
    "use the column default". `films.origin_country` used to be NOT NULL, so
    a batch mixing an enriched film (has `origin_country`) with an unenriched
    one (omits it, per `upsert_films`'s cache-preservation logic) crashed with
    a real `postgrest.exceptions.APIError` — invisible to the mocked tests
    above since `MagicMock` doesn't enforce DB constraints. Fixed by making
    `origin_country` nullable (see `films_origin_country_nullable` migration).
    """
    slug_prefix = f"__test-{uuid.uuid4().hex[:8]}__"
    films = [
        EnrichedFilm(
            letterboxd_slug=f"{slug_prefix}-enriched",
            title="Test Enriched",
            year=2020,
            poster_url=None,
            tmdb_id=1,
            genres=["28"],
            runtime=100,
            origin_country=["US"],
        ),
        EnrichedFilm(
            letterboxd_slug=f"{slug_prefix}-unenriched",
            title="Test Unenriched",
            year=2021,
            poster_url=None,
        ),
    ]

    try:
        result = watchlist.upsert_films(films)
        assert set(result.keys()) == {
            f"{slug_prefix}-enriched",
            f"{slug_prefix}-unenriched",
        }
    finally:
        supabase.table("films").delete().like("letterboxd_slug", f"{slug_prefix}%").execute()


# --- sync_user_watchlist --------------------------------------------------


def test_sync_user_watchlist_deactivates_all_then_reactivates_current_set(supabase_mock):
    """Reconciliation never lists ids in a filter: it blanket-deactivates
    everything for the user (a plain `user_id` + `removed_at IS NULL` filter,
    safe at any watchlist size), then reactivates/inserts the current set via
    a single upsert whose rows travel in the request body."""
    table = _table_mock(supabase_mock, "user_watchlist_items")

    watchlist.sync_user_watchlist("user-1", {"film-a", "film-b"})

    eq_args = table.update.return_value.eq.call_args[0]
    assert eq_args == ("user_id", "user-1")
    is_args = table.update.return_value.eq.return_value.is_.call_args[0]
    assert is_args == ("removed_at", "null")

    table.upsert.assert_called_once()
    upserted_rows, upsert_kwargs = table.upsert.call_args[0], table.upsert.call_args[1]
    assert {row["film_id"] for row in upserted_rows[0]} == {"film-a", "film-b"}
    assert all(row["user_id"] == "user-1" and row["removed_at"] is None for row in upserted_rows[0])
    assert upsert_kwargs["on_conflict"] == "user_id,film_id"


def test_sync_user_watchlist_skips_upsert_for_empty_watchlist(supabase_mock):
    """An emptied watchlist still deactivates existing rows, but must not send
    an empty upsert payload."""
    table = _table_mock(supabase_mock, "user_watchlist_items")

    watchlist.sync_user_watchlist("user-1", set())

    table.update.assert_called_once()
    table.upsert.assert_not_called()


def test_sync_user_watchlist_upsert_omits_added_at(supabase_mock):
    """`added_at` must never be in the upsert payload: PostgREST's
    merge-on-conflict only touches columns it's given, so omitting it keeps
    the original add date on existing rows and falls back to the column
    default (`now()`) only for genuinely new ones."""
    table = _table_mock(supabase_mock, "user_watchlist_items")

    watchlist.sync_user_watchlist("user-1", {"film-a"})

    upserted_rows = table.upsert.call_args[0][0]
    assert all("added_at" not in row for row in upserted_rows)


# --- get_active_watchlist --------------------------------------------------


def test_get_active_watchlist_maps_joined_rows(supabase_mock):
    table = _table_mock(supabase_mock, "user_watchlist_items")
    table.select.return_value.eq.return_value.is_.return_value.execute.return_value = MagicMock(
        data=[
            {
                "added_at": "2026-01-15T10:00:00+00:00",
                "films": {
                    "id": "film-uuid-1",
                    "letterboxd_slug": "film-a",
                    "title": "Film A",
                    "year": 2020,
                    "poster_url": "http://x/a.jpg",
                    "genres": ["35"],
                    "runtime": 100,
                    "origin_country": ["US"],
                    "overview": "A synopsis.",
                }
            }
        ]
    )

    result = watchlist.get_active_watchlist("user-1")

    assert len(result) == 1
    film = result[0]
    assert film.id == "film-uuid-1"
    assert film.added_at.year == 2026
    assert film.added_at.month == 1

    table.select.assert_called_once_with("added_at, films(*)")
    eq_args = table.select.return_value.eq.call_args[0]
    assert eq_args == ("user_id", "user-1")
    is_args = table.select.return_value.eq.return_value.is_.call_args[0]
    assert is_args == ("removed_at", "null")


def test_get_active_watchlist_normalizes_null_arrays(supabase_mock):
    """Unenriched films store an explicit SQL NULL for `genres`/`origin_country`
    (see backend/db/schema.sql), which `films(*)` returns as-is — must not
    raise a ValidationError, must normalize to an empty list instead."""
    table = _table_mock(supabase_mock, "user_watchlist_items")
    table.select.return_value.eq.return_value.is_.return_value.execute.return_value = MagicMock(
        data=[
            {
                "added_at": "2026-01-15T10:00:00+00:00",
                "films": {
                    "id": "film-uuid-2",
                    "letterboxd_slug": "film-b",
                    "title": "Film B",
                    "year": 2021,
                    "poster_url": None,
                    "genres": None,
                    "runtime": None,
                    "origin_country": None,
                    "overview": None,
                }
            }
        ]
    )

    result = watchlist.get_active_watchlist("user-1")

    assert len(result) == 1
    assert result[0].genres == []
    assert result[0].origin_country == []


def test_get_active_watchlist_empty(supabase_mock):
    table = _table_mock(supabase_mock, "user_watchlist_items")
    table.select.return_value.eq.return_value.is_.return_value.execute.return_value = MagicMock(
        data=[]
    )

    assert watchlist.get_active_watchlist("user-1") == []
