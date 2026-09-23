"""Tests for the watch_history repository (CIN-49/CIN-78)."""

from datetime import UTC, datetime
from unittest.mock import MagicMock

from models import RankedCandidate, WatchlistFilm
from repositories import watch_history


def _film(id: str) -> WatchlistFilm:
    return WatchlistFilm(
        id=id,
        letterboxd_slug=id,
        title=f"Film {id}",
        year=2020,
        poster_url=None,
        added_at=datetime(2026, 1, 1, tzinfo=UTC),
    )


def _table_mock(supabase_mock, table_name: str) -> MagicMock:
    table = MagicMock()
    supabase_mock.table.side_effect = lambda name, _t=table_name, _m=table: (
        _m if name == _t else MagicMock()
    )
    return table


def test_get_decision_history_maps_film_id_to_decided_at(supabase_mock):
    table = _table_mock(supabase_mock, "watch_history")
    table.select.return_value.eq.return_value.order.return_value.execute.return_value = (
        MagicMock(
            data=[
                {"film_id": "film-1", "decided_at": "2026-01-15T10:00:00+00:00"},
                {"film_id": "film-2", "decided_at": "2026-01-16T10:00:00+00:00"},
            ]
        )
    )

    result = watch_history.get_decision_history("user-1")

    assert set(result.keys()) == {"film-1", "film-2"}
    assert result["film-1"] == datetime(2026, 1, 15, 10, 0, 0, tzinfo=UTC)
    table.select.assert_called_once_with("film_id, decided_at")
    eq_args = table.select.return_value.eq.call_args[0]
    assert eq_args == ("user_id", "user-1")
    order_args, order_kwargs = table.select.return_value.eq.return_value.order.call_args
    assert order_args == ("decided_at",)
    assert order_kwargs == {"desc": False}


def test_get_decision_history_empty(supabase_mock):
    table = _table_mock(supabase_mock, "watch_history")
    table.select.return_value.eq.return_value.order.return_value.execute.return_value = (
        MagicMock(data=[])
    )

    assert watch_history.get_decision_history("user-1") == {}


def test_get_decision_history_uses_most_recent_when_film_has_multiple_rows(supabase_mock):
    table = _table_mock(supabase_mock, "watch_history")
    # Ascending order (oldest first), as the real `.order("decided_at", desc=False)` returns.
    table.select.return_value.eq.return_value.order.return_value.execute.return_value = (
        MagicMock(
            data=[
                {"film_id": "film-1", "decided_at": "2026-01-01T10:00:00+00:00"},
                {"film_id": "film-1", "decided_at": "2026-01-20T10:00:00+00:00"},
            ]
        )
    )

    result = watch_history.get_decision_history("user-1")

    assert result["film-1"] == datetime(2026, 1, 20, 10, 0, 0, tzinfo=UTC)


def test_record_proposals_inserts_one_row_per_film(supabase_mock):
    table = _table_mock(supabase_mock, "watch_history")
    ranked = [
        RankedCandidate(film=_film("film-1"), rank=1, match_score=90, critique="Top pick."),
        RankedCandidate(film=_film("film-2"), rank=2, match_score=70, critique="Also good."),
    ]

    watch_history.record_proposals("user-1", "session-1", ranked, {"genre": ["none"]})

    table.insert.assert_called_once()
    rows = table.insert.call_args[0][0]
    assert len(rows) == 2
    assert all(r["user_id"] == "user-1" and r["decision"] == "proposed" for r in rows)
    assert all(r["recommendation_session_id"] == "session-1" for r in rows)
    assert {r["film_id"] for r in rows} == {"film-1", "film-2"}
    assert all(r["questions_context"] == {"genre": ["none"]} for r in rows)
    by_film = {r["film_id"]: r for r in rows}
    assert by_film["film-1"]["rank"] == 1
    assert by_film["film-1"]["match_score"] == 90
    assert by_film["film-1"]["ai_critique"] == "Top pick."
    assert by_film["film-2"]["rank"] == 2


def test_record_proposals_empty_list_skips_call(supabase_mock):
    table = _table_mock(supabase_mock, "watch_history")

    watch_history.record_proposals("user-1", "session-1", [], {})

    table.insert.assert_not_called()


def test_get_pending_session_returns_none_when_nothing_proposed(supabase_mock):
    table = _table_mock(supabase_mock, "watch_history")
    latest_chain = (
        table.select.return_value.eq.return_value.eq.return_value.order.return_value.limit
        .return_value
    )
    latest_chain.execute.return_value = MagicMock(data=[])

    assert watch_history.get_pending_session("user-1") is None


def test_get_pending_session_returns_most_recent_session_candidates(supabase_mock):
    table = _table_mock(supabase_mock, "watch_history")
    after_one_eq = table.select.return_value.eq.return_value
    after_two_eq = after_one_eq.eq.return_value

    latest_chain = after_two_eq.order.return_value.limit.return_value
    latest_chain.execute.return_value = MagicMock(
        data=[
            {"recommendation_session_id": "session-2", "decided_at": "2026-01-02T00:00:00+00:00"}
        ]
    )

    candidates_chain = after_two_eq.eq.return_value.order.return_value
    candidates_chain.execute.return_value = MagicMock(
        data=[
            {
                "film_id": "film-1",
                "rank": 1,
                "match_score": 90,
                "ai_critique": "Top pick.",
                "films": {"title": "Film 1"},
            },
            {
                "film_id": "film-2",
                "rank": 2,
                "match_score": 70,
                "ai_critique": "Also good.",
                "films": {"title": "Film 2"},
            },
        ]
    )

    result = watch_history.get_pending_session("user-1")

    assert result is not None
    session_id, rows = result
    assert session_id == "session-2"
    assert [r["film_id"] for r in rows] == ["film-1", "film-2"]
    assert rows[0]["films"]["title"] == "Film 1"
    # The candidates query filters on the session found by the latest query.
    assert after_one_eq.eq.call_args[0] == ("recommendation_session_id", "session-2")


def test_record_decision_updates_matching_proposed_row(supabase_mock):
    table = _table_mock(supabase_mock, "watch_history")
    chain = (
        table.update.return_value.eq.return_value.eq.return_value.eq.return_value.eq.return_value
    )
    chain.execute.return_value = MagicMock(data=[{"id": "row-1"}])

    result = watch_history.record_decision("user-1", "session-1", "film-1", "accepted")

    assert result is True
    update_payload = table.update.call_args[0][0]
    assert update_payload["decision"] == "accepted"
    assert "decided_at" in update_payload
    # Verify the four .eq() filters in correct order
    assert table.update.return_value.eq.call_args[0] == ("user_id", "user-1")
    assert table.update.return_value.eq.return_value.eq.call_args[0] == (
        "recommendation_session_id",
        "session-1",
    )
    assert table.update.return_value.eq.return_value.eq.return_value.eq.call_args[0] == (
        "film_id",
        "film-1",
    )
    assert (
        table.update.return_value.eq.return_value.eq.return_value.eq.return_value.eq.call_args[0]
        == (
        "decision",
        "proposed",
        )
    )


def test_record_decision_no_matching_proposal_returns_false(supabase_mock):
    table = _table_mock(supabase_mock, "watch_history")
    chain = (
        table.update.return_value.eq.return_value.eq.return_value.eq.return_value.eq.return_value
    )
    chain.execute.return_value = MagicMock(data=[])

    result = watch_history.record_decision("user-1", "session-1", "film-1", "skipped")

    assert result is False
    # Verify the four .eq() filters in correct order
    assert table.update.return_value.eq.call_args[0] == ("user_id", "user-1")
    assert table.update.return_value.eq.return_value.eq.call_args[0] == (
        "recommendation_session_id",
        "session-1",
    )
    assert table.update.return_value.eq.return_value.eq.return_value.eq.call_args[0] == (
        "film_id",
        "film-1",
    )
    assert (
        table.update.return_value.eq.return_value.eq.return_value.eq.return_value.eq.call_args[0]
        == (
        "decision",
        "proposed",
        )
    )


def test_abandon_session_marks_remaining_proposed_as_skipped(supabase_mock):
    table = _table_mock(supabase_mock, "watch_history")
    chain = table.update.return_value.eq.return_value.eq.return_value.eq.return_value
    chain.execute.return_value = MagicMock(data=[{"id": "row-1"}, {"id": "row-2"}])

    watch_history.abandon_session("user-1", "session-1")

    update_payload = table.update.call_args[0][0]
    assert update_payload["decision"] == "skipped"
    assert "decided_at" in update_payload
    # Verify the three .eq() filters in correct order
    assert table.update.return_value.eq.call_args[0] == ("user_id", "user-1")
    assert table.update.return_value.eq.return_value.eq.call_args[0] == (
        "recommendation_session_id",
        "session-1",
    )
    assert table.update.return_value.eq.return_value.eq.return_value.eq.call_args[0] == (
        "decision",
        "proposed",
    )
