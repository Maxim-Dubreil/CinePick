"""Pydantic models: Letterboxd scraping, watchlist storage, and the
/recommend questionnaire/response contract."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class Film(BaseModel):
    """A single film entry scraped from a Letterboxd watchlist page.

    Metadata is intentionally lean: only what the watchlist HTML exposes.
    Richer fields (TMDB id, genres, runtime) are filled later by the
    enrichment layer, not here.
    """

    slug: str
    """Letterboxd slug, the natural key (e.g. ``"carolina-caroline"``)."""

    title: str
    """Display title without the trailing year (e.g. ``"Carolina Caroline"``)."""

    year: int | None = None
    """Release year when present in the page, otherwise ``None``."""

    poster_url: str | None = None
    """Absolute URL of the Letterboxd poster resolver, when available."""


class WatchlistPage(BaseModel):
    """One paginated page of a watchlist: its films plus the watchlist total.

    ``total_count`` is the whole-watchlist size read from the page header, not
    the number of films on this page.
    """

    films: list[Film]
    total_count: int


class FilmEnrichment(BaseModel):
    """TMDB metadata for a single film — the "filtre" enrichment (CIN-46).

    Best-effort: produced only when a TMDB search+details lookup succeeds.
    Absence (`None` upstream) means the film stays unenriched, not that the
    film doesn't exist.
    """

    tmdb_id: int
    genres: list[int]
    """TMDB genre ids — never localized names (see docs/db-schema.md)."""

    runtime: int | None
    year: int | None
    """From TMDB `release_date`; may differ slightly from the Letterboxd year."""

    origin_country: list[str]
    """ISO 3166-1 country codes from `production_countries` — never `original_language`."""

    overview: str | None = None
    """TMDB synopsis — `None` when TMDB doesn't provide one for this film."""

    poster_url: str | None = None
    """Absolute TMDB CDN image URL, built from `poster_path`. Unlike the
    scraped `Film.poster_url` (a Letterboxd resolver endpoint, not an image),
    this one is directly usable as an `<img>` src."""

    director: str | None = None
    """Name of the film's director, from `credits.crew` — `None` when TMDB
    has no crew entry with `job == "Director"`."""

    actors: list[str] = Field(default_factory=list)
    """Up to 5 main cast names, from `credits.cast`, billing order — empty
    when TMDB has no cast entry."""

    collection_name: str | None = None
    """TMDB saga/collection name (`belongs_to_collection.name`), `None` when
    the film isn't part of one."""

    collection_order: int | None = None
    """This film's 1-based rank by release date within its collection.
    `None` when there's no collection, or TMDB's collection listing doesn't
    include this film. Release order, not a curated "recommended viewing
    order" — see docs/specs/ai.md."""

    collection_total: int | None = None
    """Number of films in the collection, alongside `collection_order`."""


class EnrichedFilm(BaseModel):
    """A scraped film merged with its (optional) TMDB enrichment.

    Ready to upsert into `films` as-is via `.model_dump()`. `genres`/
    `origin_country` stay empty and `runtime`/`tmdb_id` stay `None` when
    enrichment failed or found no match — treated as "non filtrable" by the
    duration filter downstream, never excluded outright.
    """

    letterboxd_slug: str
    title: str
    year: int | None
    poster_url: str | None
    tmdb_id: int | None = None
    genres: list[str] = Field(default_factory=list)
    runtime: int | None = None
    origin_country: list[str] = Field(default_factory=list)
    overview: str | None = None
    director: str | None = None
    actors: list[str] = Field(default_factory=list)
    collection_name: str | None = None
    collection_order: int | None = None
    collection_total: int | None = None


class WatchlistFilm(BaseModel):
    """A film read back from a user's active watchlist, ready for filtering.

    Distinct from `EnrichedFilm` (write-side, keyed by `letterboxd_slug`):
    this carries the DB `id`, needed to compare against `watch_history` and
    against whatever id the AI proxy returns.
    """

    id: str
    letterboxd_slug: str
    title: str
    year: int | None
    poster_url: str | None
    tmdb_id: int | None = None
    genres: list[str] = Field(default_factory=list)
    runtime: int | None = None
    origin_country: list[str] = Field(default_factory=list)
    overview: str | None = None
    director: str | None = None
    actors: list[str] = Field(default_factory=list)
    collection_name: str | None = None
    collection_order: int | None = None
    collection_total: int | None = None
    added_at: datetime
    """When this film was added to the user's watchlist."""

    @field_validator("genres", "origin_country", "actors", mode="before")
    @classmethod
    def _null_array_to_empty(cls, value: object) -> object:
        """`films.genres`/`origin_country`/`actors` are nullable: PostgREST
        writes an explicit NULL for unenriched films in a mixed upsert batch
        (see backend/db/schema.sql and test_upsert_films_mixed_batch_against_real_db)."""
        return [] if value is None else value


class WatchlistFilterFilm(BaseModel):
    """A single watchlist film, pre-bucketed for the questionnaire's live
    filter count. Mirrors `filtering.py`'s hard-filter fields exactly (via
    `duration_bucket`/`era_bucket`), so the frontend can replicate the same
    rules without duplicating the bucket boundaries."""

    id: str
    genres: list[str]
    duration: Literal["lt90", "90-120", "120-150", "150plus"] | None
    era: Literal["silent", "golden", "newwave", "blockbuster", "2000s", "recent"] | None
    origin_country: list[str]
    last_proposed_at: datetime | None
    """When this film was last proposed to or decided on by the user (from
    `watch_history`), or `None` if never — mirrors `filtering.py`'s
    `decision_history` lookup."""


class WatchlistFilterResponse(BaseModel):
    films: list[WatchlistFilterFilm]


class RankedCandidate(BaseModel):
    """One AI-ranked (or short-circuit) recommendation candidate."""

    film: WatchlistFilm
    rank: int
    match_score: int | None
    critique: str | None


class RecommendRequest(BaseModel):
    """Answers to the 9-question flow, sent as-is from the frontend.

    Field names match `QuestionId` in `frontend/src/lib/question/types.ts`
    exactly — no renaming layer. `genre`/`region` carry `["none"]` for "no
    preference" (multi-select questions); the single-select fields carry
    `"any"` for the same meaning, matching `questionnaire.ts`.
    """

    genre: list[str]
    """TMDB genre ids as strings (e.g. `["35"]`), or `["none"]`."""
    emotion: list[str]
    """Not filtered — forwarded to the AI proxy as-is."""
    ambiance: list[str]
    """Not filtered — forwarded to the AI proxy as-is."""
    withWho: Literal["seul", "amis", "couple", "famille", "any"]
    """Not filtered — forwarded to the AI proxy as-is."""
    duration: Literal["lt90", "90-120", "120-150", "150plus", "any"]
    era: Literal["silent", "golden", "newwave", "blockbuster", "2000s", "recent", "any"]
    region: list[str]
    """ISO 3166-1 country codes, `["none"]`, or a user-typed custom region."""
    subtitles: Literal["with", "without", "any"]
    """Not filtered — forwarded to the AI proxy as-is."""
    seen: Literal["nouveau", "any"]
    """`"any"` disables the default watch_history exclusion (see filtering.py)."""


class RecommendDecisionRequest(BaseModel):
    """Body of POST /recommend/decision — records a swipe outcome."""

    recommendation_session_id: str
    film_id: str
    decision: Literal["accepted", "skipped"]


class AbandonSessionRequest(BaseModel):
    """Body of POST /recommend/current/abandon — the explicit "Recommencer"."""

    recommendation_session_id: str
