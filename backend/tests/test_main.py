import pytest
from fastapi.testclient import TestClient

import scraper
from main import app

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


def test_watchlist_sync_nominal(monkeypatch):
    _patch_validate(monkeypatch, returns=42)
    response = client.post(
        "/watchlist/sync", json={"username": "cinephile"}, headers=AUTH_HEADERS
    )
    assert response.status_code == 200
    data = response.json()
    assert data["count"] == 42
    assert "synced_at" in data


def test_watchlist_sync_missing_username():
    response = client.post("/watchlist/sync", json={}, headers=AUTH_HEADERS)
    assert response.status_code == 422


def test_watchlist_sync_empty_username():
    response = client.post(
        "/watchlist/sync", json={"username": ""}, headers=AUTH_HEADERS
    )
    assert response.status_code == 422


def test_watchlist_sync_requires_auth():
    response = client.post("/watchlist/sync", json={"username": "cinephile"})
    assert response.status_code == 401
