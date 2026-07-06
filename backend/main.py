import time
from datetime import UTC, datetime

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

import scraper
import tmdb
from repositories import watchlist as watchlist_repo
from supabase_client import supabase

app = FastAPI(title="CinePick API", version="0.1.0")

TAG_HEALTH = "health"
TAG_LETTERBOXD = "letterboxd"

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
