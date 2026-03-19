import AsyncStorage from '@react-native-async-storage/async-storage'
import { Film } from '../types'

// const BASE_URL = 'http://192.168.68.108:8000' // dev — IP locale de la machine
export const BASE_URL = 'https://cinepick-production-95bc.up.railway.app' // prod

// ---------------------------------------------------------------------------
// Dev mock — point d'activation unique
// ---------------------------------------------------------------------------
// Mettre à true pour développer sans backend ni clé API réelle.
// Toutes les fonctions réseau retournent des fixtures de mockData.ts.
// ⚠️ Toujours false avant commit — c'est la seule ligne à changer.
export const DEV_MOCK = false

const STORAGE_KEYS = {
  WATCHLIST: 'watchlist',
  LAST_SYNC: 'last_sync',
  USERNAME: 'username',
  ONBOARDING_COMPLETE: 'onboarding_complete',
  SYNC_DISMISSED_AT: 'sync_dismissed_at',
} as const

const SYNC_REMINDER_DAYS = 7
const SYNC_DISMISS_DAYS = 3
const REQUEST_TIMEOUT_MS = 30_000 // 30s pour absorber le cold start Railway (3-5s) + scraping

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    return await fetch(url, { signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

// ---------------------------------------------------------------------------
// Onboarding
// ---------------------------------------------------------------------------

/**
 * Ping /health to wake up Railway before the real request.
 * Silently ignores errors — warming up is best-effort.
 */
export async function warmBackend(): Promise<void> {
  try {
    await fetchWithTimeout(`${BASE_URL}/health`)
  } catch {
    // ignore — if it fails the main request will handle the error
  }
}

export async function isOnboardingComplete(): Promise<boolean> {
  if (DEV_MOCK) return true
  const value = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETE)
  return value === 'true'
}

export async function setOnboardingComplete(): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, 'true')
}

// ---------------------------------------------------------------------------
// Watchlist — cache
// ---------------------------------------------------------------------------

export async function getCachedWatchlist(): Promise<Film[]> {
  if (DEV_MOCK) {
    const { MOCK_WATCHLIST, MOCK_USERNAME } = await import('../dev/mockData')
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.WATCHLIST, JSON.stringify(MOCK_WATCHLIST)],
      [STORAGE_KEYS.LAST_SYNC, Date.now().toString()],
      [STORAGE_KEYS.USERNAME, MOCK_USERNAME],
    ])
    return MOCK_WATCHLIST
  }
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.WATCHLIST)
  if (!raw) return []
  try {
    return JSON.parse(raw) as Film[]
  } catch {
    return []
  }
}

export async function getLastSyncTime(): Promise<number | null> {
  if (DEV_MOCK) return Date.now()
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC)
  return raw ? parseInt(raw, 10) : null
}

async function saveWatchlist(films: Film[]): Promise<void> {
  await AsyncStorage.multiSet([
    [STORAGE_KEYS.WATCHLIST, JSON.stringify(films)],
    [STORAGE_KEYS.LAST_SYNC, Date.now().toString()],
  ])
}

// ---------------------------------------------------------------------------
// Watchlist — sync policy
// ---------------------------------------------------------------------------

/** True if the watchlist has never been synced or last sync > 7 days ago. */
export async function shouldSyncReminder(): Promise<boolean> {
  const lastSync = await getLastSyncTime()
  if (!lastSync) return true
  const elapsed = Date.now() - lastSync
  return elapsed > SYNC_REMINDER_DAYS * 24 * 60 * 60 * 1000
}

/** Record that the user dismissed the sync reminder banner. */
export async function dismissSyncReminder(): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.SYNC_DISMISSED_AT, Date.now().toString())
}

/**
 * True if the reminder should be shown:
 * - shouldSyncReminder() is true, AND
 * - the banner was not dismissed within the last 3 days.
 */
export async function shouldShowSyncBanner(): Promise<boolean> {
  if (!(await shouldSyncReminder())) return false
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.SYNC_DISMISSED_AT)
  if (!raw) return true
  const elapsed = Date.now() - parseInt(raw, 10)
  return elapsed > SYNC_DISMISS_DAYS * 24 * 60 * 60 * 1000
}

// ---------------------------------------------------------------------------
// Watchlist — fetch from backend
// ---------------------------------------------------------------------------

export async function fetchWatchlist(username: string): Promise<Film[]> {
  if (DEV_MOCK) {
    const { MOCK_DELAY_MS, MOCK_WATCHLIST, MOCK_USERNAME } = await import('../dev/mockData')
    await new Promise(r => setTimeout(r, MOCK_DELAY_MS))
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.WATCHLIST, JSON.stringify(MOCK_WATCHLIST)],
      [STORAGE_KEYS.LAST_SYNC, Date.now().toString()],
      [STORAGE_KEYS.USERNAME, MOCK_USERNAME],
    ])
    return MOCK_WATCHLIST
  }

  const response = await fetchWithTimeout(`${BASE_URL}/watchlist/${username}`)

  if (response.status === 404) {
    throw Object.assign(new Error(`Profil "${username}" introuvable sur Letterboxd.`), {
      kind: 'not_found',
    })
  }
  if (response.status === 403) {
    throw Object.assign(new Error(`La watchlist de "${username}" est privée.`), {
      kind: 'private',
    })
  }
  if (!response.ok) {
    throw Object.assign(new Error('Erreur réseau lors de la récupération de la watchlist.'), {
      kind: 'network',
    })
  }

  const data = await response.json()
  const films: Film[] = data.films

  await saveWatchlist(films)
  await AsyncStorage.setItem(STORAGE_KEYS.USERNAME, username)

  return films
}
