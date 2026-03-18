import asyncio
import os
from typing import Optional

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from scraper import ScraperError, scrape_watchlist
from tmdb import enrich_film
from ai import test_key, recommend as ai_recommend
from models import (
    Film, WatchlistResponse,
    AITestKeyRequest, AIRecommendRequest, AIRecommendResponse, AIRecommendation,
)

load_dotenv()

app = FastAPI(title="CinePick API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Security — X-App-Token
# Set APP_TOKEN env var in Railway to enforce the check.
# If APP_TOKEN is not set, the check is skipped (dev mode).
# ---------------------------------------------------------------------------

_APP_TOKEN = os.getenv("APP_TOKEN")


def check_app_token(x_app_token: Optional[str] = Header(default=None)) -> None:
    if _APP_TOKEN and x_app_token != _APP_TOKEN:
        raise HTTPException(status_code=401, detail="Token d'application invalide.")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/watchlist/{username}", response_model=WatchlistResponse)
async def get_watchlist(username: str):
    # --- Scrape Letterboxd ---
    try:
        raw_films = await scrape_watchlist(username)
    except ScraperError as exc:
        if exc.kind == "not_found":
            raise HTTPException(status_code=404, detail=str(exc))
        if exc.kind == "private":
            raise HTTPException(status_code=403, detail=str(exc))
        raise HTTPException(status_code=502, detail=str(exc))

    # --- Enrich each film via TMDB (concurrent, max 10 at a time) ---
    semaphore = asyncio.Semaphore(10)

    async def enrich(raw: dict) -> Film:
        async with semaphore:
            enriched = await enrich_film(raw["title"], raw.get("year", ""))
        return Film(
            title=raw["title"],
            year=raw.get("year"),
            slug=raw.get("slug"),
            poster=enriched["poster_url"],
            overview=enriched["overview"],
            tmdb_id=enriched["tmdb_id"],
            genres=enriched["genres"],
            runtime=enriched["runtime"],
            providers=enriched["providers_fr"],
            tmdb_url=enriched["tmdb_url"],
        )

    films = await asyncio.gather(*[enrich(f) for f in raw_films])

    return WatchlistResponse(count=len(films), films=list(films))


# ---------------------------------------------------------------------------
# AI proxy endpoints
# ---------------------------------------------------------------------------

@app.post("/ai/test-key", dependencies=[Depends(check_app_token)])
async def post_test_key(request: AITestKeyRequest):
    """Validate an AI provider API key with a minimal ~10-token call."""
    try:
        await test_key(request.provider, request.api_key)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(502, f"network:{exc}")
    return {"status": "ok"}


@app.post("/ai/recommend", response_model=AIRecommendResponse, dependencies=[Depends(check_app_token)])
async def post_recommend(request: AIRecommendRequest):
    """Proxy a recommendation request to the configured AI provider."""
    films_dicts = [f.model_dump() for f in request.films]
    try:
        rec = await ai_recommend(
            request.provider,
            request.api_key,
            films_dicts,
            request.answers,
            request.refused_titles,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(502, f"network:{exc}")
    return AIRecommendResponse(recommendation=AIRecommendation(**rec))
