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
