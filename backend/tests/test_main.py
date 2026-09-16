import pytest
from fastapi.testclient import TestClient

import reco_ai
import scraper
import tmdb
from main import app
from models import Film, WatchlistFilm
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
    )
    return WatchlistFilm(id=id, **{**defaults, **overrides})


RECOMMEND_BODY = {
    "genre": ["none"], "emotion": ["Zen"], "ambiance": ["none"], "withWho": "any",
    "duration": "any", "era": "any", "region": ["none"], "subtitles": "any", "seen": "any",
}


def _patch_recommend(monkeypatch, *, films=None, excluded=None, chosen=None, ai_raises=None):
    monkeypatch.setattr(watchlist_repo, "get_active_watchlist", lambda user_id: films or [])
    monkeypatch.setattr(
        watch_history_repo, "get_excluded_film_ids", lambda user_id: excluded or set()
    )

    async def fake_pick_film(candidates, answers):
        if ai_raises is not None:
            raise ai_raises
        return chosen or candidates[0]

    monkeypatch.setattr(reco_ai, "pick_film", fake_pick_film)


def test_recommend_nominal(monkeypatch):
    film = _film("a")
    _patch_recommend(monkeypatch, films=[film], chosen=film)

    response = client.post("/recommend", json=RECOMMEND_BODY, headers=AUTH_HEADERS)

    assert response.status_code == 200
    data = response.json()["film"]
    assert data["title"] == "Film a"
    assert data["overview"] == "A synopsis."
    assert data["genres"] == ["35"]


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
    film = _film("a")
    _patch_recommend(monkeypatch, films=[film], ai_raises=reco_ai.AIProviderError("boom"))

    response = client.post("/recommend", json=RECOMMEND_BODY, headers=AUTH_HEADERS)

    assert response.status_code == 502
    assert response.json()["detail"]["type"] == "ai_error"


def test_recommend_requires_auth(monkeypatch):
    _patch_recommend(monkeypatch, films=[_film("a")])
    response = client.post("/recommend", json=RECOMMEND_BODY)
    assert response.status_code == 401
