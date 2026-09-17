"""Tests for the watch_history repository (CIN-49/CIN-78)."""

from datetime import UTC, datetime
from unittest.mock import MagicMock

from repositories import watch_history


def _table_mock(supabase_mock, table_name: str) -> MagicMock:
    table = MagicMock()
    supabase_mock.table.side_effect = lambda name, _t=table_name, _m=table: (
        _m if name == _t else MagicMock()
    )
    return table


def test_get_decision_history_maps_film_id_to_decided_at(supabase_mock):
    table = _table_mock(supabase_mock, "watch_history")
    table.select.return_value.eq.return_value.execute.return_value = MagicMock(
        data=[
            {"film_id": "film-1", "decided_at": "2026-01-15T10:00:00+00:00"},
            {"film_id": "film-2", "decided_at": "2026-01-16T10:00:00+00:00"},
        ]
    )

    result = watch_history.get_decision_history("user-1")

    assert set(result.keys()) == {"film-1", "film-2"}
    assert result["film-1"] == datetime(2026, 1, 15, 10, 0, 0, tzinfo=UTC)
    table.select.assert_called_once_with("film_id, decided_at")
    eq_args = table.select.return_value.eq.call_args[0]
    assert eq_args == ("user_id", "user-1")


def test_get_decision_history_empty(supabase_mock):
    table = _table_mock(supabase_mock, "watch_history")
    table.select.return_value.eq.return_value.execute.return_value = MagicMock(data=[])

    assert watch_history.get_decision_history("user-1") == {}


def test_record_proposals_inserts_one_row_per_film(supabase_mock):
    table = _table_mock(supabase_mock, "watch_history")

    watch_history.record_proposals("user-1", ["film-1", "film-2"], {"genre": ["none"]})

    table.insert.assert_called_once()
    rows = table.insert.call_args[0][0]
    assert len(rows) == 2
    assert all(r["user_id"] == "user-1" and r["decision"] == "proposed" for r in rows)
    assert {r["film_id"] for r in rows} == {"film-1", "film-2"}
    assert all(r["questions_context"] == {"genre": ["none"]} for r in rows)


def test_record_proposals_empty_list_skips_call(supabase_mock):
    table = _table_mock(supabase_mock, "watch_history")

    watch_history.record_proposals("user-1", [], {})

    table.insert.assert_not_called()


def test_record_decision_updates_matching_proposed_row(supabase_mock):
    table = _table_mock(supabase_mock, "watch_history")
    table.update.return_value.eq.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
        data=[{"id": "row-1"}]
    )

    result = watch_history.record_decision("user-1", "film-1", "accepted", 87, "Great pick.")

    assert result is True
    update_payload = table.update.call_args[0][0]
    assert update_payload["decision"] == "accepted"
    assert update_payload["match_score"] == 87
    assert update_payload["ai_critique"] == "Great pick."
    assert "decided_at" in update_payload
    # Verify the three .eq() filters in correct order
    assert table.update.return_value.eq.call_args[0] == ("user_id", "user-1")
    assert table.update.return_value.eq.return_value.eq.call_args[0] == ("film_id", "film-1")
    assert table.update.return_value.eq.return_value.eq.return_value.eq.call_args[0] == (
        "decision",
        "proposed",
    )


def test_record_decision_no_matching_proposal_returns_false(supabase_mock):
    table = _table_mock(supabase_mock, "watch_history")
    table.update.return_value.eq.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
        data=[]
    )

    result = watch_history.record_decision("user-1", "film-1", "skipped", None, None)

    assert result is False
    # Verify the three .eq() filters in correct order
    assert table.update.return_value.eq.call_args[0] == ("user_id", "user-1")
    assert table.update.return_value.eq.return_value.eq.call_args[0] == ("film_id", "film-1")
    assert table.update.return_value.eq.return_value.eq.return_value.eq.call_args[0] == (
        "decision",
        "proposed",
    )
