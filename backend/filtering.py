"""Hard-filter porting from the questionnaire (CIN-49).

Pure functions, no I/O — mirrors `frontend/src/lib/question/filters.ts`,
which never had a runtime/year-to-bucket function (mocked films carry a
pre-assigned bucket); the boundaries below are derived from the question
option labels in `questionnaire.ts` (e.g. "1h30-2h" -> [90, 120)).
"""


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
