# ARCHITECTURE.md — CinePick

## Stack

| Couche | Techno | Version | Rôle |
|--------|--------|---------|------|
| App mobile | Expo + React Native | SDK 55 | iOS app |
| Langage app | TypeScript | 5.x | Typage strict |
| Backend | FastAPI | 0.115 | API REST |
| Langage backend | Python | 3.11+ | Scraping + IA |
| IA | Gemini / Groq / OpenAI / Anthropic | Choix utilisateur | Recommandation |
| Films | TMDB API | v3 | Affiches, résumés, providers |
| Scraping | httpx + BeautifulSoup4 | latest | Letterboxd |
| Storage local | AsyncStorage | 2.2.0 | Cache watchlist + clé API + état |
| Hébergement backend | Railway | free tier | Scraping + TMDB + proxy IA |

---

## Structure des fichiers

```
cinepick/
│
├── AGENTS.md
├── PRD.md
├── ARCHITECTURE.md
├── TASKS.md
│
├── design/
│   └── tokens.json          ← Source de vérité du thème (couleurs, fonts, spacing, radius)
│
├── backend/
│   ├── main.py              ← App FastAPI (scraping + TMDB + proxy IA)
│   ├── ai.py                ← Proxy IA : routing vers Gemini/Groq/OpenAI/Anthropic
│   ├── scraper.py           ← Logique scraping Letterboxd
│   ├── tmdb.py              ← Client TMDB (enrichissement films)
│   ├── models.py            ← Pydantic models (Film, WatchlistResponse, AI*, etc.)
│   ├── requirements.txt
│   ├── .env.example         ← TMDB_API_KEY + APP_TOKEN
│   └── tests/
│       ├── test_scraper.py
│       └── test_tmdb.py
│
└── app/
    ├── App.tsx              ← Entry point, navigation state machine
    ├── app.json             ← Config Expo
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── theme/
        │   ├── tokens.ts        ← Import + typage de design/tokens.json
        │   └── useTheme.ts      ← Hook React qui expose le thème
        │
        ├── types/
        │   └── index.ts         ← Types globaux (Film, Answer, Screen, etc.)
        │
        ├── services/
        │   ├── api.ts           ← Appels backend (scraping/TMDB) — exporte BASE_URL
        │   └── llm.ts           ← Appels IA via proxy Railway (Gemini/Groq/OpenAI/Anthropic)
        │
        ├── screens/
        │   ├── onboarding/
        │   │   ├── WelcomeScreen.tsx       ← Écran 1 : présentation app
        │   │   ├── InstructionsScreen.tsx  ← Écran 2 : guide profil public
        │   │   └── ConnectScreen.tsx       ← Écran 3 : username + scraping
        │   ├── HomeScreen.tsx              ← Accueil, sync, bouton principal
        │   └── QuestionsScreen.tsx         ← Flow Kahoot 4 questions
        │
        └── components/
            ├── FilmCard.tsx         ← Carte swipeable (affiche + infos + swipe)
            ├── SwipeOverlay.tsx     ← Overlays LIKE/SKIP animés
            ├── ProgressBar.tsx      ← Barre de progression questions
            ├── OnboardingStepper.tsx ← 3 points de progression wizard
            └── ErrorBanner.tsx      ← Bandeau d'erreur réutilisable
```

---

## Endpoints Backend

### `GET /health`
Vérifie que l'API est up.
```json
{ "status": "ok" }
```

### `GET /watchlist/{username}`
Scrape la watchlist Letterboxd et enrichit chaque film via TMDB.
- Paramètre : `username` (string)
- Pagination automatique (max 20 pages = ~560 films)
- Enrichissement TMDB : poster, overview, genres, runtime, providers FR
- Erreur 404 si profil introuvable ou watchlist vide

**Response :**
```json
{
  "count": 142,
  "films": [
    {
      "title": "The Brutalist",
      "year": "2024",
      "slug": "the-brutalist",
      "poster": "https://image.tmdb.org/t/p/w500/...",
      "overview": "...",
      "tmdb_id": 12345,
      "genres": ["Drame", "Histoire"],
      "runtime": 215,
      "providers": ["Canal+", "Netflix"],
      "tmdb_url": "https://www.themoviedb.org/movie/12345"
    }
  ]
}
```

### `POST /ai/test-key`
Valide une clé API auprès du provider choisi (~10 tokens). Utilisé lors de l'onboarding.

**Headers :** `X-App-Token: cinepick-v1`

**Body :**
```json
{ "provider": "groq", "api_key": "gsk_..." }
```

**Response :** `{ "status": "ok" }`

**Erreurs :** `400 invalid_key:…` / `429 quota_exceeded:…` / `502 network:…`

---

### `POST /ai/recommend`
Construit le prompt, appelle le provider, valide la réponse. Retry automatique si le titre n'est pas dans la watchlist.

**Headers :** `X-App-Token: cinepick-v1`

**Body :**
```json
{
  "provider": "groq",
  "api_key": "gsk_...",
  "films": [
    { "title": "Past Lives", "year": "2023", "genres": ["Drame"], "runtime": 106 }
  ],
  "answers": { "energy": "chill", "duration": "medium" },
  "refused_titles": ["The Brutalist"]
}
```

**Response :**
```json
{
  "recommendation": {
    "title": "Past Lives",
    "reason": "Pour une soirée seul avec l'énergie d'une réflexion douce...",
    "match_score": 94,
    "mood_tags": ["mélancolie douce", "amour", "identité"],
    "warning": null
  }
}
```

---

## State Machine de l'app (App.tsx)

```
[Premier lancement]
welcome → api_key → instructions → connect → (loading) → (success) → home
                                                 ↓ erreur
                                             connect (avec message)

[Lancement suivant — watchlist en cache]
home → questions → loading → result
         ↑                      |
         └──── (3 swipes) ──────┘
                                |
                      swipe 1-2: loading → result
```

**États complets :**
- `welcome` : écran 1 onboarding
- `api_key` : écran 2 onboarding (choix provider + saisie clé)
- `instructions` : écran 3 onboarding (guide profil public Letterboxd)
- `connect` : écran 4 onboarding (saisie username + scraping)
- `home` : écran d'accueil principal
- `questions` : flow 4 questions
- `loading` : appel API IA en cours
- `result` : carte film affichée

**État global (dans App.tsx) :**
```typescript
watchlist: Film[]
username: string
answers: Record<string, string>
currentFilm: Film | null
swipeCount: number          // 0-3, reset après 3
refusedTitles: string[]     // accumule au fil des skips
lastSync: number | null     // timestamp
// Clé API (jamais dans l'état React — lue depuis AsyncStorage à la demande)
```

**Clé API — stockage AsyncStorage :**
```typescript
'ai_provider'    // 'gemini' | 'groq' | 'openai' | 'anthropic'
'ai_api_key'     // string — clé saisie dans l'onboarding
```

---

## Thème & Design Tokens

Toutes les valeurs visuelles sont dans `design/tokens.json`.
Dans l'app, elles sont accessibles via `useTheme()` :

```typescript
const theme = useTheme()
// theme.colors.bg, theme.colors.accent, theme.fonts.display, theme.spacing.lg...
```

**Jamais** de valeur hardcodée dans un composant. Même `"#fff"` est interdit.

---

## Variables d'environnement

**Backend `.env` :**
```
TMDB_API_KEY=
APP_TOKEN=cinepick-v1   # secret partagé avec l'app pour sécuriser le proxy IA
```

**App `src/services/api.ts` :**
```typescript
export const BASE_URL = "http://192.168.68.108:8000" // dev
// export const BASE_URL = "https://cinepick-production-95bc.up.railway.app" // prod
```

**App `src/services/llm.ts` :**
```typescript
const APP_TOKEN = 'cinepick-v1' // doit correspondre à APP_TOKEN côté Railway
```

---

## Dépendances app

```json
{
  "expo": "~55.0.7",
  "react": "18.3.1",
  "react-native": "0.76.9",
  "@react-native-async-storage/async-storage": "2.2.0"
}
```

## Dépendances backend

```
fastapi==0.115.0
uvicorn==0.30.6
httpx==0.27.2
beautifulsoup4==4.12.3
google-generativeai==0.8.3
python-dotenv==1.0.1
pydantic==2.9.2
pytest==8.3.0
pytest-asyncio==0.23.0
```
