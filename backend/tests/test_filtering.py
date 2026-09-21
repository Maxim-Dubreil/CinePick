"""Tests for the hard-filter porting (CIN-49). Pure functions, no I/O."""

from datetime import UTC, datetime, timedelta

import pytest

import filtering
from models import RecommendRequest, WatchlistFilm


def _film(**overrides) -> WatchlistFilm:
    defaults = dict(
        id="film-1", letterboxd_slug="film-1", title="Film", year=2020,
        poster_url=None, genres=["35"], runtime=100, origin_country=["US"],
        overview=None, added_at=datetime(2026, 1, 1, tzinfo=UTC),
    )
    return WatchlistFilm(**{**defaults, **overrides})


def _answers(**overrides) -> RecommendRequest:
    defaults = dict(
        genre=["none"], emotion=["none"], ambiance=["none"], withWho="any",
        duration="any", era="any", region=["none"], subtitles="any", seen="any",
    )
    return RecommendRequest(**{**defaults, **overrides})


_NOW = datetime(2026, 6, 1, 12, 0, 0, tzinfo=UTC)
_RECENT = _NOW - timedelta(minutes=5)
_OLD = _NOW - timedelta(days=30)


def test_filter_candidates_genre_match():
    films = [_film(id="a", genres=["35"]), _film(id="b", genres=["27"])]
    result = filtering.filter_candidates(films, _answers(genre=["35"]), {})
    assert [f.id for f in result] == ["a"]


def test_filter_candidates_genre_multi_requires_all():
    films = [
        _film(id="a", genres=["35", "80"]),
        _film(id="b", genres=["35"]),
        _film(id="c", genres=["80"]),
    ]
    result = filtering.filter_candidates(films, _answers(genre=["35", "80"]), {})
    assert [f.id for f in result] == ["a"]


def test_filter_candidates_genre_none_bypasses():
    films = [_film(id="a", genres=["35"]), _film(id="b", genres=["27"])]
    result = filtering.filter_candidates(films, _answers(genre=["none"]), {})
    assert {f.id for f in result} == {"a", "b"}


def test_filter_candidates_duration_missing_runtime_not_excluded():
    films = [_film(id="a", runtime=None)]
    result = filtering.filter_candidates(films, _answers(duration="lt90"), {})
    assert [f.id for f in result] == ["a"]


def test_filter_candidates_era_missing_year_not_excluded():
    films = [_film(id="a", year=None)]
    result = filtering.filter_candidates(films, _answers(era="recent"), {})
    assert [f.id for f in result] == ["a"]


def test_filter_candidates_region_match():
    films = [_film(id="a", origin_country=["US"]), _film(id="b", origin_country=["FR"])]
    result = filtering.filter_candidates(films, _answers(region=["US"]), {})
    assert [f.id for f in result] == ["a"]


def test_filter_candidates_excludes_old_history_by_default(monkeypatch):
    monkeypatch.setattr(filtering, "_now", lambda: _NOW)
    films = [_film(id="a"), _film(id="b")]
    result = filtering.filter_candidates(films, _answers(seen="nouveau"), {"a": _OLD})
    assert [f.id for f in result] == ["b"]


def test_filter_candidates_seen_any_allows_old_history(monkeypatch):
    monkeypatch.setattr(filtering, "_now", lambda: _NOW)
    films = [_film(id="a"), _film(id="b")]
    result = filtering.filter_candidates(films, _answers(seen="any"), {"a": _OLD})
    assert {f.id for f in result} == {"a", "b"}


def test_filter_candidates_recent_history_excluded_even_with_seen_any(monkeypatch):
    """The session layer (< 15 min) is never bypassable, unlike the
    historical layer — a film rejected 5 minutes ago must never come back
    in the same retry, regardless of the "déjà vu" answer."""
    monkeypatch.setattr(filtering, "_now", lambda: _NOW)
    films = [_film(id="a"), _film(id="b")]
    result = filtering.filter_candidates(films, _answers(seen="any"), {"a": _RECENT})
    assert [f.id for f in result] == ["b"]


def test_filter_candidates_empty_watchlist_raises():
    with pytest.raises(filtering.EmptyWatchlistError):
        filtering.filter_candidates([], _answers(), {})


def test_filter_candidates_no_match_raises():
    films = [_film(id="a", genres=["35"])]
    with pytest.raises(filtering.NoCandidatesError):
        filtering.filter_candidates(films, _answers(genre=["27"]), {})


def test_duration_bucket_boundaries():
    assert filtering.duration_bucket(89) == "lt90"
    assert filtering.duration_bucket(90) == "90-120"
    assert filtering.duration_bucket(119) == "90-120"
    assert filtering.duration_bucket(120) == "120-150"
    assert filtering.duration_bucket(149) == "120-150"
    assert filtering.duration_bucket(150) == "150plus"


def test_duration_bucket_missing_runtime_is_none():
    assert filtering.duration_bucket(None) is None


def test_era_bucket_boundaries():
    assert filtering.era_bucket(1929) == "silent"
    assert filtering.era_bucket(1930) == "golden"
    assert filtering.era_bucket(1959) == "golden"
    assert filtering.era_bucket(1960) == "newwave"
    assert filtering.era_bucket(1979) == "newwave"
    assert filtering.era_bucket(1980) == "blockbuster"
    assert filtering.era_bucket(1999) == "blockbuster"
    assert filtering.era_bucket(2000) == "2000s"
    assert filtering.era_bucket(2014) == "2000s"
    assert filtering.era_bucket(2015) == "recent"


def test_era_bucket_missing_year_is_none():
    assert filtering.era_bucket(None) is None
