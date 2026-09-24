"""Watch history reads and writes (CIN-49/CIN-78).

A row moves through exactly one transition: `/recommend` inserts it as
`"proposed"` for every candidate it returns, already carrying `rank`/
`match_score`/`ai_critique` from the AI response; `/recommend/decision` only
ever updates `decision`/`decided_at` on that same row. A decision naming a
film with no matching `"proposed"` row has nothing to update — that's the
verification that the film was actually shown, not just claimed by the
client.

`decided_at` doubles as "last touched": it's set at proposal time (column
default) and overwritten again at decision time. The two-layer exclusion in
`filtering.py` only needs "was this film touched, and how recently" — not a
separate proposal/decision timestamp. A `"proposed"` row the user never
swipes to isn't a decision at all: `abandon_session` deletes it outright
rather than giving it a status, so it never counts as "touched".
"""

from datetime import UTC, datetime
from typing import Literal, TypedDict

from models import RankedCandidate
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
    ranked: list[RankedCandidate],
    questions_context: dict,
) -> None:
    """Write one `"proposed"` row per candidate `/recommend` is about to
    return, already carrying its rank/match_score/critique — resuming a
    session later never needs a second AI call to know these."""
    if not ranked:
        return
    supabase.table(_WATCH_HISTORY_TABLE).insert(
        [
            {
                "user_id": user_id,
                "recommendation_session_id": recommendation_session_id,
                "film_id": r.film.id,
                "decision": "proposed",
                "questions_context": questions_context,
                "rank": r.rank,
                "match_score": r.match_score,
                "ai_critique": r.critique,
            }
            for r in ranked
        ]
    ).execute()


class PendingCandidateRow(TypedDict):
    film_id: str
    rank: int
    match_score: int | None
    ai_critique: str | None
    questions_context: dict
    films: dict


class _LatestSessionRow(TypedDict):
    recommendation_session_id: str
    decided_at: str


def get_pending_session(user_id: str) -> tuple[str, list[PendingCandidateRow]] | None:
    """The user's most recent recommendation session that still has at least
    one undecided ("proposed") candidate, each joined with its film — lets
    `/recommend/current` rebuild a swipe deck without a new AI call.

    `None` means every past recommendation was fully decided (or there was
    never one) — the front falls back to Questions."""
    latest = (
        supabase.table(_WATCH_HISTORY_TABLE)
        .select("recommendation_session_id, decided_at")
        .eq("user_id", user_id)
        .eq("decision", "proposed")
        .order("decided_at", desc=True)
        .limit(1)
        .execute()
    )
    latest_rows: list[_LatestSessionRow] = latest.data  # type: ignore[assignment]
    if not latest_rows:
        return None
    session_id = latest_rows[0]["recommendation_session_id"]

    response = (
        supabase.table(_WATCH_HISTORY_TABLE)
        .select("film_id, rank, match_score, ai_critique, questions_context, films(*)")
        .eq("user_id", user_id)
        .eq("recommendation_session_id", session_id)
        .eq("decision", "proposed")
        .order("rank")
        .execute()
    )
    rows: list[PendingCandidateRow] = response.data  # type: ignore[assignment]
    return session_id, rows


def abandon_session(user_id: str, recommendation_session_id: str) -> None:
    """Delete every still-"proposed" row of this session — the explicit
    "Recommencer" action, or a session cut short by an "accepted" decision,
    so `get_pending_session` stops returning it. These candidates were never
    actually swiped to, so there's no decision to record: deleting the row
    (rather than giving it a status like "skipped") keeps them from reading
    as a rejection in Historique or counting as "seen" for future
    recommendations — as if never proposed. A no-op if nothing there is
    still "proposed" (already decided, wrong session, or nothing to
    abandon) — not an error."""
    supabase.table(_WATCH_HISTORY_TABLE).delete().eq("user_id", user_id).eq(
        "recommendation_session_id", recommendation_session_id
    ).eq("decision", "proposed").execute()


def record_decision(
    user_id: str,
    recommendation_session_id: str,
    film_id: str,
    decision: Literal["accepted", "skipped"],
) -> bool:
    """Update the matching `"proposed"` row to `decision`. Returns `False`
    (updates nothing) when no such row exists for this user/film."""
    response = (
        supabase.table(_WATCH_HISTORY_TABLE)
        .update(
            {
                "decision": decision,
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
