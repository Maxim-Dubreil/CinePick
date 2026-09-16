"""Tests for the watch_history repository (CIN-49)."""

from unittest.mock import MagicMock

from repositories import watch_history


def _table_mock(supabase_mock, table_name: str) -> MagicMock:
    table = MagicMock()
    supabase_mock.table.side_effect = lambda name, _t=table_name, _m=table: (
        _m if name == _t else MagicMock()
    )
    return table


def test_get_excluded_film_ids_includes_accepted_and_skipped(supabase_mock):
    table = _table_mock(supabase_mock, "watch_history")
    table.select.return_value.eq.return_value.execute.return_value = MagicMock(
        data=[{"film_id": "film-1"}, {"film_id": "film-2"}]
    )

    result = watch_history.get_excluded_film_ids("user-1")

    assert result == {"film-1", "film-2"}
    table.select.assert_called_once_with("film_id")
    eq_args = table.select.return_value.eq.call_args[0]
    assert eq_args == ("user_id", "user-1")


def test_get_excluded_film_ids_empty(supabase_mock):
    table = _table_mock(supabase_mock, "watch_history")
    table.select.return_value.eq.return_value.execute.return_value = MagicMock(data=[])

    assert watch_history.get_excluded_film_ids("user-1") == set()
