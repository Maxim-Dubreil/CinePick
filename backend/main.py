import logging
import os
import time
from datetime import UTC, datetime
from uuid import uuid4

import httpx
from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response
from supabase_auth.errors import AuthRetryableError

import filtering
import reco_ai
import scraper
import tmdb
import tmdb_rating
import watch_providers
from models import (
    AbandonSessionRequest,
    RankedCandidate,
    RecommendDecisionRequest,
    RecommendRequest,
    WatchlistFilterResponse,
)
from repositories import watch_history as watch_history_repo
from repositories import watchlist as watchlist_repo
from supabase_client import supabase
from tmdb_rating import RatingResponse
from watch_providers import WatchProvidersResponse

logger = logging.getLogger(__name__)

# Interactive docs map the whole API surface for anyone — dev only.
_docs_enabled = os.getenv("ENV", "dev") != "prod"
app = FastAPI(
    title="CinePick API",
    version="0.1.0",
    docs_url="/docs" if _docs_enabled else None,
    redoc_url="/redoc" if _docs_enabled else None,
    openapi_url="/openapi.json" if _docs_enabled else None,
)

TAG_HEALTH = "health"
TAG_LETTERBOXD = "letterboxd"
TAG_RECOMMEND = "recommend"
TAG_FILMS = "films"


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
    except (httpx.TransportError, AuthRetryableError) as exc:
        # Supabase unreachable/overloaded says nothing about the token itself —
        # reporting it as 401 "Invalid token" sent debugging down the wrong path.
        logger.warning("Token check failed: Supabase auth unreachable (%r)", exc)
        raise HTTPException(status_code=503, detail="Auth service unavailable") from exc
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
    tmdb_id: int | None
    title: str
    poster_url: str | None
    year: int | None
    runtime: int | None
    overview: str | None
    genres: list[str]
    origin_country: list[str]
    director: str | None
    actors: list[str]
    rank: int
    match_score: int | None
    critique: str | None


class RecommendMeta(BaseModel):
    candidates_considered: int


class RecommendResponse(BaseModel):
    candidates: list[RecommendedFilm]
    meta: RecommendMeta
    recommendation_session_id: str


class RecommendCurrentResponse(RecommendResponse):
    """Body of GET /recommend/current — additionally carries the original
    answers (stored per-row as `questions_context`), needed so the front can
    retry with a fresh /recommend call if every resumed candidate gets
    skipped, without ever having gone through Questions this session."""

    answers: RecommendRequest


def _to_recommended_film(ranked: RankedCandidate) -> dict:
    film = ranked.film
    return {
        "film_id": film.id,
        "tmdb_id": film.tmdb_id,
        "title": film.title,
        "poster_url": film.poster_url,
        "year": film.year,
        "runtime": film.runtime,
        "overview": film.overview,
        "genres": film.genres,
        "origin_country": film.origin_country,
        "director": film.director,
        "actors": film.actors,
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


@app.get("/recommend/current", response_model=RecommendCurrentResponse, tags=[TAG_RECOMMEND])
async def recommend_current(user_id: str = Depends(get_current_user_id)):
    """The user's most recent recommendation still awaiting a decision, if
    any — lets the front resume a swipe deck after a reload or a lost
    session without a new AI call. 404 means there's nothing pending; the
    front falls back to Questions."""
    pending = watch_history_repo.get_pending_session(user_id)
    if pending is None:
        raise HTTPException(
            status_code=404,
            detail={
                "type": "no_pending_session",
                "message": "No recommendation is awaiting a decision",
            },
        )
    recommendation_session_id, rows = pending
    candidates = [
        {
            "film_id": row["film_id"],
            "tmdb_id": row["films"]["tmdb_id"],
            "title": row["films"]["title"],
            "poster_url": row["films"]["poster_url"],
            "year": row["films"]["year"],
            "runtime": row["films"]["runtime"],
            "overview": row["films"]["overview"],
            # Nullable for unenriched films — same coercion as WatchlistFilm.
            "genres": row["films"]["genres"] or [],
            "origin_country": row["films"]["origin_country"] or [],
            "director": row["films"]["director"],
            "actors": row["films"]["actors"] or [],
            "rank": row["rank"],
            "match_score": row["match_score"],
            "critique": row["ai_critique"],
        }
        for row in rows
    ]
    return {
        "candidates": candidates,
        "meta": {"candidates_considered": len(candidates)},
        "recommendation_session_id": recommendation_session_id,
        "answers": rows[0]["questions_context"],
    }


@app.post("/recommend", response_model=RecommendResponse, tags=[TAG_RECOMMEND])
async def recommend(
    body: RecommendRequest,
    user_id: str = Depends(get_current_user_id),
):
    """Pre-filter the user's watchlist, then proxy an AI call to rank up to 3
    candidates (CIN-49/CIN-78) — always, down to a single remaining film, so
    match_score/critique are populated regardless of subset size. Records a
    "proposed" row per candidate before responding, so a later
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

    try:
        ranked = await reco_ai.pick_candidates(candidates, body)
    except reco_ai.AIOverloadedError as exc:
        raise HTTPException(
            status_code=503,
            detail={"type": "ai_overloaded", "message": "The AI provider is overloaded"},
        ) from exc
    except reco_ai.AIProviderError as exc:
        raise HTTPException(
            status_code=502,
            detail={"type": "ai_error", "message": "The AI recommendation call failed"},
        ) from exc

    recommendation_session_id = str(uuid4())
    watch_history_repo.record_proposals(
        user_id,
        recommendation_session_id,
        ranked,
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
    )
    if not found:
        raise HTTPException(
            status_code=404,
            detail={
                "type": "unknown_candidate",
                "message": "No pending proposal for this film — nothing to record",
            },
        )
    # Accepting ends the session: the lower-ranked candidates were never
    # swiped, and leaving them "proposed" would make /recommend/current
    # resume this already-finished session.
    if body.decision == "accepted":
        watch_history_repo.abandon_session(user_id, body.recommendation_session_id)
    return {"status": "ok"}


@app.post(
    "/recommend/current/abandon", response_model=RecommendDecisionResponse, tags=[TAG_RECOMMEND]
)
async def recommend_current_abandon(
    body: AbandonSessionRequest,
    user_id: str = Depends(get_current_user_id),
):
    """Explicit "Recommencer": marks every still-undecided candidate of this
    session as skipped, so /recommend/current stops returning it. Always
    succeeds — abandoning a session with nothing left to abandon (already
    decided, or a stale id) is a no-op, not an error."""
    watch_history_repo.abandon_session(user_id, body.recommendation_session_id)
    return {"status": "ok"}


@app.get(
    "/films/{tmdb_id}/watch-providers",
    response_model=WatchProvidersResponse,
    tags=[TAG_FILMS],
)
async def films_watch_providers(
    tmdb_id: int,
    user_id: str = Depends(get_current_user_id),
):
    """Where to watch a film in France (CIN-103) — shared by Result, Home,
    and Historique. A film with no FR offer returns 200 with an empty
    `providers` list; a TMDB failure raises 502 instead, so the frontend can
    tell "nothing to watch" apart from "couldn't check" and hide the block
    only for the latter. Only network/HTTP failures are caught here — a bug
    inside `watch_providers.get_watch_providers` itself (e.g. malformed TMDB
    JSON) must surface as a 500 via `CatchAllMiddleware`, not get mislabeled
    as "TMDB is down"."""
    try:
        return await watch_providers.get_watch_providers(tmdb_id)
    except httpx.HTTPError as exc:
        logger.warning("TMDB watch-providers lookup failed for tmdb_id=%s: %s", tmdb_id, exc)
        raise HTTPException(status_code=502, detail="Could not reach TMDB") from exc


@app.get(
    "/films/{tmdb_id}/rating",
    response_model=RatingResponse,
    tags=[TAG_FILMS],
)
async def films_rating(
    tmdb_id: int,
    user_id: str = Depends(get_current_user_id),
):
    """TMDB rating for a film (CIN-104) — live-fetched, never persisted (see
    `tmdb_rating.py`). Same error contract as `/films/{tmdb_id}/watch-providers`:
    a TMDB/network failure raises 502, a bug inside `get_rating` itself
    surfaces as a 500 via `CatchAllMiddleware`."""
    try:
        return await tmdb_rating.get_rating(tmdb_id)
    except httpx.HTTPError as exc:
        logger.warning("TMDB rating lookup failed for tmdb_id=%s: %s", tmdb_id, exc)
        raise HTTPException(status_code=502, detail="Could not reach TMDB") from exc
