"""Hard-filter porting from the questionnaire (CIN-49).

Pure functions, no I/O — mirrors `frontend/src/lib/question/filters.ts`,
which never had a runtime/year-to-bucket function (mocked films carry a
pre-assigned bucket); the boundaries below are derived from the question
option labels in `questionnaire.ts` (e.g. "1h30-2h" -> [90, 120)).
"""

from datetime import UTC, datetime, timedelta

from models import RecommendRequest, WatchlistFilm

_SESSION_WINDOW = timedelta(minutes=15)
"""How long a just-touched film is excluded unconditionally, regardless of
the "déjà vu" answer — a starting threshold, not a fixed contract (see
design doc's Points ouverts)."""


def _now() -> datetime:
    """Isolated for monkeypatching in tests — the only place `filtering.py`
    reads wall-clock time."""
    return datetime.now(UTC)


def duration_bucket(runtime: int | None) -> str | None:
    """`None` when `runtime` is unknown — never excluded by the duration filter."""
    if runtime is None:
        return None
    if runtime < 90:
        return "lt90"
    if runtime < 120:
        return "90-120"
    if runtime < 150:
        return "120-150"
    return "150plus"


def era_bucket(year: int | None) -> str | None:
    """`None` when `year` is unknown — never excluded by the era filter."""
    if year is None:
        return None
    if year < 1930:
        return "silent"
    if year < 1960:
        return "golden"
    if year < 1980:
        return "newwave"
    if year < 2000:
        return "blockbuster"
    if year < 2015:
        return "2000s"
    return "recent"


class EmptyWatchlistError(Exception):
    """Raised when the user has zero active films in their watchlist."""


class NoCandidatesError(Exception):
    """Raised when at least one film exists but none survive the hard filters."""


def _matches(
    film: WatchlistFilm, answers: RecommendRequest, decision_history: dict[str, datetime]
) -> bool:
    """Apply the 5 hard filters plus the two-layer history exclusion."""
    if "none" not in answers.genre and not (set(answers.genre) & set(film.genres)):
        return False
    if answers.duration != "any":
        bucket = duration_bucket(film.runtime)
        if bucket is not None and bucket != answers.duration:
            return False
    if answers.era != "any":
        bucket = era_bucket(film.year)
        if bucket is not None and bucket != answers.era:
            return False
    if "none" not in answers.region and not (set(answers.region) & set(film.origin_country)):
        return False

    touched_at = decision_history.get(film.id)
    if touched_at is not None:
        if _now() - touched_at < _SESSION_WINDOW:
            return False
        if answers.seen != "any":
            return False
    return True


def filter_candidates(
    films: list[WatchlistFilm],
    answers: RecommendRequest,
    decision_history: dict[str, datetime],
) -> list[WatchlistFilm]:
    """Apply the 5 hard filters. Raises rather than returning an empty list —
    both empty cases are domain errors for `/recommend`, not valid results."""
    if not films:
        raise EmptyWatchlistError("watchlist has no active films")
    candidates = [f for f in films if _matches(f, answers, decision_history)]
    if not candidates:
        raise NoCandidatesError("no film matches the selected filters")
    return candidates
