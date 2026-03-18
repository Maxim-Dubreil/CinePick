/**
 * LLM service — routes all AI calls through the Railway backend proxy.
 *
 * Security:
 * - Communication with Railway is over HTTPS (TLS) → the API key is encrypted
 *   in transit and never intercepted in plain text.
 * - X-App-Token header identifies requests as coming from CinePick. Set
 *   APP_TOKEN in Railway env vars to the same value to enable the check.
 * - The key is never stored server-side; Railway only forwards it.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { AIProvider, Answers, Film } from '../types'
import { BASE_URL } from './api'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEYS = {
  AI_PROVIDER: 'ai_provider',
  AI_API_KEY: 'ai_api_key',
} as const

/**
 * Simple app token sent in X-App-Token header.
 * Set APP_TOKEN to this value in Railway to restrict access to CinePick only.
 * HTTPS (TLS) is the primary security — this is an additional layer.
 */
const APP_TOKEN = 'cinepick-v1'

const REQUEST_TIMEOUT_MS = 15_000 // slightly higher than backend (10s) to account for cold start

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

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw new LLMError('network', 'Timeout — le proxy IA ne répond pas (cold start Railway ?).')
    }
    throw new LLMError('network', "Erreur réseau lors de l'appel au proxy IA.")
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Parse a non-OK response from the Railway backend.
 * The backend returns { detail: "kind:message" } for all AI errors.
 */
async function parseBackendError(res: Response): Promise<LLMError> {
  let detail = ''
  try {
    const data = await res.json()
    detail = data.detail ?? ''
  } catch {
    detail = `network:Erreur HTTP ${res.status}`
  }
  const colonIdx = detail.indexOf(':')
  if (colonIdx > 0) {
    const kind = detail.slice(0, colonIdx) as LLMErrorKind
    const message = detail.slice(colonIdx + 1)
    const validKinds: LLMErrorKind[] = ['invalid_key', 'quota_exceeded', 'network', 'validation', 'parse']
    if (validKinds.includes(kind)) return new LLMError(kind, message)
  }
  return new LLMError('network', detail || `Erreur HTTP ${res.status}`)
}

function proxyHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'X-App-Token': APP_TOKEN,
  }
}

// ---------------------------------------------------------------------------
// testApiKey()
// ---------------------------------------------------------------------------

export async function testApiKey(provider: AIProvider, key: string): Promise<true> {
  const res = await fetchWithTimeout(`${BASE_URL}/ai/test-key`, {
    method: 'POST',
    headers: proxyHeaders(),
    body: JSON.stringify({ provider, api_key: key }),
  })
  if (!res.ok) throw await parseBackendError(res)
  return true
}

// ---------------------------------------------------------------------------
// recommend()
// ---------------------------------------------------------------------------

export async function recommend(params: RecommendParams): Promise<Recommendation> {
  const { watchlist, answers, refusedTitles } = params

  const [providerRaw, keyRaw] = await AsyncStorage.multiGet([
    STORAGE_KEYS.AI_PROVIDER,
    STORAGE_KEYS.AI_API_KEY,
  ])

  const provider = (providerRaw[1] ?? 'gemini') as AIProvider
  const apiKey = keyRaw[1]

  if (!apiKey) {
    throw new LLMError('invalid_key', 'Aucune clé API configurée.')
  }

  const res = await fetchWithTimeout(`${BASE_URL}/ai/recommend`, {
    method: 'POST',
    headers: proxyHeaders(),
    body: JSON.stringify({
      provider,
      api_key: apiKey,
      films: watchlist.map((f) => ({
        title: f.title,
        year: f.year,
        genres: f.genres,
        runtime: f.runtime,
      })),
      answers,
      refused_titles: refusedTitles,
    }),
  })

  if (!res.ok) throw await parseBackendError(res)

  const data = await res.json()
  return data.recommendation as Recommendation
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
