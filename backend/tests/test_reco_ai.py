"""Tests for the AI recommendation proxy (CIN-49/CIN-78).

`_call_gemini` is the only function that touches the real SDK — every test
here monkeypatches it.
"""

import json

import pytest

import reco_ai
from models import RecommendRequest, WatchlistFilm


def _film(id: str, **overrides) -> WatchlistFilm:
    from datetime import UTC, datetime

    defaults = dict(
        letterboxd_slug=id, title=f"Film {id}", year=2020, poster_url=None,
        genres=["35"], runtime=100, origin_country=["US"], overview=None,
        added_at=datetime(2026, 1, 1, tzinfo=UTC),
    )
    return WatchlistFilm(id=id, **{**defaults, **overrides})


def _answers() -> RecommendRequest:
    return RecommendRequest(
        genre=["none"], emotion=["Zen"], ambiance=["none"], withWho="any",
        duration="any", era="any", region=["none"], subtitles="any", seen="any",
    )


def _gemini_response(candidates: list[dict]) -> str:
    return json.dumps({"candidates": candidates})


def test_build_prompt_instructs_a_french_critique():
    prompt = reco_ai._build_prompt([_film("a")], _answers())

    assert "french" in prompt.lower()


def test_build_prompt_tags_saga_with_order_and_total():
    film = _film("a", collection_name="The Saga", collection_order=2, collection_total=4)

    prompt = reco_ai._build_prompt([film], _answers())

    assert "[Saga: The Saga — 2/4]" in prompt


def test_build_prompt_tags_saga_name_only_when_order_unknown():
    film = _film("a", collection_name="The Saga")

    prompt = reco_ai._build_prompt([film], _answers())

    assert "[Saga: The Saga]" in prompt
    assert "—" not in prompt


def test_build_prompt_has_no_saga_tag_when_film_has_none():
    prompt = reco_ai._build_prompt([_film("a")], _answers())

    assert prompt.endswith("- id=a | Film a (2020) | no synopsis")


async def test_pick_candidates_returns_ranked_matching_candidates(monkeypatch):
    candidates = [_film("a"), _film("b"), _film("c")]

    async def fake_call(prompt: str) -> str:
        return _gemini_response(
            [
                {"film_id": "b", "rank": 1, "match_score": 90, "critique": "Great fit."},
                {"film_id": "a", "rank": 2, "match_score": 70, "critique": "Also good."},
            ]
        )

    monkeypatch.setattr(reco_ai, "_call_gemini", fake_call)

    result = await reco_ai.pick_candidates(candidates, _answers())

    assert [r.film.id for r in result] == ["b", "a"]
    assert result[0].rank == 1
    assert result[0].match_score == 90
    assert result[0].critique == "Great fit."


async def test_pick_candidates_rejects_any_id_outside_candidates(monkeypatch):
    candidates = [_film("a")]

    async def fake_call(prompt: str) -> str:
        return _gemini_response(
            [
                {"film_id": "a", "rank": 1, "match_score": 90, "critique": "Great fit."},
                {"film_id": "not-a-candidate", "rank": 2, "match_score": 50, "critique": "..."},
            ]
        )

    monkeypatch.setattr(reco_ai, "_call_gemini", fake_call)

    with pytest.raises(reco_ai.AIProviderError):
        await reco_ai.pick_candidates(candidates, _answers())


async def test_pick_candidates_rejects_duplicate_film_ids(monkeypatch):
    candidates = [_film("a"), _film("b")]

    async def fake_call(prompt: str) -> str:
        return _gemini_response(
            [
                {"film_id": "a", "rank": 1, "match_score": 90, "critique": "Great fit."},
                {"film_id": "a", "rank": 2, "match_score": 80, "critique": "Also great."},
            ]
        )

    monkeypatch.setattr(reco_ai, "_call_gemini", fake_call)

    with pytest.raises(reco_ai.AIProviderError):
        await reco_ai.pick_candidates(candidates, _answers())


async def test_pick_candidates_rejects_empty_candidate_list(monkeypatch):
    candidates = [_film("a")]

    async def fake_call(prompt: str) -> str:
        return _gemini_response([])

    monkeypatch.setattr(reco_ai, "_call_gemini", fake_call)

    with pytest.raises(reco_ai.AIProviderError):
        await reco_ai.pick_candidates(candidates, _answers())


async def test_pick_candidates_rejects_malformed_response(monkeypatch):
    candidates = [_film("a")]

    async def fake_call(prompt: str) -> str:
        return "not json at all"

    monkeypatch.setattr(reco_ai, "_call_gemini", fake_call)

    with pytest.raises(reco_ai.AIProviderError):
        await reco_ai.pick_candidates(candidates, _answers())


async def test_pick_candidates_propagates_call_failure_as_ai_error(monkeypatch):
    candidates = [_film("a")]

    async def fake_call(prompt: str) -> str:
        raise TimeoutError("boom")

    monkeypatch.setattr(reco_ai, "_call_gemini", fake_call)

    with pytest.raises(reco_ai.AIProviderError):
        await reco_ai.pick_candidates(candidates, _answers())
