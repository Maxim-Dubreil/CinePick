export type Screen =
  | 'welcome'
  | 'api_key'
  | 'instructions'
  | 'connect'
  | 'home'
  | 'questions'
  | 'loading'
  | 'result'

export type OnboardingError = 'not_found' | 'private' | 'network' | null

// Gemini Flash 2.0 (free, recommended) / Groq Llama 3.3 70B (free, generous)
// OpenAI GPT-4o mini / Anthropic Claude Haiku (both paid)
export type AIProvider = 'gemini' | 'groq' | 'openai' | 'anthropic'

export type Film = {
  title: string
  year?: string
  slug?: string
  poster?: string | null
  overview?: string | null
  tmdb_id?: number | null
  genres?: string[]
  runtime?: number | null
  providers?: string[]
  tmdb_url?: string | null
  // Fields added by the AI recommendation
  reason?: string
  match_score?: number
  mood_tags?: string[]
  warning?: string | null
}

export type QuestionOption = {
  label: string
  value: string
  emoji: string
  color: string
}

export type Question = {
  id: string
  question: string
  emoji: string
  options: QuestionOption[]
}

export type Answers = Record<string, string>

export type AppState = {
  screen: Screen
  username: string
  watchlist: Film[]
  answers: Answers
  currentFilm: Film | null
  swipeCount: number
  refusedTitles: string[]
  lastSync: number | null
  error: string
}
