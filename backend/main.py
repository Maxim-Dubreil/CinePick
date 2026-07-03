from datetime import UTC, datetime
from typing import Any, cast

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

import scraper
from supabase_client import supabase

app = FastAPI(title="CinePick API", version="0.1.0")

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


@app.get("/")
async def root():
    return {"message": "CinePick API is running"}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/health/ready")
async def health_ready():
    try:
        supabase.table("users").select("id").limit(1).execute()
        return {"status": "ready", "checks": {"database": "ok"}}
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail={"status": "not_ready", "error": str(e)},
        ) from e


@app.get("/letterboxd/validate")
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


class SyncRequest(BaseModel):
    username: str = Field(min_length=1)


@app.post("/watchlist/sync")
async def watchlist_sync(
    body: SyncRequest,
    user_id: str = Depends(get_current_user_id),
):
    """Stub — renvoie un résultat fictif pour débloquer CIN-69 frontend.

    Sauvegarde le username et la date de sync dans users pour que
    GET /profile retourne des données cohérentes.
    Remplacé par l'implémentation complète dans CIN-46.
    """
    synced_at = datetime.now(UTC)

    try:
        film_count = await scraper.get_watchlist_count(body.username)
    except (
        scraper.ProfileNotFoundError, scraper.WatchlistPrivateError, scraper.WatchlistScrapeError
    ) as exc:
        raise HTTPException(status_code=502, detail="Could not reach Letterboxd") from exc

    supabase.table("users").update({
        "letterboxd_username": body.username,
        "letterboxd_last_sync": synced_at.isoformat(),
        "letterboxd_film_count": film_count,
        "updated_at": synced_at.isoformat(),
    }).eq("id", user_id).execute()

    return {
        "count": film_count,
        "synced_at": synced_at.isoformat(),
    }


class ProfileResponse(BaseModel):
    letterboxd_username: str | None
    last_sync: str | None
    film_count: int


@app.get("/profile", response_model=ProfileResponse)
async def get_profile(user_id: str = Depends(get_current_user_id)) -> ProfileResponse:
    """Return the current user's profile and watchlist stats."""
    profile_res = (
        supabase.table("users")
        .select("letterboxd_username, letterboxd_last_sync, letterboxd_film_count")
        .eq("id", user_id)
        .single()
        .execute()
    )
    if not profile_res.data:
        raise HTTPException(status_code=404, detail="Profile not found")

    profile_data = cast(dict[str, Any], profile_res.data)

    return ProfileResponse(
        letterboxd_username=profile_data.get("letterboxd_username"),
        last_sync=profile_data.get("letterboxd_last_sync"),
        film_count=profile_data.get("letterboxd_film_count") or 0,
    )
