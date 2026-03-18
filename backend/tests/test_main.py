import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from main import app
from scraper import ScraperError

client = TestClient(app)

RAW_FILMS = [
    {"title": "Past Lives", "year": "2023", "slug": "past-lives"},
    {"title": "Aftersun", "year": "2022", "slug": "aftersun"},
]

TMDB_ENRICHED = {
    "poster_url": "https://image.tmdb.org/t/p/w500/poster.jpg",
    "overview": "A beautiful film.",
    "tmdb_id": 975322,
    "genres": ["Drame", "Romance"],
    "runtime": 106,
    "providers_fr": ["MUBI"],
    "tmdb_url": "https://www.themoviedb.org/movie/975322",
}


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_watchlist_success():
    with patch("main.scrape_watchlist", new=AsyncMock(return_value=RAW_FILMS)), \
         patch("main.enrich_film", new=AsyncMock(return_value=TMDB_ENRICHED)):

        response = client.get("/watchlist/testuser")

    assert response.status_code == 200
    data = response.json()
    assert data["count"] == 2
    assert data["films"][0]["title"] == "Past Lives"
    assert data["films"][0]["genres"] == ["Drame", "Romance"]
    assert data["films"][0]["providers"] == ["MUBI"]
    assert data["films"][1]["title"] == "Aftersun"


def test_watchlist_not_found():
    with patch("main.scrape_watchlist", new=AsyncMock(
        side_effect=ScraperError("not_found", "User 'nobody' not found.")
    )):
        response = client.get("/watchlist/nobody")

    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_watchlist_private():
    with patch("main.scrape_watchlist", new=AsyncMock(
        side_effect=ScraperError("private", "Watchlist is private.")
    )):
        response = client.get("/watchlist/privateuser")

    assert response.status_code == 403


def test_watchlist_network_error():
    with patch("main.scrape_watchlist", new=AsyncMock(
        side_effect=ScraperError("network", "Connection refused.")
    )):
        response = client.get("/watchlist/testuser")

    assert response.status_code == 502


def test_no_recommend_endpoint():
    response = client.post("/recommend", json={})
    assert response.status_code == 404
