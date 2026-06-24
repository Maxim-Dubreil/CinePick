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


def _patch_count(monkeypatch, *, returns=None, raises=None):
    async def fake(username, **kwargs):
        if raises is not None:
            raise raises
        return returns

    monkeypatch.setattr(scraper, "get_watchlist_count", fake)


def test_watchlist_count_nominal(monkeypatch):
    _patch_count(monkeypatch, returns=602)
    response = client.get("/watchlist/count", params={"username": "dave"})
    assert response.status_code == 200
    assert response.json() == {"username": "dave", "count": 602}


def test_watchlist_count_profile_not_found(monkeypatch):
    _patch_count(monkeypatch, raises=scraper.ProfileNotFoundError("ghost"))
    response = client.get("/watchlist/count", params={"username": "ghost"})
    assert response.status_code == 404


def test_watchlist_count_private(monkeypatch):
    _patch_count(monkeypatch, raises=scraper.WatchlistPrivateError("secretive"))
    response = client.get("/watchlist/count", params={"username": "secretive"})
    assert response.status_code == 403


def test_watchlist_count_scrape_error(monkeypatch):
    _patch_count(monkeypatch, raises=scraper.WatchlistScrapeError("boom"))
    response = client.get("/watchlist/count", params={"username": "dave"})
    assert response.status_code == 502


def test_watchlist_count_requires_username():
    response = client.get("/watchlist/count")
    assert response.status_code == 422
