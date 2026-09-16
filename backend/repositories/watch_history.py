"""Watch history reads (CIN-49): which films a user has already been shown.

`watch_history` gains one row per past recommendation the user decided on
(`accepted` or `skipped`). Both count for exclusion — reproposing a film the
user just accepted or just skipped is a bug, not a choice; see the design
doc's decision #7 for why this doesn't distinguish the two.
"""

from typing import TypedDict

from supabase_client import supabase

_WATCH_HISTORY_TABLE = "watch_history"


class WatchHistoryRow(TypedDict):
    film_id: str


def get_excluded_film_ids(user_id: str) -> set[str]:
    """Every film id already decided on (accepted or skipped) by this user."""
    response = supabase.table(_WATCH_HISTORY_TABLE).select("film_id").eq("user_id", user_id).execute()
    rows: list[WatchHistoryRow] = response.data  # type: ignore[assignment]
    return {row["film_id"] for row in rows}
