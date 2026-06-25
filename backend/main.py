from datetime import UTC, datetime

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
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


@app.get("/")
async def root():
    return {"message": "CinePick API is running"}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/watchlist/count")
async def watchlist_count(username: str = Query(min_length=1)):
    """Return the total film count of a public Letterboxd watchlist."""
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
async def watchlist_sync(body: SyncRequest):
    """Stub — renvoie un résultat fictif pour débloquer CIN-69 frontend.

    Remplacé par l'implémentation complète dans CIN-46.
    """
    return {
        "count": 42,
        "synced_at": datetime.now(UTC).isoformat(),
    }


@app.get("/health/ready")
async def health_ready():
    try:
        supabase.table("profiles").select("id").limit(1).execute()
        return {"status": "ready", "checks": {"database": "ok"}}
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail={"status": "not_ready", "error": str(e)},
        ) from e
