from typing import Optional
from pydantic import BaseModel


class Film(BaseModel):
    title: str
    year: Optional[str] = None
    slug: Optional[str] = None
    poster: Optional[str] = None
    overview: Optional[str] = None
    tmdb_id: Optional[int] = None
    genres: list[str] = []
    runtime: Optional[int] = None
    providers: list[str] = []
    tmdb_url: Optional[str] = None


class WatchlistResponse(BaseModel):
    count: int
    films: list[Film]


# ---------------------------------------------------------------------------
# AI proxy models
# ---------------------------------------------------------------------------

class AITestKeyRequest(BaseModel):
    provider: str
    api_key: str


class FilmForAI(BaseModel):
    title: str
    year: Optional[str] = None
    genres: list[str] = []
    runtime: Optional[int] = None
    providers: list[str] = []


class RefusedFilm(BaseModel):
    title: str
    genres: list[str] = []
    runtime: Optional[int] = None
    mood_tags: list[str] = []


class AIRecommendRequest(BaseModel):
    provider: str
    api_key: str
    films: list[FilmForAI]
    answers: dict[str, str] = {}
    refused_films: list[RefusedFilm] = []


class AIRecommendation(BaseModel):
    title: str
    reason: str
    match_score: int
    mood_tags: list[str]
    warning: Optional[str] = None


class AIRecommendResponse(BaseModel):
    recommendation: AIRecommendation
