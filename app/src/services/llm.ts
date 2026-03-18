import AsyncStorage from '@react-native-async-storage/async-storage'
import { AIProvider, Answers, Film } from '../types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEYS = {
  AI_PROVIDER: 'ai_provider',
  AI_API_KEY: 'ai_api_key',
} as const

const PROVIDER_CONFIG: Record<AIProvider, { model: string; label: string }> = {
  gemini:    { model: 'gemini-2.0-flash',          label: 'Gemini Flash 2.0' },
  groq:      { model: 'llama-3.3-70b-versatile',   label: 'Llama 3.3 70B'   },
  openai:    { model: 'gpt-4o-mini',               label: 'GPT-4o mini'      },
  anthropic: { model: 'claude-3-5-haiku-20241022', label: 'Claude Haiku'     },
}

const REQUEST_TIMEOUT_MS = 10_000

const SYSTEM_PROMPT = `Tu es un expert en recommandation de films.
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
- warning : string | null — mise en garde si contenu sensible, sinon null`

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export type LLMErrorKind = 'invalid_key' | 'quota_exceeded' | 'network' | 'validation' | 'parse'

export class LLMError extends Error {
  constructor(
    public readonly kind: LLMErrorKind,
    message: string,
  ) {
    super(message)
    this.name = 'LLMError'
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RecommendParams = {
  watchlist: Film[]
  answers: Answers
  refusedTitles: string[]
}

export type Recommendation = Pick<Film, 'title' | 'reason' | 'match_score' | 'mood_tags' | 'warning'>

type Message = { role: 'user' | 'assistant' | 'system'; content: string }

// ---------------------------------------------------------------------------
// Watchlist compression
// ---------------------------------------------------------------------------

function compressWatchlist(films: Film[]): string {
  return films
    .map((f) => {
      const genres = f.genres?.slice(0, 2).join(',') ?? ''
      const runtime = f.runtime ?? ''
      return `${f.title}|${f.year ?? ''}|${genres}|${runtime}`
    })
    .join('\n')
}

// ---------------------------------------------------------------------------
// Pre-filter (only applied when > 200 films)
// ---------------------------------------------------------------------------

function prefilter(films: Film[], answers: Answers): Film[] {
  if (films.length <= 200) return films

  const duration = answers['duration']
  let filtered = films

  if (duration === 'short') {
    filtered = films.filter((f) => !f.runtime || f.runtime <= 95)
  } else if (duration === 'medium') {
    filtered = films.filter((f) => f.runtime != null && f.runtime >= 90 && f.runtime <= 125)
  } else if (duration === 'long') {
    filtered = films.filter((f) => !f.runtime || f.runtime >= 120)
  }

  // Fallback: if filter is too restrictive, take first 200
  if (filtered.length < 20) {
    return films.slice(0, 200)
  }

  return filtered
}

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw new LLMError('network', 'Timeout — le provider IA ne répond pas.')
    }
    throw new LLMError('network', 'Erreur réseau lors de l\'appel au provider IA.')
  } finally {
    clearTimeout(timer)
  }
}

function handleHttpError(status: number, provider: AIProvider, rawBody: string): never {
  console.log(`[LLM] ${provider} HTTP ${status}:`, rawBody)

  // Gemini-specific: 429 can mean "API not enabled" or "daily quota exceeded"
  // Distinguish by checking the error status string in the body
  if (status === 429 && provider === 'gemini') {
    const isApiDisabled =
      rawBody.includes('SERVICE_DISABLED') ||
      rawBody.includes('API_NOT_ENABLED') ||
      rawBody.includes('has not been used in project') ||
      rawBody.includes('it is disabled')
    if (isApiDisabled) {
      throw new LLMError(
        'invalid_key',
        "L'API Gemini n'est pas activée dans ton projet Google. Active-la sur aistudio.google.com.",
      )
    }
  }

  if (status === 401 || status === 403) {
    throw new LLMError('invalid_key', `Clé API ${PROVIDER_CONFIG[provider].label} invalide ou expirée.`)
  }
  if (status === 429) {
    throw new LLMError('quota_exceeded', `Quota ${PROVIDER_CONFIG[provider].label} dépassé.`)
  }
  throw new LLMError('network', `Erreur HTTP ${status} du provider ${PROVIDER_CONFIG[provider].label}.`)
}

// ---------------------------------------------------------------------------
// Provider-specific callers
// ---------------------------------------------------------------------------

async function callOpenAICompatible(
  endpoint: string,
  key: string,
  model: string,
  messages: Message[],
  provider: AIProvider,
): Promise<string> {
  const res = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ model, messages, max_tokens: 512 }),
  })

  if (!res.ok) {
    const rawBody = await res.text()
    handleHttpError(res.status, provider, rawBody)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? ''
}

async function callGemini(key: string, model: string, messages: Message[]): Promise<string> {
  const userMessages = messages.filter((m) => m.role !== 'system')
  const systemMsg = messages.find((m) => m.role === 'system')

  const contents = userMessages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const body: Record<string, unknown> = { contents }
  if (systemMsg) {
    body.systemInstruction = { parts: [{ text: systemMsg.content }] }
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const rawBody = await res.text()
    handleHttpError(res.status, 'gemini', rawBody)
  }

  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

async function callAnthropic(key: string, model: string, messages: Message[]): Promise<string> {
  const systemMsg = messages.find((m) => m.role === 'system')
  const userMessages = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role, content: m.content }))

  const body: Record<string, unknown> = {
    model,
    max_tokens: 512,
    messages: userMessages,
  }
  if (systemMsg) body.system = systemMsg.content

  const res = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const rawBody = await res.text()
    handleHttpError(res.status, 'anthropic', rawBody)
  }

  const data = await res.json()
  return data.content?.[0]?.text ?? ''
}

// ---------------------------------------------------------------------------
// Route call to the right provider
// ---------------------------------------------------------------------------

async function callProvider(
  provider: AIProvider,
  key: string,
  messages: Message[],
): Promise<string> {
  const { model } = PROVIDER_CONFIG[provider]

  switch (provider) {
    case 'gemini':
      return callGemini(key, model, messages)

    case 'groq':
      return callOpenAICompatible(
        'https://api.groq.com/openai/v1/chat/completions',
        key,
        model,
        messages,
        'groq',
      )

    case 'openai':
      return callOpenAICompatible(
        'https://api.openai.com/v1/chat/completions',
        key,
        model,
        messages,
        'openai',
      )

    case 'anthropic':
      return callAnthropic(key, model, messages)
  }
}

// ---------------------------------------------------------------------------
// JSON parsing helper
// ---------------------------------------------------------------------------

function parseRecommendation(raw: string): Recommendation {
  // Strip markdown code fences if present
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()

  try {
    const parsed = JSON.parse(cleaned)
    return {
      title: parsed.title,
      reason: parsed.reason,
      match_score: parsed.match_score,
      mood_tags: parsed.mood_tags,
      warning: parsed.warning ?? null,
    }
  } catch {
    throw new LLMError('parse', 'La réponse du provider IA n\'est pas un JSON valide.')
  }
}

// ---------------------------------------------------------------------------
// Build user prompt
// ---------------------------------------------------------------------------

function buildUserPrompt(films: Film[], answers: Answers, refusedTitles: string[]): string {
  const parts: string[] = []

  parts.push('## Watchlist (format: titre|année|genres|durée_min)\n' + compressWatchlist(films))

  if (Object.keys(answers).length > 0) {
    const answersText = Object.entries(answers)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n')
    parts.push('## Préférences de l\'utilisateur\n' + answersText)
  }

  if (refusedTitles.length > 0) {
    parts.push('## Films déjà refusés (NE PAS proposer)\n' + refusedTitles.join('\n'))
  }

  parts.push('Recommande UN film de cette watchlist en tenant compte de ces préférences.')

  return parts.join('\n\n')
}

// ---------------------------------------------------------------------------
// Main: recommend()
// ---------------------------------------------------------------------------

export async function recommend(params: RecommendParams): Promise<Recommendation> {
  const { answers, refusedTitles } = params

  const [providerRaw, key] = await AsyncStorage.multiGet([
    STORAGE_KEYS.AI_PROVIDER,
    STORAGE_KEYS.AI_API_KEY,
  ])

  const provider = (providerRaw[1] ?? 'gemini') as AIProvider
  const apiKey = key[1]

  if (!apiKey) {
    throw new LLMError('invalid_key', 'Aucune clé API configurée.')
  }

  const filteredFilms = prefilter(params.watchlist, answers)

  const messages: Message[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: buildUserPrompt(filteredFilms, answers, refusedTitles) },
  ]

  const attempt = async (extraRefused: string[]): Promise<Recommendation> => {
    const msgs = extraRefused.length > 0
      ? [
          messages[0],
          {
            role: 'user' as const,
            content: buildUserPrompt(filteredFilms, answers, [...refusedTitles, ...extraRefused]),
          },
        ]
      : messages

    const raw = await callProvider(provider, apiKey, msgs)
    const rec = parseRecommendation(raw)

    // Validate title is in watchlist (case-insensitive)
    const titleLower = rec.title.toLowerCase()
    const found = filteredFilms.some((f) => f.title.toLowerCase() === titleLower)

    if (!found) {
      throw new Error(`title_not_in_watchlist:${rec.title}`)
    }

    return rec
  }

  try {
    return await attempt([])
  } catch (err) {
    const msg = (err as Error).message
    if (msg.startsWith('title_not_in_watchlist:')) {
      const badTitle = msg.replace('title_not_in_watchlist:', '')
      // Retry once with the bad title added to refused list
      try {
        return await attempt([badTitle])
      } catch (retryErr) {
        const retryMsg = (retryErr as Error).message
        if (retryMsg.startsWith('title_not_in_watchlist:')) {
          throw new LLMError('validation', 'Le provider IA n\'a pas retourné un titre de ta watchlist après deux tentatives.')
        }
        throw retryErr
      }
    }
    throw err
  }
}

// ---------------------------------------------------------------------------
// testApiKey()
// ---------------------------------------------------------------------------

export async function testApiKey(provider: AIProvider, key: string): Promise<true> {
  const messages: Message[] = [
    { role: 'user', content: 'Réponds juste: ok' },
  ]

  await callProvider(provider, key, messages)
  return true
}

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

export async function getStoredProvider(): Promise<{ provider: AIProvider | null; key: string | null }> {
  const results = await AsyncStorage.multiGet([STORAGE_KEYS.AI_PROVIDER, STORAGE_KEYS.AI_API_KEY])
  return {
    provider: (results[0][1] as AIProvider | null) ?? null,
    key: results[1][1] ?? null,
  }
}

export async function saveProviderConfig(provider: AIProvider, key: string): Promise<void> {
  await AsyncStorage.multiSet([
    [STORAGE_KEYS.AI_PROVIDER, provider],
    [STORAGE_KEYS.AI_API_KEY, key],
  ])
}
