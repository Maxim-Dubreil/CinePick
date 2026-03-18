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
| Hébergement backend | Railway | free tier | Scraping + TMDB uniquement |

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
│   ├── main.py              ← App FastAPI (scraping + TMDB uniquement, PAS d'IA)
│   ├── scraper.py           ← Logique scraping Letterboxd
│   ├── tmdb.py              ← Client TMDB (enrichissement films)
│   ├── models.py            ← Pydantic models (Film, WatchlistResponse, etc.)
│   ├── requirements.txt
│   ├── .env.example         ← TMDB_API_KEY uniquement
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
        │   ├── api.ts           ← Appels backend (scraping/TMDB)
        │   └── llm.ts           ← Appels IA directs (Gemini/Groq/OpenAI/Anthropic)
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

### `POST /recommend`
Envoie la watchlist + réponses aux questions à Gemini et retourne une recommandation.

**Body :**
```json
{
  "watchlist": [...],
  "answers": {
    "energy": "chill",
    "company": "solo",
    "duration": "medium",
    "mood": "moved"
  },
  "refused_titles": ["The Brutalist", "Nosferatu"],
  "refused_reasons": ["swipé", "swipé"]
}
```

**Response :**
```json
{
  "film": {
    "title": "Past Lives",
    "reason": "Pour une soirée seul avec l'énergie d'une réflexion douce...",
    "match_score": 94,
    "mood_tags": ["mélancolie douce", "amour", "identité"],
    "warning": null,
    "poster": "https://...",
    "overview": "...",
    "runtime": 106,
    "genres": ["Drame", "Romance"],
    "providers": ["MUBI"],
    "tmdb_url": "https://..."
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
GEMINI_API_KEY=
```

**App `src/services/api.ts` :**
```typescript
const BASE_URL = "http://localhost:8000" // dev
// const BASE_URL = "https://ton-app.up.railway.app" // prod
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
