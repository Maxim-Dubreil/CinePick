from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient

import reco_ai
import scraper
import tmdb
from main import app
from models import Film, RankedCandidate, WatchlistFilm
from repositories import watch_history as watch_history_repo
from repositories import watchlist as watchlist_repo

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
def test_health_ready_endpoint(require_integration):
    response = client.get("/health/ready")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"
    assert data["checks"]["database"] == "ok"


def _patch_validate(monkeypatch, *, returns=None, raises=None):
    async def fake(username, **kwargs):
        if raises is not None:
            raise raises
        return returns

    monkeypatch.setattr(scraper, "get_watchlist_count", fake)


def test_letterboxd_validate_nominal(monkeypatch):
    _patch_validate(monkeypatch, returns=602)
    response = client.get("/letterboxd/validate", params={"username": "dave"})
    assert response.status_code == 200
    assert response.json() == {"username": "dave", "count": 602}


def test_letterboxd_validate_profile_not_found(monkeypatch):
    _patch_validate(monkeypatch, raises=scraper.ProfileNotFoundError("ghost"))
    response = client.get("/letterboxd/validate", params={"username": "ghost"})
    assert response.status_code == 404


def test_letterboxd_validate_private(monkeypatch):
    _patch_validate(monkeypatch, raises=scraper.WatchlistPrivateError("secretive"))
    response = client.get("/letterboxd/validate", params={"username": "secretive"})
    assert response.status_code == 403


def test_letterboxd_validate_scrape_error(monkeypatch):
    _patch_validate(monkeypatch, raises=scraper.WatchlistScrapeError("boom"))
    response = client.get("/letterboxd/validate", params={"username": "dave"})
    assert response.status_code == 502


def test_letterboxd_validate_requires_username():
    response = client.get("/letterboxd/validate")
    assert response.status_code == 422


AUTH_HEADERS = {"Authorization": "Bearer test-token"}


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


TAG_RECOMMEND = "recommend"  # not asserted on; just documents the route's tag


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
        lambda user_id, film_ids, ctx: recorded.append((user_id, film_ids, ctx)),
    )

    async def fake_pick_candidates(candidates, answers):
        if ai_raises is not None:
            raise ai_raises
        return ranked or [
            RankedCandidate(film=candidates[0], rank=1, match_score=80, critique="Nice.")
        ]

    monkeypatch.setattr(reco_ai, "pick_candidates", fake_pick_candidates)
    return recorded


def test_recommend_short_circuits_with_three_or_fewer_candidates(monkeypatch):
    films = [
        _film("a", added_at=datetime(2026, 1, 2, tzinfo=UTC)),
        _film("b", added_at=datetime(2026, 1, 1, tzinfo=UTC)),
    ]
    recorded = _patch_recommend(monkeypatch, films=films)

    response = client.post("/recommend", json=RECOMMEND_BODY, headers=AUTH_HEADERS)

    assert response.status_code == 200
    data = response.json()
    assert [c["title"] for c in data["candidates"]] == ["Film b", "Film a"]  # oldest first
    assert all(c["match_score"] is None and c["critique"] is None for c in data["candidates"])
    assert data["meta"]["candidates_considered"] == 2
    assert recorded[0][1] == ["b", "a"]  # proposals recorded in the order returned


def test_recommend_calls_ai_with_more_than_three_candidates(monkeypatch):
    films = [_film(str(i)) for i in range(4)]
    chosen = RankedCandidate(film=films[2], rank=1, match_score=95, critique="Top pick.")
    _patch_recommend(monkeypatch, films=films, ranked=[chosen])

    response = client.post("/recommend", json=RECOMMEND_BODY, headers=AUTH_HEADERS)

    assert response.status_code == 200
    data = response.json()
    assert len(data["candidates"]) == 1
    assert data["candidates"][0]["match_score"] == 95
    assert data["candidates"][0]["critique"] == "Top pick."


def test_recommend_empty_watchlist(monkeypatch):
    _patch_recommend(monkeypatch, films=[])

    response = client.post("/recommend", json=RECOMMEND_BODY, headers=AUTH_HEADERS)

    assert response.status_code == 422
    assert response.json()["detail"]["type"] == "empty_watchlist"


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
