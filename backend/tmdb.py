import os
import httpx

BASE_URL = "https://api.themoviedb.org/3"
IMAGE_BASE = "https://image.tmdb.org/t/p/w500"
WATCH_REGION = "FR"

_EMPTY = {
    "poster_url": None,
    "overview": None,
    "tmdb_id": None,
    "genres": [],
    "runtime": None,
    "providers_fr": [],
    "tmdb_url": None,
}


def _api_key() -> str:
    key = os.getenv("TMDB_API_KEY", "")
    if not key:
        raise RuntimeError("TMDB_API_KEY is not set in environment.")
    return key


async def enrich_film(title: str, year: str) -> dict:
    """
    Search TMDB for a film by title/year and return enrichment fields.
    Returns _EMPTY if TMDB_API_KEY is not set or the film is not found.
    """
    if not os.getenv("TMDB_API_KEY", ""):
        return _EMPTY

    params = {"api_key": _api_key(), "language": "fr-FR"}

    async with httpx.AsyncClient(timeout=10) as client:
        # --- Search ---
        search_params = {**params, "query": title, "include_adult": False}
        if year:
            search_params["year"] = year

        try:
            resp = await client.get(f"{BASE_URL}/search/movie", params=search_params)
            resp.raise_for_status()
        except httpx.HTTPError:
            return _EMPTY.copy()

        results = resp.json().get("results", [])
        if not results:
            return _EMPTY.copy()

        movie = results[0]
        tmdb_id = movie["id"]

        # --- Details (genres + runtime) ---
        try:
            detail_resp = await client.get(
                f"{BASE_URL}/movie/{tmdb_id}",
                params={**params, "append_to_response": "watch/providers"},
            )
            detail_resp.raise_for_status()
            detail = detail_resp.json()
        except httpx.HTTPError:
            return _EMPTY.copy()

        genres = [g["name"] for g in detail.get("genres", [])]
        runtime = detail.get("runtime") or None

        # --- Watch providers (FR flatrate) ---
        providers_fr: list[str] = []
        watch_data = detail.get("watch/providers", {}).get("results", {})
        fr_data = watch_data.get(WATCH_REGION, {})
        for entry in fr_data.get("flatrate", []):
            name = entry.get("provider_name")
            if name:
                providers_fr.append(name)

        poster_path = movie.get("poster_path") or detail.get("poster_path")
        poster_url = f"{IMAGE_BASE}{poster_path}" if poster_path else None

        overview = detail.get("overview") or movie.get("overview") or None

        return {
            "poster_url": poster_url,
            "overview": overview,
            "tmdb_id": tmdb_id,
            "genres": genres,
            "runtime": runtime,
            "providers_fr": providers_fr,
            "tmdb_url": f"https://www.themoviedb.org/movie/{tmdb_id}",
        }
