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

SYSTEM_PROMPT = """Tu es un expert en recommandation de films.
Ta mission : choisir UN film dans la watchlist fournie par l'utilisateur, en tenant compte de ses préférences.

RÈGLE ABSOLUE : le titre retourné DOIT être exactement tel qu'il apparaît dans la watchlist. Ne jamais inventer un titre.

Réponds UNIQUEMENT en JSON valide, sans balises markdown, sans texte autour. Format exact :
{
  "title": "Titre exact tel qu'il figure dans la watchlist",
  "reason": "Critique cinéphile en 2-3 phrases expliquant pourquoi ce film correspond aux préférences",
  "match_score": 85,
  "mood_tags": ["tag1", "tag2", "tag3"],
  "warning": null
}

Champs :
- title : string — titre exact de la watchlist
- reason : string — 2-3 phrases, style critique ciné, en français
- match_score : number 0-100 — correspondance avec les préférences
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


def _build_user_prompt(films: list[dict], answers: dict, refused_titles: list[str]) -> str:
    parts = ["## Watchlist (format: titre|année|genres|durée_min)\n" + _compress_watchlist(films)]
    if answers:
        parts.append("## Préférences de l'utilisateur\n" + "\n".join(f"{k}: {v}" for k, v in answers.items()))
    if refused_titles:
        parts.append("## Films déjà refusés (NE PAS proposer)\n" + "\n".join(refused_titles))
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
    refused_titles: list[str],
) -> dict:
    """
    Build prompt, call provider, validate that the returned title is in the
    watchlist. Retries once with the bad title added to the refused list.
    """
    filtered = _prefilter(films, answers)

    async def attempt(extra_refused: list[str]) -> dict:
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": _build_user_prompt(filtered, answers, refused_titles + extra_refused),
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
        return await attempt([])
    except _TitleNotInWatchlist as e:
        try:
            return await attempt([e.bad_title])
        except _TitleNotInWatchlist:
            raise HTTPException(
                502,
                "validation:Le provider IA n'a pas retourné un titre de ta watchlist après deux tentatives.",
            )
