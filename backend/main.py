import logging
import time
from datetime import UTC, datetime
from uuid import uuid4

from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response

import filtering
import reco_ai
import scraper
import tmdb
from models import (
    RankedCandidate,
    RecommendDecisionRequest,
    RecommendRequest,
    WatchlistFilterResponse,
)
from repositories import watch_history as watch_history_repo
from repositories import watchlist as watchlist_repo
from supabase_client import supabase

logger = logging.getLogger(__name__)

app = FastAPI(title="CinePick API", version="0.1.0")

TAG_HEALTH = "health"
TAG_LETTERBOXD = "letterboxd"
TAG_RECOMMEND = "recommend"


class CatchAllMiddleware(BaseHTTPMiddleware):
    """Turn any uncaught error into a normal JSON response.

    A plain `@app.exception_handler(Exception)` is wired by FastAPI to
    Starlette's outermost ServerErrorMiddleware, which sits *above*
    CORSMiddleware — its response never gets CORS headers, so the browser
    reports a misleading 'blocked by CORS policy' error that hides the real
    500. Catching here instead (added below CORSMiddleware) keeps the error
    response inside the CORS layer.
    """

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        try:
            return await call_next(request)
        except Exception:
            logger.exception("Unhandled error on %s %s", request.method, request.url.path)
            return JSONResponse(status_code=500, content={"detail": "Internal server error"})


# Middleware order matters: the last one added wraps the others, so
# CORSMiddleware (added last) must stay outermost to decorate every
# response — including the 500s CatchAllMiddleware produces below it.
app.add_middleware(CatchAllMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Auth dependency
# ---------------------------------------------------------------------------

_bearer = HTTPBearer(auto_error=False)


async def get_current_user_id(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> str:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Missing authorization token")
    try:
        response = supabase.auth.get_user(credentials.credentials)
        if response is None or response.user is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return str(response.user.id)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


class RootResponse(BaseModel):
    message: str


@app.get("/", response_model=RootResponse, tags=[TAG_HEALTH])
async def root():
    return {"message": "CinePick API is running"}


class HealthResponse(BaseModel):
    status: str


@app.get("/health", response_model=HealthResponse, tags=[TAG_HEALTH])
async def health():
    return {"status": "ok"}


class ReadyResponse(BaseModel):
    status: str
    checks: dict[str, str]


@app.get("/health/ready", response_model=ReadyResponse, tags=[TAG_HEALTH])
async def health_ready():
    try:
        supabase.table("users").select("id").limit(1).execute()
        return {"status": "ready", "checks": {"database": "ok"}}
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail={"status": "not_ready", "error": str(e)},
        ) from e


class LetterboxdValidateResponse(BaseModel):
    username: str
    count: int


@app.get(
    "/letterboxd/validate",
    response_model=LetterboxdValidateResponse,
    tags=[TAG_LETTERBOXD],
)
async def letterboxd_validate(username: str = Query(min_length=1)):
    """Validate a Letterboxd username: exists + watchlist public. Returns film count."""
    try:
        count = await scraper.get_watchlist_count(username)
    except scraper.ProfileNotFoundError as exc:
        raise HTTPException(
            status_code=404, detail=f"Letterboxd profile '{username}' not found"
        ) from exc
    except scraper.WatchlistPrivateError as exc:
        raise HTTPException(
            status_code=403, detail=f"Watchlist of '{username}' is private"
        ) from exc
    except scraper.WatchlistScrapeError as exc:
        raise HTTPException(
            status_code=502, detail="Could not reach Letterboxd"
        ) from exc
    return {"username": username, "count": count}


class LetterboxdSyncRequest(BaseModel):
    letterboxd_username: str = Field(min_length=1)


class LetterboxdSyncResponse(BaseModel):
    film_count: int
    sync_duration_ms: int


@app.post("/letterboxd/sync", response_model=LetterboxdSyncResponse, tags=[TAG_LETTERBOXD])
async def letterboxd_sync(
    body: LetterboxdSyncRequest,
    user_id: str = Depends(get_current_user_id),
):
    """Scrape the full Letterboxd watchlist, enrich it via TMDB, and replace
    the user's stored watchlist (CIN-46)."""
    start = time.monotonic()

    try:
        films = await scraper.get_full_watchlist(body.letterboxd_username)
    except scraper.ProfileNotFoundError as exc:
        raise HTTPException(
            status_code=404, detail=f"Letterboxd profile '{body.letterboxd_username}' not found"
        ) from exc
    except scraper.WatchlistPrivateError as exc:
        raise HTTPException(
            status_code=403, detail=f"Watchlist of '{body.letterboxd_username}' is private"
        ) from exc
    except scraper.WatchlistScrapeError as exc:
        raise HTTPException(status_code=502, detail="Could not reach Letterboxd") from exc

    enrichments = await tmdb.enrich_many(films)
    enriched_films = [
        watchlist_repo.merge_enrichment(film, enrichments.get(film.slug)) for film in films
    ]
    film_ids_by_slug = watchlist_repo.upsert_films(enriched_films)
    watchlist_repo.sync_user_watchlist(user_id, set(film_ids_by_slug.values()))

    synced_at = datetime.now(UTC)
    supabase.table("users").update(
        {
            "letterboxd_username": body.letterboxd_username,
            "letterboxd_last_sync": synced_at.isoformat(),
            "letterboxd_film_count": len(films),
            "updated_at": synced_at.isoformat(),
        }
    ).eq("id", user_id).execute()

    return {
        "film_count": len(films),
        "sync_duration_ms": int((time.monotonic() - start) * 1000),
    }


class LetterboxdUnlinkResponse(BaseModel):
    unlinked: bool


@app.delete("/letterboxd/unlink", response_model=LetterboxdUnlinkResponse, tags=[TAG_LETTERBOXD])
async def letterboxd_unlink(user_id: str = Depends(get_current_user_id)):
    """Unlink the user's Letterboxd account. Leaves the watchlist untouched (CIN-72)."""
    supabase.table("users").update(
        {
            "letterboxd_username": None,
            "letterboxd_last_sync": None,
            "letterboxd_film_count": 0,
            "updated_at": datetime.now(UTC).isoformat(),
        }
    ).eq("id", user_id).execute()
    return {"unlinked": True}


class RecommendedFilm(BaseModel):
    film_id: str
    title: str
    poster_url: str | None
    year: int | None
    runtime: int | None
    overview: str | None
    genres: list[str]
    origin_country: list[str]
    director: str | None
    rank: int
    match_score: int | None
    critique: str | None


class RecommendMeta(BaseModel):
    candidates_considered: int


class RecommendResponse(BaseModel):
    candidates: list[RecommendedFilm]
    meta: RecommendMeta
    recommendation_session_id: str


def _to_recommended_film(ranked: RankedCandidate) -> dict:
    film = ranked.film
    return {
        "film_id": film.id,
        "title": film.title,
        "poster_url": film.poster_url,
        "year": film.year,
        "runtime": film.runtime,
        "overview": film.overview,
        "genres": film.genres,
        "origin_country": film.origin_country,
        "director": film.director,
        "rank": ranked.rank,
        "match_score": ranked.match_score,
        "critique": ranked.critique,
    }


@app.get("/watchlist", response_model=WatchlistFilterResponse, tags=[TAG_RECOMMEND])
async def watchlist(user_id: str = Depends(get_current_user_id)):
    """Lean, pre-bucketed film list powering the questionnaire's live
    filter count — reuses `filtering.py`'s bucket functions so the frontend
    never duplicates the boundaries, and `decision_history` so the "jamais
    vu" question's count matches what `/recommend` will actually exclude."""
    active_watchlist = watchlist_repo.get_active_watchlist(user_id)
    decision_history = watch_history_repo.get_decision_history(user_id)
    return {
        "films": [
            {
                "id": film.id,
                "genres": film.genres,
                "duration": filtering.duration_bucket(film.runtime),
                "era": filtering.era_bucket(film.year),
                "origin_country": film.origin_country,
                "last_proposed_at": decision_history.get(film.id),
            }
            for film in active_watchlist
        ]
    }


@app.post("/recommend", response_model=RecommendResponse, tags=[TAG_RECOMMEND])
async def recommend(
    body: RecommendRequest,
    user_id: str = Depends(get_current_user_id),
):
    """Pre-filter the user's watchlist, then either short-circuit (≤3
    candidates, no AI) or proxy an AI call to rank up to 3 (CIN-49/CIN-78).
    Records a "proposed" row per candidate before responding, so a later
    /recommend/decision call has something to verify against."""
    active_watchlist = watchlist_repo.get_active_watchlist(user_id)
    decision_history = watch_history_repo.get_decision_history(user_id)

    try:
        candidates = filtering.filter_candidates(active_watchlist, body, decision_history)
    except filtering.EmptyWatchlistError as exc:
        raise HTTPException(
            status_code=422,
            detail={"type": "empty_watchlist", "message": "Your watchlist has no active films"},
        ) from exc
    except filtering.NoCandidatesError as exc:
        raise HTTPException(
            status_code=422,
            detail={"type": "no_candidates", "message": "No film matches the selected filters"},
        ) from exc

    if len(candidates) <= 3:
        sorted_films = sorted(candidates, key=lambda f: f.added_at)
        ranked = [
            RankedCandidate(film=film, rank=i + 1, match_score=None, critique=None)
            for i, film in enumerate(sorted_films)
        ]
    else:
        try:
            ranked = await reco_ai.pick_candidates(candidates, body)
        except reco_ai.AIProviderError as exc:
            raise HTTPException(
                status_code=502,
                detail={"type": "ai_error", "message": "The AI recommendation call failed"},
            ) from exc

    recommendation_session_id = str(uuid4())
    watch_history_repo.record_proposals(
        user_id,
        recommendation_session_id,
        [r.film.id for r in ranked],
        body.model_dump(),
    )

    return {
        "candidates": [_to_recommended_film(r) for r in ranked],
        "meta": {"candidates_considered": len(candidates)},
        "recommendation_session_id": recommendation_session_id,
    }


class RecommendDecisionResponse(BaseModel):
    status: str


@app.post(
    "/recommend/decision", response_model=RecommendDecisionResponse, tags=[TAG_RECOMMEND]
)
async def recommend_decision(
    body: RecommendDecisionRequest,
    user_id: str = Depends(get_current_user_id),
):
    """Record a swipe outcome. Only succeeds if a matching "proposed" row
    exists — that's what verifies the film was actually shown (CIN-78)."""
    found = watch_history_repo.record_decision(
        user_id,
        body.recommendation_session_id,
        body.film_id,
        body.decision,
        body.match_score,
        body.critique,
    )
    if not found:
        raise HTTPException(
            status_code=404,
            detail={
                "type": "unknown_candidate",
                "message": "No pending proposal for this film — nothing to record",
            },
        )
    return {"status": "ok"}
