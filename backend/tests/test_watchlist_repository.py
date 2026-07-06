"""Tests for the watchlist storage repository (CIN-47/CIN-46)."""

from unittest.mock import MagicMock

from models import EnrichedFilm, Film, FilmEnrichment
from repositories import watchlist


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
        tmdb_id=42, genres=[28, 12], runtime=120, year=2021, origin_country=["US"]
    )

    merged = watchlist.merge_enrichment(film, enrichment)

    assert merged.letterboxd_slug == "film-a"
    assert merged.tmdb_id == 42
    assert merged.genres == ["28", "12"]
    assert merged.runtime == 120
    assert merged.year == 2021  # TMDB year wins over the scraped year
    assert merged.origin_country == ["US"]


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
        ),
    ]

    watchlist.upsert_films(films)

    records = table.upsert.call_args[0][0]
    unenriched_record = next(r for r in records if r["letterboxd_slug"] == "film-a")
    enriched_record = next(r for r in records if r["letterboxd_slug"] == "film-b")

    for key in ("tmdb_id", "genres", "runtime", "origin_country"):
        assert key not in unenriched_record

    assert enriched_record["tmdb_id"] == 42
    assert enriched_record["genres"] == ["28"]
    assert enriched_record["runtime"] == 120
    assert enriched_record["origin_country"] == ["US"]


# --- sync_user_watchlist --------------------------------------------------


def test_sync_user_watchlist_inserts_new_films(supabase_mock):
    table = _table_mock(supabase_mock, "user_watchlist_items")
    table.select.return_value.eq.return_value.execute.return_value = MagicMock(data=[])

    watchlist.sync_user_watchlist("user-1", {"film-a", "film-b"})

    table.insert.assert_called_once()
    inserted = table.insert.call_args[0][0]
    assert {row["film_id"] for row in inserted} == {"film-a", "film-b"}
    assert all(row["user_id"] == "user-1" for row in inserted)
    table.update.assert_not_called()


def test_sync_user_watchlist_soft_deletes_missing_films(supabase_mock):
    table = _table_mock(supabase_mock, "user_watchlist_items")
    table.select.return_value.eq.return_value.execute.return_value = MagicMock(
        data=[
            {"film_id": "film-a", "removed_at": None},
            {"film_id": "film-b", "removed_at": None},
        ]
    )

    watchlist.sync_user_watchlist("user-1", {"film-a"})

    update_args = table.update.call_args[0][0]
    assert update_args["removed_at"] is not None
    eq_args = table.update.return_value.eq.call_args[0]
    assert eq_args == ("user_id", "user-1")
    in_args = table.update.return_value.eq.return_value.in_.call_args[0]
    assert in_args == ("film_id", ["film-b"])
    table.insert.assert_not_called()


def test_sync_user_watchlist_clears_removed_at_on_reappearance(supabase_mock):
    table = _table_mock(supabase_mock, "user_watchlist_items")
    table.select.return_value.eq.return_value.execute.return_value = MagicMock(
        data=[{"film_id": "film-a", "removed_at": "2026-01-01T00:00:00+00:00"}]
    )

    watchlist.sync_user_watchlist("user-1", {"film-a"})

    update_args = table.update.call_args[0][0]
    assert update_args == {"removed_at": None}
    in_args = table.update.return_value.eq.return_value.in_.call_args[0]
    assert in_args == ("film_id", ["film-a"])
