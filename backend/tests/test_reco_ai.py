"""Tests for the AI recommendation proxy (CIN-49).

`_call_gemini` is the only function that touches the real SDK — every test
here monkeypatches it, mirroring how `tmdb.py` isolates its network calls
behind small functions for testability.
"""

import pytest

import reco_ai
from models import RecommendRequest, WatchlistFilm


def _film(id: str, **overrides) -> WatchlistFilm:
    defaults = dict(
        letterboxd_slug=id, title=f"Film {id}", year=2020, poster_url=None,
        genres=["35"], runtime=100, origin_country=["US"], overview=None,
    )
    return WatchlistFilm(id=id, **{**defaults, **overrides})


def _answers() -> RecommendRequest:
    return RecommendRequest(
        genre=["none"], emotion=["Zen"], ambiance=["none"], withWho="any",
        duration="any", era="any", region=["none"], subtitles="any", seen="any",
    )


async def test_pick_film_returns_matching_candidate(monkeypatch):
    candidates = [_film("a"), _film("b")]

    async def fake_call(prompt: str) -> str:
        return '{"film_id": "b"}'

    monkeypatch.setattr(reco_ai, "_call_gemini", fake_call)

    result = await reco_ai.pick_film(candidates, _answers())

    assert result.id == "b"


async def test_pick_film_rejects_id_outside_candidates(monkeypatch):
    candidates = [_film("a")]

    async def fake_call(prompt: str) -> str:
        return '{"film_id": "not-a-candidate"}'

    monkeypatch.setattr(reco_ai, "_call_gemini", fake_call)

    with pytest.raises(reco_ai.AIProviderError):
        await reco_ai.pick_film(candidates, _answers())


async def test_pick_film_rejects_malformed_response(monkeypatch):
    candidates = [_film("a")]

    async def fake_call(prompt: str) -> str:
        return "not json at all"

    monkeypatch.setattr(reco_ai, "_call_gemini", fake_call)

    with pytest.raises(reco_ai.AIProviderError):
        await reco_ai.pick_film(candidates, _answers())


async def test_pick_film_propagates_call_failure_as_ai_error(monkeypatch):
    candidates = [_film("a")]

    async def fake_call(prompt: str) -> str:
        raise TimeoutError("boom")

    monkeypatch.setattr(reco_ai, "_call_gemini", fake_call)

    with pytest.raises(reco_ai.AIProviderError):
        await reco_ai.pick_film(candidates, _answers())
