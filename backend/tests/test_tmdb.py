import pytest
import httpx
import respx
from unittest.mock import patch
from tmdb import enrich_film

SEARCH_RESPONSE = {
    "results": [
        {
            "id": 975322,
            "title": "Past Lives",
            "poster_path": "/path/to/poster.jpg",
            "overview": "Nora and Hae Sung reconnect.",
        }
    ]
}

DETAIL_RESPONSE = {
    "id": 975322,
    "genres": [{"id": 18, "name": "Drame"}, {"id": 10749, "name": "Romance"}],
    "runtime": 106,
    "overview": "Nora and Hae Sung reconnect.",
    "poster_path": "/path/to/poster.jpg",
    "watch/providers": {
        "results": {
            "FR": {
                "flatrate": [
                    {"provider_id": 11, "provider_name": "MUBI"},
                ]
            }
        }
    },
}

EMPTY_SEARCH_RESPONSE = {"results": []}


@pytest.mark.asyncio
@respx.mock
async def test_enrich_film_success():
    with patch.dict("os.environ", {"TMDB_API_KEY": "fake_key"}):
        respx.get("https://api.themoviedb.org/3/search/movie").mock(
            return_value=httpx.Response(200, json=SEARCH_RESPONSE)
        )
        respx.get("https://api.themoviedb.org/3/movie/975322").mock(
            return_value=httpx.Response(200, json=DETAIL_RESPONSE)
        )

        result = await enrich_film("Past Lives", "2023")

    assert result["tmdb_id"] == 975322
    assert result["genres"] == ["Drame", "Romance"]
    assert result["runtime"] == 106
    assert result["providers_fr"] == ["MUBI"]
    assert result["poster_url"] == "https://image.tmdb.org/t/p/w500/path/to/poster.jpg"
    assert result["tmdb_url"] == "https://www.themoviedb.org/movie/975322"
    assert result["overview"] == "Nora and Hae Sung reconnect."


@pytest.mark.asyncio
@respx.mock
async def test_enrich_film_not_found():
    with patch.dict("os.environ", {"TMDB_API_KEY": "fake_key"}):
        respx.get("https://api.themoviedb.org/3/search/movie").mock(
            return_value=httpx.Response(200, json=EMPTY_SEARCH_RESPONSE)
        )

        result = await enrich_film("Film Inexistant XYZ", "1900")

    assert result["tmdb_id"] is None
    assert result["poster_url"] is None
    assert result["genres"] == []
    assert result["providers_fr"] == []


@pytest.mark.asyncio
@respx.mock
async def test_enrich_film_network_error():
    with patch.dict("os.environ", {"TMDB_API_KEY": "fake_key"}):
        respx.get("https://api.themoviedb.org/3/search/movie").mock(
            side_effect=httpx.ConnectError("connection refused")
        )

        result = await enrich_film("Past Lives", "2023")

    assert result["tmdb_id"] is None


@pytest.mark.asyncio
@respx.mock
async def test_enrich_film_no_providers():
    detail_no_providers = {**DETAIL_RESPONSE, "watch/providers": {"results": {}}}

    with patch.dict("os.environ", {"TMDB_API_KEY": "fake_key"}):
        respx.get("https://api.themoviedb.org/3/search/movie").mock(
            return_value=httpx.Response(200, json=SEARCH_RESPONSE)
        )
        respx.get("https://api.themoviedb.org/3/movie/975322").mock(
            return_value=httpx.Response(200, json=detail_no_providers)
        )

        result = await enrich_film("Past Lives", "2023")

    assert result["providers_fr"] == []
    assert result["tmdb_id"] == 975322
