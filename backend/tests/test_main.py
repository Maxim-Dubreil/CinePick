from datetime import UTC, datetime

import httpx
import pytest
from fastapi.testclient import TestClient
from supabase_auth.errors import AuthApiError

import main as main_module
import reco_ai
import scraper
import tmdb
import tmdb_rating
import watch_providers
from main import app
from models import Film, RankedCandidate, WatchlistFilm
from repositories import watch_history as watch_history_repo
from repositories import watchlist as watchlist_repo
from tmdb_rating import RatingResponse
from watch_providers import WatchProvider, WatchProvidersResponse

client = TestClient(app)


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "CinePick API is running"}


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.integration
def test_health_ready_endpoint(require_integration, monkeypatch):
    monkeypatch.setattr(main_module, "supabase", require_integration)
    response = client.get("/health/ready")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"
    assert data["checks"]["database"] == "ok"


AUTH_HEADERS = {"Authorization": "Bearer test-token"}


def _patch_validate(monkeypatch, *, returns=None, raises=None):
    async def fake(username, **kwargs):
        if raises is not None:
            raise raises
        return returns

    monkeypatch.setattr(scraper, "get_watchlist_count", fake)


def test_letterboxd_validate_nominal(monkeypatch):
    _patch_validate(monkeypatch, returns=602)
    response = client.get(
        "/letterboxd/validate", params={"username": "dave"}, headers=AUTH_HEADERS
    )
    assert response.status_code == 200
    assert response.json() == {"username": "dave", "count": 602}


def test_letterboxd_validate_profile_not_found(monkeypatch):
    _patch_validate(monkeypatch, raises=scraper.ProfileNotFoundError("ghost"))
    response = client.get(
        "/letterboxd/validate", params={"username": "ghost"}, headers=AUTH_HEADERS
    )
    assert response.status_code == 404


def test_letterboxd_validate_private(monkeypatch):
    _patch_validate(monkeypatch, raises=scraper.WatchlistPrivateError("secretive"))
    response = client.get(
        "/letterboxd/validate", params={"username": "secretive"}, headers=AUTH_HEADERS
    )
    assert response.status_code == 403


def test_letterboxd_validate_scrape_error(monkeypatch):
    _patch_validate(monkeypatch, raises=scraper.WatchlistScrapeError("boom"))
    response = client.get(
        "/letterboxd/validate", params={"username": "dave"}, headers=AUTH_HEADERS
    )
    assert response.status_code == 502


def test_letterboxd_validate_requires_username():
    response = client.get("/letterboxd/validate", headers=AUTH_HEADERS)
    assert response.status_code == 422


def test_letterboxd_validate_requires_auth(monkeypatch):
    _patch_validate(monkeypatch, returns=602)
    response = client.get("/letterboxd/validate", params={"username": "dave"})
    assert response.status_code == 401


def _patch_sync(monkeypatch, *, films=None, raises=None):
    async def fake_get_full_watchlist(username, **kwargs):
        if raises is not None:
            raise raises
        return films or []

    async def fake_enrich_many(films, **kwargs):
        return {film.slug: None for film in films}

    def fake_upsert_films(films):
        return {film.letterboxd_slug: f"id-{film.letterboxd_slug}" for film in films}

    def fake_sync_user_watchlist(user_id, film_ids):
        return None

    monkeypatch.setattr(scraper, "get_full_watchlist", fake_get_full_watchlist)
    monkeypatch.setattr(tmdb, "enrich_many", fake_enrich_many)
    monkeypatch.setattr(watchlist_repo, "upsert_films", fake_upsert_films)
    monkeypatch.setattr(watchlist_repo, "sync_user_watchlist", fake_sync_user_watchlist)


def test_letterboxd_sync_nominal(monkeypatch):
    films = [
        Film(slug="film-a", title="Film A", year=2020, poster_url=None),
        Film(slug="film-b", title="Film B", year=2021, poster_url=None),
    ]
    _patch_sync(monkeypatch, films=films)
    response = client.post(
        "/letterboxd/sync",
        json={"letterboxd_username": "cinephile"},
        headers=AUTH_HEADERS,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["film_count"] == 2
    assert isinstance(data["sync_duration_ms"], int)


def test_letterboxd_sync_profile_not_found(monkeypatch):
    _patch_sync(monkeypatch, raises=scraper.ProfileNotFoundError("ghost"))
    response = client.post(
        "/letterboxd/sync", json={"letterboxd_username": "ghost"}, headers=AUTH_HEADERS
    )
    assert response.status_code == 404


def test_letterboxd_sync_private(monkeypatch):
    _patch_sync(monkeypatch, raises=scraper.WatchlistPrivateError("secretive"))
    response = client.post(
        "/letterboxd/sync", json={"letterboxd_username": "secretive"}, headers=AUTH_HEADERS
    )
    assert response.status_code == 403


def test_letterboxd_sync_scrape_error(monkeypatch):
    _patch_sync(monkeypatch, raises=scraper.WatchlistScrapeError("boom"))
    response = client.post(
        "/letterboxd/sync", json={"letterboxd_username": "cinephile"}, headers=AUTH_HEADERS
    )
    assert response.status_code == 502


def test_letterboxd_sync_missing_username():
    response = client.post("/letterboxd/sync", json={}, headers=AUTH_HEADERS)
    assert response.status_code == 422


def test_letterboxd_sync_empty_username():
    response = client.post(
        "/letterboxd/sync",
        json={"letterboxd_username": ""},
        headers=AUTH_HEADERS,
    )
    assert response.status_code == 422


def test_letterboxd_sync_requires_auth():
    response = client.post("/letterboxd/sync", json={"letterboxd_username": "cinephile"})
    assert response.status_code == 401


def test_letterboxd_unlink_nominal():
    response = client.delete("/letterboxd/unlink", headers=AUTH_HEADERS)
    assert response.status_code == 200
    assert response.json() == {"unlinked": True}


def test_letterboxd_unlink_requires_auth():
    response = client.delete("/letterboxd/unlink")
    assert response.status_code == 401


TAG_RECOMMEND = "recommend"  # not asserted on; just documents the route's tag


def test_watchlist_returns_bucketed_films(monkeypatch):
    films = [
        _film("a", genres=["35"], runtime=80, year=1925, origin_country=["FR"]),
        _film("b", genres=["27"], runtime=None, year=None, origin_country=[]),
    ]
    monkeypatch.setattr(watchlist_repo, "get_active_watchlist", lambda user_id: films)
    monkeypatch.setattr(
        watch_history_repo,
        "get_decision_history",
        lambda user_id: {"a": datetime(2026, 1, 1, tzinfo=UTC)},
    )

    response = client.get("/watchlist", headers=AUTH_HEADERS)

    assert response.status_code == 200
    data = response.json()["films"]
    assert data[0] == {
        "id": "a",
        "genres": ["35"],
        "duration": "lt90",
        "era": "silent",
        "origin_country": ["FR"],
        "last_proposed_at": "2026-01-01T00:00:00Z",
    }
    assert data[1]["duration"] is None
    assert data[1]["era"] is None
    assert data[1]["last_proposed_at"] is None


def test_watchlist_requires_auth(monkeypatch):
    monkeypatch.setattr(watchlist_repo, "get_active_watchlist", lambda user_id: [])
    monkeypatch.setattr(watch_history_repo, "get_decision_history", lambda user_id: {})
    response = client.get("/watchlist")
    assert response.status_code == 401


def _film(id: str, **overrides) -> WatchlistFilm:
    defaults = dict(
        letterboxd_slug=id, title=f"Film {id}", year=2020, poster_url="http://x/p.jpg",
        genres=["35"], runtime=100, origin_country=["US"], overview="A synopsis.",
        added_at=datetime(2026, 1, 1, tzinfo=UTC),
    )
    return WatchlistFilm(id=id, **{**defaults, **overrides})


RECOMMEND_BODY = {
    "genre": ["none"], "emotion": ["Zen"], "ambiance": ["none"], "withWho": "any",
    "duration": "any", "era": "any", "region": ["none"], "subtitles": "any", "seen": "any",
}


def _patch_recommend(monkeypatch, *, films=None, history=None, ranked=None, ai_raises=None):
    monkeypatch.setattr(watchlist_repo, "get_active_watchlist", lambda user_id: films or [])
    monkeypatch.setattr(watch_history_repo, "get_decision_history", lambda user_id: history or {})
    recorded = []
    monkeypatch.setattr(
        watch_history_repo,
        "record_proposals",
        lambda user_id, session_id, ranked, ctx: recorded.append(
            (user_id, session_id, ranked, ctx)
        ),
    )

    async def fake_pick_candidates(candidates, answers):
        if ai_raises is not None:
            raise ai_raises
        return ranked or [
            RankedCandidate(film=candidates[0], rank=1, match_score=80, critique="Nice.")
        ]

    monkeypatch.setattr(reco_ai, "pick_candidates", fake_pick_candidates)
    return recorded


def test_recommend_current_returns_404_when_nothing_pending(monkeypatch):
    monkeypatch.setattr(watch_history_repo, "get_pending_session", lambda user_id: None)

    response = client.get("/recommend/current", headers=AUTH_HEADERS)

    assert response.status_code == 404
    assert response.json()["detail"]["type"] == "no_pending_session"


def test_recommend_current_returns_pending_candidates(monkeypatch):
    rows = [
        {
            "film_id": "b",
            "rank": 1,
            "match_score": 88,
            "ai_critique": "Belle pioche.",
            "questions_context": RECOMMEND_BODY,
            "films": {
                "tmdb_id": 238,
                "title": "Film b",
                "poster_url": "http://x/p.jpg",
                "year": 2020,
                "runtime": 100,
                "overview": "A synopsis.",
                "genres": ["35"],
                "origin_country": ["US"],
                "director": None,
                "actors": None,
            },
        }
    ]
    monkeypatch.setattr(
        watch_history_repo, "get_pending_session", lambda user_id: ("session-1", rows)
    )

    response = client.get("/recommend/current", headers=AUTH_HEADERS)

    assert response.status_code == 200
    data = response.json()
    assert data["recommendation_session_id"] == "session-1"
    assert data["meta"]["candidates_considered"] == 1
    assert data["candidates"] == [
        {
            "film_id": "b",
            "tmdb_id": 238,
            "title": "Film b",
            "poster_url": "http://x/p.jpg",
            "year": 2020,
            "runtime": 100,
            "overview": "A synopsis.",
            "genres": ["35"],
            "origin_country": ["US"],
            "director": None,
            "actors": [],
            "rank": 1,
            "match_score": 88,
            "critique": "Belle pioche.",
        }
    ]
    assert data["answers"] == RECOMMEND_BODY


def test_recommend_calls_ai_even_with_two_candidates(monkeypatch):
    films = [_film("a"), _film("b")]
    chosen = RankedCandidate(film=films[1], rank=1, match_score=88, critique="Belle pioche.")
    recorded = _patch_recommend(monkeypatch, films=films, ranked=[chosen])

    response = client.post("/recommend", json=RECOMMEND_BODY, headers=AUTH_HEADERS)

    assert response.status_code == 200
    data = response.json()
    assert data["candidates"] == [
        {
            "film_id": "b",
            "tmdb_id": None,
            "title": "Film b",
            "poster_url": "http://x/p.jpg",
            "year": 2020,
            "runtime": 100,
            "overview": "A synopsis.",
            "genres": ["35"],
            "origin_country": ["US"],
            "director": None,
            "actors": [],
            "rank": 1,
            "match_score": 88,
            "critique": "Belle pioche.",
        }
    ]
    assert data["meta"]["candidates_considered"] == 2
    assert [r.film.id for r in recorded[0][2]] == ["b"]
    assert data["recommendation_session_id"] == recorded[0][1]


def test_recommend_calls_ai_with_more_than_three_candidates(monkeypatch):
    films = [_film(str(i)) for i in range(4)]
    chosen = RankedCandidate(film=films[2], rank=1, match_score=95, critique="Top pick.")
    recorded = _patch_recommend(monkeypatch, films=films, ranked=[chosen])

    response = client.post("/recommend", json=RECOMMEND_BODY, headers=AUTH_HEADERS)

    assert response.status_code == 200
    data = response.json()
    assert len(data["candidates"]) == 1
    assert data["candidates"][0]["match_score"] == 95
    assert data["candidates"][0]["critique"] == "Top pick."
    assert [r.film.id for r in recorded[0][2]] == ["2"]  # matches what was returned


def test_recommend_empty_watchlist(monkeypatch):
    _patch_recommend(monkeypatch, films=[])

    response = client.post("/recommend", json=RECOMMEND_BODY, headers=AUTH_HEADERS)

    assert response.status_code == 422
    assert response.json()["detail"]["type"] == "empty_watchlist"


def test_recommend_rate_limited_after_allowance(monkeypatch):
    # Empty watchlist = cheapest path through the route; each call still counts.
    _patch_recommend(monkeypatch, films=[])
    for _ in range(20):
        response = client.post("/recommend", json=RECOMMEND_BODY, headers=AUTH_HEADERS)
        assert response.status_code == 422

    response = client.post("/recommend", json=RECOMMEND_BODY, headers=AUTH_HEADERS)

    assert response.status_code == 429
    assert response.json()["detail"]["type"] == "rate_limited"
    assert int(response.headers["Retry-After"]) > 0


def test_recommend_no_candidates(monkeypatch):
    film = _film("a", genres=["27"])
    _patch_recommend(monkeypatch, films=[film])

    body = {**RECOMMEND_BODY, "genre": ["35"]}
    response = client.post("/recommend", json=body, headers=AUTH_HEADERS)

    assert response.status_code == 422
    assert response.json()["detail"]["type"] == "no_candidates"


def test_recommend_ai_error(monkeypatch):
    films = [_film(str(i)) for i in range(4)]
    _patch_recommend(monkeypatch, films=films, ai_raises=reco_ai.AIProviderError("boom"))

    response = client.post("/recommend", json=RECOMMEND_BODY, headers=AUTH_HEADERS)

    assert response.status_code == 502
    assert response.json()["detail"]["type"] == "ai_error"


def test_recommend_requires_auth(monkeypatch):
    _patch_recommend(monkeypatch, films=[_film("a")])
    response = client.post("/recommend", json=RECOMMEND_BODY)
    assert response.status_code == 401


DECISION_BODY = {
    "recommendation_session_id": "session-1",
    "film_id": "film-a",
    "decision": "accepted",
    "match_score": 80,
    "critique": "Nice.",
}


def test_recommend_decision_records_when_proposal_exists(monkeypatch):
    monkeypatch.setattr(watch_history_repo, "record_decision", lambda *a, **k: True)

    response = client.post("/recommend/decision", json=DECISION_BODY, headers=AUTH_HEADERS)

    assert response.status_code == 200


def test_recommend_decision_404_when_no_matching_proposal(monkeypatch):
    monkeypatch.setattr(watch_history_repo, "record_decision", lambda *a, **k: False)

    response = client.post("/recommend/decision", json=DECISION_BODY, headers=AUTH_HEADERS)

    assert response.status_code == 404
    assert response.json()["detail"]["type"] == "unknown_candidate"


def test_recommend_decision_requires_auth(monkeypatch):
    monkeypatch.setattr(watch_history_repo, "record_decision", lambda *a, **k: True)
    response = client.post("/recommend/decision", json=DECISION_BODY)
    assert response.status_code == 401


def test_recommend_decision_null_score_and_critique_allowed(monkeypatch):
    """Short-circuit candidates have no score/critique — decision must
    still be recordable."""
    monkeypatch.setattr(watch_history_repo, "record_decision", lambda *a, **k: True)
    body = {
        "recommendation_session_id": "session-1",
        "film_id": "film-a",
        "decision": "skipped",
        "match_score": None,
        "critique": None,
    }

    response = client.post("/recommend/decision", json=body, headers=AUTH_HEADERS)

    assert response.status_code == 200


def test_recommend_current_abandon_marks_remaining_as_skipped(monkeypatch):
    calls = []
    monkeypatch.setattr(
        watch_history_repo,
        "abandon_session",
        lambda user_id, session_id: calls.append((user_id, session_id)),
    )

    response = client.post(
        "/recommend/current/abandon",
        json={"recommendation_session_id": "session-1"},
        headers=AUTH_HEADERS,
    )

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    assert len(calls) == 1
    assert calls[0][1] == "session-1"


def test_recommend_current_abandon_requires_auth(monkeypatch):
    monkeypatch.setattr(watch_history_repo, "abandon_session", lambda *a, **k: None)

    response = client.post(
        "/recommend/current/abandon", json={"recommendation_session_id": "session-1"}
    )

    assert response.status_code == 401


def test_films_watch_providers_nominal(monkeypatch):
    async def fake(tmdb_id, **kwargs):
        assert tmdb_id == 238
        return WatchProvidersResponse(
            providers=[
                WatchProvider(
                    provider_id=8,
                    name="Netflix",
                    logo_url="https://image.tmdb.org/t/p/w92/x.png",
                    category="subscription",
                    ads=False,
                )
            ],
            link="https://www.themoviedb.org/movie/238-the-godfather/watch?locale=FR",
        )

    monkeypatch.setattr(watch_providers, "get_watch_providers", fake)

    response = client.get("/films/238/watch-providers", headers=AUTH_HEADERS)

    assert response.status_code == 200
    body = response.json()
    assert body["providers"][0]["name"] == "Netflix"
    assert body["link"].endswith("locale=FR")


def test_films_watch_providers_empty_is_200(monkeypatch):
    async def fake(tmdb_id, **kwargs):
        return WatchProvidersResponse(providers=[], link=None)

    monkeypatch.setattr(watch_providers, "get_watch_providers", fake)

    response = client.get("/films/999/watch-providers", headers=AUTH_HEADERS)

    assert response.status_code == 200
    assert response.json() == {"providers": [], "link": None}


def test_films_watch_providers_tmdb_failure_is_502(monkeypatch):
    async def fake(tmdb_id, **kwargs):
        raise httpx.ConnectTimeout("timed out")

    monkeypatch.setattr(watch_providers, "get_watch_providers", fake)

    response = client.get("/films/238/watch-providers", headers=AUTH_HEADERS)

    assert response.status_code == 502


def test_films_watch_providers_internal_bug_is_500_not_502(monkeypatch):
    """A bug inside `get_watch_providers` itself (not a TMDB/network issue)
    must not be mislabeled as "TMDB is down" — it should surface as a plain
    500 via `CatchAllMiddleware`, so it's visible in logs as a real bug."""

    async def fake(tmdb_id, **kwargs):
        raise RuntimeError("boom")

    monkeypatch.setattr(watch_providers, "get_watch_providers", fake)

    response = client.get("/films/238/watch-providers", headers=AUTH_HEADERS)

    assert response.status_code == 500


def test_films_watch_providers_requires_auth(monkeypatch):
    monkeypatch.setattr(
        watch_providers, "get_watch_providers", lambda *a, **k: WatchProvidersResponse(
            providers=[], link=None
        )
    )

    response = client.get("/films/238/watch-providers")

    assert response.status_code == 401


def test_films_rating_nominal(monkeypatch):
    async def fake(tmdb_id, **kwargs):
        assert tmdb_id == 238
        return RatingResponse(vote_average=8.7)

    monkeypatch.setattr(tmdb_rating, "get_rating", fake)

    response = client.get("/films/238/rating", headers=AUTH_HEADERS)

    assert response.status_code == 200
    assert response.json() == {"vote_average": 8.7}


def test_films_rating_no_votes_is_200(monkeypatch):
    async def fake(tmdb_id, **kwargs):
        return RatingResponse(vote_average=None)

    monkeypatch.setattr(tmdb_rating, "get_rating", fake)

    response = client.get("/films/999/rating", headers=AUTH_HEADERS)

    assert response.status_code == 200
    assert response.json() == {"vote_average": None}


def test_films_rating_tmdb_failure_is_502(monkeypatch):
    async def fake(tmdb_id, **kwargs):
        raise httpx.ConnectTimeout("timed out")

    monkeypatch.setattr(tmdb_rating, "get_rating", fake)

    response = client.get("/films/238/rating", headers=AUTH_HEADERS)

    assert response.status_code == 502


def test_films_rating_internal_bug_is_500_not_502(monkeypatch):
    """A bug inside `get_rating` itself (not a TMDB/network issue) must not
    be mislabeled as "TMDB is down" — it should surface as a plain 500 via
    `CatchAllMiddleware`, so it's visible in logs as a real bug."""

    async def fake(tmdb_id, **kwargs):
        raise RuntimeError("boom")

    monkeypatch.setattr(tmdb_rating, "get_rating", fake)

    response = client.get("/films/238/rating", headers=AUTH_HEADERS)

    assert response.status_code == 500


def test_films_rating_requires_auth(monkeypatch):
    monkeypatch.setattr(
        tmdb_rating, "get_rating", lambda *a, **k: RatingResponse(vote_average=8.7)
    )

    response = client.get("/films/238/rating")

    assert response.status_code == 401


def test_auth_unreachable_returns_503(monkeypatch):
    """A network failure reaching Supabase auth says nothing about the token —
    it must not surface as 401 "Invalid token" (CIN-125)."""

    def fake_get_user(jwt):
        raise httpx.ReadTimeout("The read operation timed out")

    monkeypatch.setattr(main_module.supabase.auth, "get_user", fake_get_user)

    response = client.get("/watchlist", headers=AUTH_HEADERS)

    assert response.status_code == 503
    assert response.json()["detail"] == "Auth service unavailable"


def test_auth_rejected_token_returns_401(monkeypatch):
    def fake_get_user(jwt):
        raise AuthApiError("invalid JWT", 403, "bad_jwt")

    monkeypatch.setattr(main_module.supabase.auth, "get_user", fake_get_user)

    response = client.get("/watchlist", headers=AUTH_HEADERS)

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid token"
