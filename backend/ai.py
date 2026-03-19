"""
AI Proxy — Routes LLM requests from the app to the configured provider.

Security model:
- All traffic travels over HTTPS (TLS). The API key is encrypted in transit
  both between the app→Railway and Railway→AI provider. The key is never
  stored or logged server-side.
- Requests are gated by X-App-Token (checked in main.py) to prevent
  unauthorized use of this proxy by third parties.
"""

import json

import httpx
from fastapi import HTTPException

# ---------------------------------------------------------------------------
# Provider config (mirrors app/src/services/llm.ts)
# ---------------------------------------------------------------------------

PROVIDER_CONFIG: dict[str, dict[str, str]] = {
    "gemini":    {"model": "gemini-2.0-flash",           "label": "Gemini Flash 2.0"},
    "groq":      {"model": "llama-3.3-70b-versatile",    "label": "Llama 3.3 70B"},
    "openai":    {"model": "gpt-4o-mini",                 "label": "GPT-4o mini"},
    "anthropic": {"model": "claude-3-5-haiku-20241022",  "label": "Claude Haiku"},
}

REQUEST_TIMEOUT = 10.0

SYSTEM_PROMPT = """Tu es un ami cinéphile. Tu connais la watchlist de quelqu'un et tu lui recommandes ce soir le film parfait.

RÈGLE ABSOLUE : le titre retourné DOIT être exactement tel qu'il apparaît dans la watchlist. Ne jamais inventer un titre.

Ton pour "reason" : comme un pote qui envoie un message WhatsApp — 1-2 phrases, direct, enthousiaste, sans jargon.
Exemples de bon ton :
- "28 minutes de suspense pur — exactement ce qu'il faut pour ce soir en solo."
- "Un thriller qui tient en haleine jusqu'à la dernière seconde, parfait pour une soirée à deux."
- "Vibes chill garanties, ce film te laissera le sourire aux lèvres."
Interdit : "ce film correspond à tes préférences", "conformément à tes critères", tout style académique.

Réponds UNIQUEMENT en JSON valide, sans balises markdown, sans texte autour. Format exact :
{
  "title": "Titre exact tel qu'il figure dans la watchlist",
  "reason": "1-2 phrases style pote sur WhatsApp, en français",
  "match_score": 85,
  "mood_tags": ["tag1", "tag2", "tag3"],
  "warning": null
}

Champs :
- title : string — titre exact de la watchlist
- reason : string — 1-2 phrases, ton décontracté et direct, en français
- match_score : number 0-100 — à quel point ce film colle au contexte du soir
- mood_tags : string[] — 2 à 4 tags d'ambiance courts (ex: "contemplatif", "feel-good", "tendu")
- warning : string | null — mise en garde si contenu sensible, sinon null"""

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _compress_watchlist(films: list[dict]) -> str:
    lines = []
    for f in films:
        genres = ",".join((f.get("genres") or [])[:2])
        runtime = str(f.get("runtime") or "")
        lines.append(f"{f['title']}|{f.get('year', '')}|{genres}|{runtime}")
    return "\n".join(lines)


def _prefilter(films: list[dict], answers: dict) -> list[dict]:
    if len(films) <= 200:
        return films
    duration = answers.get("duration")
    filtered = films
    if duration == "short":
        filtered = [f for f in films if not f.get("runtime") or f["runtime"] <= 95]
    elif duration == "medium":
        filtered = [f for f in films if f.get("runtime") and 90 <= f["runtime"] <= 125]
    elif duration == "long":
        filtered = [f for f in films if not f.get("runtime") or f["runtime"] >= 120]
    return filtered if len(filtered) >= 20 else films[:200]


PLATFORM_LABELS: dict[str, str] = {
    "netflix": "Netflix",
    "canal":   "Canal+",
    "disney":  "Disney+",
}


def _platform_filter(films: list[dict], platform: str) -> tuple[list[dict], str | None]:
    """Keep only films available on the chosen platform.
    If none match, returns the full list + a warning string."""
    label = PLATFORM_LABELS.get(platform, platform)
    matched = [f for f in films if label in (f.get("providers") or [])]
    if matched:
        return matched, None
    return films, f"Non disponible sur {label} — vérifie avant de lancer"


def _build_user_prompt(films: list[dict], answers: dict, refused_films: list[dict]) -> str:
    parts = ["## Watchlist (format: titre|année|genres|durée_min)\n" + _compress_watchlist(films)]

    # Generic preferences — exclude fields handled separately
    _SKIP_KEYS = {"platforms", "excluded_genres"}
    pref_lines = [f"{k}: {v}" for k, v in answers.items() if k not in _SKIP_KEYS]
    if pref_lines:
        parts.append("## Préférences de l'utilisateur\n" + "\n".join(pref_lines))

    # Refused films with context
    if refused_films:
        lines = []
        for rf in refused_films:
            desc = rf["title"]
            details: list[str] = []
            if rf.get("genres"):
                details.append(f"genres: {', '.join(rf['genres'])}")
            if rf.get("runtime"):
                details.append(f"durée: {rf['runtime']}min")
            if rf.get("mood_tags"):
                details.append(f"ambiance: {', '.join(rf['mood_tags'])}")
            if details:
                desc += f" ({'; '.join(details)})"
            lines.append(desc)
        parts.append(
            "## Films refusés — NE PAS proposer, évite les films avec les mêmes genres/ambiances\n"
            + "\n".join(lines)
        )

    # Excluded genres
    excluded_raw = answers.get("excluded_genres", "")
    if excluded_raw and excluded_raw != "none":
        genres_list = ", ".join(g.strip() for g in excluded_raw.split(","))
        parts.append(f"## Genres à exclure absolument\nNe propose jamais un film de ces genres : {genres_list}")

    parts.append("Recommande UN film de cette watchlist en tenant compte de ces préférences.")
    return "\n\n".join(parts)


def _parse_recommendation(raw: str) -> dict:
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        cleaned = "\n".join(lines[1:])
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3].strip()
    return json.loads(cleaned)


def _raise_provider_error(status: int, provider: str) -> None:
    label = PROVIDER_CONFIG.get(provider, {}).get("label", provider)
    if status in (401, 403):
        raise HTTPException(400, f"invalid_key:Clé API {label} invalide ou expirée.")
    if status == 429:
        raise HTTPException(429, f"quota_exceeded:Quota {label} dépassé.")
    raise HTTPException(502, f"network:Erreur HTTP {status} du provider {label}.")


# ---------------------------------------------------------------------------
# Provider callers
# ---------------------------------------------------------------------------

async def _call_openai_compatible(
    endpoint: str, key: str, model: str, messages: list[dict], provider: str
) -> str:
    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
        res = await client.post(
            endpoint,
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {key}"},
            json={"model": model, "messages": messages, "max_tokens": 512},
        )
    if not res.is_success:
        _raise_provider_error(res.status_code, provider)
    return res.json()["choices"][0]["message"]["content"]


async def _call_gemini(key: str, model: str, messages: list[dict]) -> str:
    user_messages = [m for m in messages if m["role"] != "system"]
    system_msg = next((m for m in messages if m["role"] == "system"), None)
    contents = [
        {"role": "model" if m["role"] == "assistant" else "user", "parts": [{"text": m["content"]}]}
        for m in user_messages
    ]
    body: dict = {"contents": contents}
    if system_msg:
        body["systemInstruction"] = {"parts": [{"text": system_msg["content"]}]}
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
        res = await client.post(url, headers={"Content-Type": "application/json"}, json=body)
    if not res.is_success:
        _raise_provider_error(res.status_code, "gemini")
    return res.json()["candidates"][0]["content"]["parts"][0]["text"]


async def _call_anthropic(key: str, model: str, messages: list[dict]) -> str:
    system_msg = next((m for m in messages if m["role"] == "system"), None)
    user_messages = [
        {"role": m["role"], "content": m["content"]}
        for m in messages
        if m["role"] != "system"
    ]
    body: dict = {"model": model, "max_tokens": 512, "messages": user_messages}
    if system_msg:
        body["system"] = system_msg["content"]
    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
        res = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "Content-Type": "application/json",
                "x-api-key": key,
                "anthropic-version": "2023-06-01",
            },
            json=body,
        )
    if not res.is_success:
        _raise_provider_error(res.status_code, "anthropic")
    return res.json()["content"][0]["text"]


async def call_provider(provider: str, key: str, messages: list[dict]) -> str:
    config = PROVIDER_CONFIG.get(provider)
    if not config:
        raise HTTPException(400, f"network:Provider inconnu : {provider}")
    model = config["model"]
    if provider == "gemini":
        return await _call_gemini(key, model, messages)
    if provider == "groq":
        return await _call_openai_compatible(
            "https://api.groq.com/openai/v1/chat/completions", key, model, messages, "groq"
        )
    if provider == "openai":
        return await _call_openai_compatible(
            "https://api.openai.com/v1/chat/completions", key, model, messages, "openai"
        )
    if provider == "anthropic":
        return await _call_anthropic(key, model, messages)
    raise HTTPException(400, f"network:Provider non supporté : {provider}")


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def test_key(provider: str, key: str) -> None:
    """Make a minimal call (~10 tokens) to validate an API key."""
    await call_provider(provider, key, [{"role": "user", "content": "Réponds juste: ok"}])


class _TitleNotInWatchlist(Exception):
    def __init__(self, bad_title: str) -> None:
        self.bad_title = bad_title


async def recommend(
    provider: str,
    key: str,
    films: list[dict],
    answers: dict,
    refused_films: list[dict],
) -> dict:
    """
    Build prompt, call provider, validate that the returned title is in the
    watchlist. Retries once with the bad title added to the refused list.
    """
    filtered = _prefilter(films, answers)

    # Platform filter — priorize films on the chosen platform
    platform_warning: str | None = None
    platform = answers.get("platforms", "any")
    if platform and platform != "any":
        filtered, platform_warning = _platform_filter(filtered, platform)

    async def attempt(extra_refused: list[dict]) -> dict:
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": _build_user_prompt(filtered, answers, refused_films + extra_refused),
            },
        ]
        raw = await call_provider(provider, key, messages)
        try:
            rec = _parse_recommendation(raw)
        except (json.JSONDecodeError, KeyError, IndexError) as exc:
            raise HTTPException(502, f"parse:Réponse IA invalide : {exc}")
        if not any(f["title"].lower() == rec["title"].lower() for f in filtered):
            raise _TitleNotInWatchlist(rec["title"])
        return rec

    try:
        rec = await attempt([])
    except _TitleNotInWatchlist as e:
        try:
            rec = await attempt([{"title": e.bad_title}])
        except _TitleNotInWatchlist:
            raise HTTPException(
                502,
                "validation:Le provider IA n'a pas retourné un titre de ta watchlist après deux tentatives.",
            )

    # Inject platform warning when the filter had to be bypassed
    if platform_warning and not rec.get("warning"):
        rec["warning"] = platform_warning

    return rec
