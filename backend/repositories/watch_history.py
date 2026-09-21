"""Watch history reads and writes (CIN-49/CIN-78).

A row moves through exactly one transition: `/recommend` inserts it as
`"proposed"` for every candidate it returns; `/recommend/decision` updates
that same row to `"accepted"`/`"skipped"`. A decision naming a film with no
matching `"proposed"` row has nothing to update — that's the verification
that the film was actually shown, not just claimed by the client.

`decided_at` doubles as "last touched": it's set at proposal time (column
default) and overwritten again at decision time. The two-layer exclusion in
`filtering.py` only needs "was this film touched, and how recently" — not a
separate proposal/decision timestamp.
"""

from datetime import UTC, datetime
from typing import Literal, TypedDict

from supabase_client import supabase

_WATCH_HISTORY_TABLE = "watch_history"


class DecisionHistoryRow(TypedDict):
    film_id: str
    decided_at: str


def get_decision_history(user_id: str) -> dict[str, datetime]:
    """Every film this user has ever been shown, mapped to when it was last
    touched (proposed or decided) — regardless of what the decision is.

    A film can have multiple rows over time (no uniqueness constraint on
    `(user_id, film_id)`), so results are ordered oldest-first: the dict
    comprehension below then lets the last-iterated (= most recent) row for
    each `film_id` win."""
    response = (
        supabase.table(_WATCH_HISTORY_TABLE)
        .select("film_id, decided_at")
        .eq("user_id", user_id)
        .order("decided_at", desc=False)
        .execute()
    )
    rows: list[DecisionHistoryRow] = response.data  # type: ignore[assignment]
    return {row["film_id"]: datetime.fromisoformat(row["decided_at"]) for row in rows}


def record_proposals(
    user_id: str,
    recommendation_session_id: str,
    film_ids: list[str],
    questions_context: dict,
) -> None:
    """Write one `"proposed"` row per candidate `/recommend` is about to return."""
    if not film_ids:
        return
    supabase.table(_WATCH_HISTORY_TABLE).insert(
        [
            {
                "user_id": user_id,
                "recommendation_session_id": recommendation_session_id,
                "film_id": film_id,
                "decision": "proposed",
                "questions_context": questions_context,
            }
            for film_id in film_ids
        ]
    ).execute()


def record_decision(
    user_id: str,
    recommendation_session_id: str,
    film_id: str,
    decision: Literal["accepted", "skipped"],
    match_score: int | None,
    critique: str | None,
) -> bool:
    """Update the matching `"proposed"` row to `decision`. Returns `False`
    (updates nothing) when no such row exists for this user/film."""
    response = (
        supabase.table(_WATCH_HISTORY_TABLE)
        .update(
            {
                "decision": decision,
                "match_score": match_score,
                "ai_critique": critique,
                "decided_at": datetime.now(UTC).isoformat(),
            }
        )
        .eq("user_id", user_id)
        .eq("recommendation_session_id", recommendation_session_id)
        .eq("film_id", film_id)
        .eq("decision", "proposed")
        .execute()
    )
    return len(response.data) > 0
