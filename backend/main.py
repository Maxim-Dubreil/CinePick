import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from scraper import ScraperError, scrape_watchlist
from tmdb import enrich_film
from models import Film, WatchlistResponse

load_dotenv()

app = FastAPI(title="CinePick API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


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
