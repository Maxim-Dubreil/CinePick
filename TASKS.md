# TASKS.md — CinePick

Chaque tâche est indépendante et testable. L'agent coche `[x]` quand c'est fait.
Respecter l'ordre des phases — chaque phase dépend de la précédente.

---

## Phase 0 — Setup projet

- [x] **TASK-01** — Init backend Python
  - Créer `backend/` avec structure définie dans ARCHITECTURE.md
  - Créer `requirements.txt`, `.env.example`
  - Créer `backend/main.py` avec app FastAPI vide + endpoint `/health`
  - **Test** : `curl http://localhost:8000/health` retourne `{"status":"ok"}`

- [x] **TASK-02** — Init app Expo
  - `npx create-expo-app app --template blank-typescript`
  - Installer `@react-native-async-storage/async-storage`
  - Créer la structure de dossiers `src/` décrite dans ARCHITECTURE.md (fichiers vides avec export placeholder)
  - Créer le dossier `src/screens/onboarding/`
  - **Test** : `npx expo start` lance sans erreur

- [x] **TASK-03** — Système de thème
  - Créer `design/tokens.json` (valeurs dans TASKS.md section Tokens)
  - Créer `app/src/theme/tokens.ts` (import + type `Theme`)
  - Créer `app/src/theme/useTheme.ts` (hook qui retourne le thème)
  - **Test** : Importer `useTheme` dans `App.tsx` et `console.log(theme.colors.bg)` → affiche la valeur

- [x] **TASK-04** — Types globaux
  - Créer `app/src/types/index.ts` avec tous les types (voir section Types ci-dessous)
  - Le type `Screen` doit inclure les états onboarding : `'welcome' | 'api_key' | 'instructions' | 'connect' | 'home' | 'questions' | 'loading' | 'result'`
  - Ajouter type `OnboardingError` : `'not_found' | 'private' | 'network' | null`
  - Ajouter type `AIProvider` : `'gemini' | 'groq' | 'openai' | 'anthropic'`
  - Lire CONSTRAINTS.md pour les estimations de tokens et les modèles supportés
  - **Test** : `npx tsc --noEmit` sans erreur

---

## Phase 1 — Backend core

- [x] **TASK-05** — Scraper Letterboxd
  - Créer `backend/scraper.py` avec fonction `scrape_watchlist(username) -> list[dict]`
  - Pagination automatique (28 films/page, max 20 pages)
  - Parser les champs : title, year, slug
  - Gérer les cas d'erreur (profil privé, inexistant, watchlist vide)
  - **Test** : `python -c "import asyncio; from scraper import scrape_watchlist; print(asyncio.run(scrape_watchlist('ton_username'))[:3])"`

- [x] **TASK-06** — Client TMDB
  - Créer `backend/tmdb.py` avec fonction `enrich_film(title, year) -> dict`
  - Champs : poster_url, overview, tmdb_id, genres, runtime, providers_fr, tmdb_url
  - Gérer l'absence de résultats TMDB (retourner dict avec None)
  - **Test** : `python -c "from tmdb import enrich_film; import asyncio; print(asyncio.run(enrich_film('Past Lives', '2023')))"`

- [x] **TASK-07** — ~~Client Gemini backend~~ → **Réactivé via TASK-28** : le backend contient maintenant `ai.py` qui proxifie tous les providers (Gemini, Groq, OpenAI, Anthropic). Voir TASK-28.

- [x] **TASK-08** — Pydantic models
  - Créer `backend/models.py` avec `Film`, `RecommendRequest`, `RecommendResponse`
  - Typer tous les champs avec Optional là où c'est justifié
  - **Test** : `python -c "from models import Film; f = Film(title='Test', year='2023'); print(f)"`

- [x] **TASK-09** — Endpoints FastAPI
  - Compléter `backend/main.py` avec `GET /watchlist/{username}` et `POST /recommend`
  - Utiliser les modules scraper, tmdb, gemini, models
  - Gestion d'erreur HTTP (404, 500) avec messages clairs
  - **Test** : Swagger UI sur http://localhost:8000/docs → tester les deux endpoints

- [x] **TASK-10** — Tests backend
  - Créer `backend/tests/test_scraper.py` : test avec username public connu
  - Créer `backend/tests/test_tmdb.py` : test enrichissement film connu
  - Créer `backend/tests/test_gemini.py` : test reco avec mini watchlist mock
  - **Test** : `pytest backend/tests/ -v` → tous verts

---

## Phase 2 — App screens

- [x] **TASK-11** — Service API backend (app)
  - Créer `app/src/services/api.ts`
  - Méthodes : `fetchWatchlist`, `getCachedWatchlist`, `getLastSyncTime`, `shouldSync`
  - Méthode `isOnboardingComplete()` : lit le flag `onboarding_complete` dans AsyncStorage
  - Cache AsyncStorage avec timestamp
  - **Test** : Brancher sur le backend local, appeler `fetchWatchlist('username_test')` depuis App.tsx

- [x] **TASK-11b** — Service LLM multi-provider (app)
  - Créer `app/src/services/llm.ts`
  - Interface commune `recommend(params)` qui route selon le provider stocké en AsyncStorage
  - Supporter : `gemini` (google generativeai REST), `groq` (openai-compatible), `openai`, `anthropic`
  - Compression watchlist avant envoi : format condensé `"titre|année|genre1,genre2|durée"` (voir CONSTRAINTS.md)
  - Pré-filtrage watchlist > 200 films selon réponses questions (durée, énergie) avant envoi
  - Méthode `testApiKey(provider, key)` : appel minimal ~10 tokens pour valider la clé
  - Prompt système optimisé stocké comme constante `SYSTEM_PROMPT`
  - Réponse parsée + validation que le titre retourné est dans la watchlist (retry 1x sinon)
  - **Test** : `testApiKey('gemini', 'ta_clé')` → succès. `recommend(...)` → film dans la watchlist

- [x] **TASK-12** — Composant OnboardingStepper
  - Créer `app/src/components/OnboardingStepper.tsx`
  - Props : `total: number`, `current: number` (0-indexed)
  - 3 points : actif = `theme.colors.accent`, passé = `theme.colors.accentDark`, futur = `theme.colors.border`
  - **Test** : Afficher avec `current=1` → point du milieu actif

- [x] **TASK-13** — WelcomeScreen (Onboarding étape 1)
  - Créer `app/src/screens/onboarding/WelcomeScreen.tsx`
  - Grande icône 🎬, titre, tagline
  - 3 blocs features avec animation stagger (délai 100ms entre chaque, fadeUp)
  - Bouton "Commencer →"
  - Pas de bouton retour
  - **Test** : Les 3 blocs apparaissent bien en séquence au montage

- [x] **TASK-13b** — ApiKeyScreen (Onboarding étape 2)
  - Créer `app/src/screens/onboarding/ApiKeyScreen.tsx`
  - `OnboardingStepper` en haut (current=1, total=4)
  - Liste de 4 providers avec radio buttons (Gemini sélectionné par défaut)
  - Chaque provider affiche : nom, label gratuit/payant, quota/jour
  - Bouton "Comment obtenir ma clé →" → `Linking.openURL(providerDocUrl)`
  - Input clé API masquée (••••) avec bouton 👁 toggle
  - Bouton "Vérifier la clé →" → appelle `llm.testApiKey()` → loading → succès/erreur
  - Messages d'erreur inline typés (invalide / quota / réseau)
  - Sauvegarder `ai_provider` et `ai_api_key` dans AsyncStorage si succès
  - **Test** : Saisir une clé invalide → message erreur. Clé valide → slide vers étape suivante

- [x] **TASK-14** — InstructionsScreen (Onboarding étape 2)
  - Créer `app/src/screens/onboarding/InstructionsScreen.tsx`
  - `OnboardingStepper` en haut (current=1)
  - Liste numérotée 4 étapes pour rendre la watchlist publique
  - Bouton "Ouvrir Letterboxd ↗" → `Linking.openURL('https://letterboxd.com/settings/privacy/')`
  - Checkbox "C'est fait, ma watchlist est publique"
  - Bouton "Continuer →" désactivé (opacity 0.4) jusqu'à checkbox cochée
  - Bouton retour → WelcomeScreen
  - **Test** : Bouton continuer inactif → cocher checkbox → bouton s'active

- [x] **TASK-15** — ConnectScreen (Onboarding étape 3)
  - Créer `app/src/screens/onboarding/ConnectScreen.tsx`
  - `OnboardingStepper` en haut (current=2)
  - **État A (saisie)** : input username avec préfixe "letterboxd.com/", bouton "Charger →"
  - **État B (loading)** : 3 étapes animées séquentielles (⟳ en cours, ✓ terminé, grisé en attente), compteur films en temps réel
  - **État C (succès)** : coche animée spring, "X films prêts", bouton "C'est parti 🎬"
  - **État D (erreur)** : 3 messages distincts selon type (`not_found` / `private` / `network`) avec actions adaptées — voir ONBOARDING.md
  - Bouton retour → InstructionsScreen (seulement en état A)
  - **Test** : Tester les 4 états en mockant les réponses API

- [x] **TASK-16** — HomeScreen
  - Créer `app/src/screens/HomeScreen.tsx`
  - Affiche : username, nb films, date dernière sync
  - Bouton principal "Trouver mon film ce soir"
  - Bouton "↻ Sync Letterboxd"
  - Gestion erreur sync via `ErrorBanner`
  - **Test** : Vérifier que le nb de films correspond à la watchlist, que le sync met à jour le timestamp

- [x] **TASK-17** — Composants réutilisables
  - Créer `app/src/components/ErrorBanner.tsx` (bandeau rouge avec message)
  - Créer `app/src/components/ProgressBar.tsx` (barre animée 0-100%)
  - Créer `app/src/components/SwipeOverlay.tsx` (overlays LIKE/SKIP avec opacité animée)
  - Tous les composants utilisent `useTheme()` — zéro valeur hardcodée
  - **Test** : Afficher chaque composant isolément dans App.tsx

- [x] **TASK-18** — QuestionsScreen
  - Créer `app/src/screens/QuestionsScreen.tsx`
  - 4 questions définies en constante (voir PRD.md F2)
  - Une question plein écran à la fois
  - Grille 2x2 de boutons (emoji + label)
  - Animation slide entre questions (Animated API)
  - `ProgressBar` en haut
  - Callback `onComplete(answers)` quand toutes répondues
  - **Test** : Répondre aux 4 questions → `console.log` des answers

- [x] **TASK-19** — FilmCard
  - Créer `app/src/components/FilmCard.tsx`
  - PanResponder pour swipe (seuil : `theme.swipe.threshold` × largeur écran)
  - `SwipeOverlay` LIKE (droite) et SKIP (gauche)
  - Rotation pendant swipe : `theme.swipe.rotationDeg`
  - ScrollView interne pour les infos
  - Affiche TMDB (ou placeholder si null)
  - Score match, titre, meta (durée, genres), citation Gemini, providers, bouton TMDB
  - Callbacks `onAccept` et `onSwipe`
  - Boutons texte en bas "✕ Skip" et "Ce soir ✓"
  - **Test** : Afficher avec un film mocké, tester swipe dans les deux directions

---

## Phase 3 — Navigation & logique

- [x] **TASK-20** — State machine App.tsx
  - Implémenter la navigation entre screens dans `App.tsx`
  - Au lancement : vérifier `onboarding_complete` dans AsyncStorage
    - Si absent → démarrer à `welcome`
    - Si présent → vérifier watchlist cachée → démarrer à `home`
  - **Jamais de sync automatique au lancement** (voir CONSTRAINTS.md)
  - Au lancement sur `home` : vérifier `shouldSyncReminder()` → si sync > 7 jours → afficher bannière non-bloquante
  - Bannière dismissable : "Ta watchlist n'a pas été mise à jour depuis X jours. [Sync →] [Plus tard]"
  - Si ignorée, ne réapparaît pas avant 3 jours supplémentaires (stocker timestamp dismiss)
  - Gérer toutes les transitions définies dans ONBOARDING.md et ARCHITECTURE.md
  - **Test** : Premier lancement → `welcome`. Relancer après onboarding → `home` directement. Mocker lastSync > 7j → bannière apparaît.

- [x] **TASK-21** — Logique swipe & refus
  - Dans `App.tsx` : gérer `swipeCount` et `refusedTitles`
  - Swipe 1-2 : appel `recommend` direct avec les refus → nouvel écran result
  - Swipe 3 : reset swipeCount, retour `questions` avec bannière contextuelle
  - Les `refusedTitles` s'accumulent jusqu'au retour sur Home
  - **Test** : Swiper 3 films de suite → retour questions avec message "On affine !"

- [x] **TASK-22** — Loading screen
  - État `loading` : spinner + texte animé "Analyse de ta watchlist..."
  - Afficher le nombre de films analysés
  - **Test** : Vérifier que l'état loading s'affiche bien pendant l'appel API

- [x] **TASK-23** — Acceptance flow
  - Swipe droite ou bouton "Ce soir ✓" → Alert "Bon film 🍿 + titre"
  - Option "Recommencer" → reset total (answers, refus, swipeCount) → Home
  - **Test** : Accepter un film → alert → recommencer → Home propre

---

## Phase 4 — Polish & déploiement

- [x] **TASK-24** — Gestion d'erreurs globale
  - Timeout sur les appels API (10s)
  - Message d'erreur explicite si backend injoignable
  - Message d'erreur si Gemini retourne un film hors watchlist (fallback)
  - **Test** : Couper le backend → l'app affiche une erreur claire, ne crashe pas

- [x] **TASK-25** — UX details
  - Keyboard dismiss sur ConnectScreen quand on appuie hors input
  - SafeAreaView sur tous les screens
  - StatusBar dark content sur fond sombre
  - Haptic feedback léger sur le choix d'une option (questions) et sur les swipes
  - Transitions slide horizontales entre écrans onboarding
  - **Test** : Parcours complet sans accrocs visuels

- [x] **TASK-28** — Proxy IA via Railway (fix CORS web)
  - **Contexte** : l'app appelait les providers IA directement depuis le JS, ce qui fonctionne sur mobile (natif) mais est bloqué sur Expo Web par les restrictions CORS des navigateurs.
  - Créer `backend/ai.py` : logique complète de proxy IA (routing providers, compression watchlist, pre-filter, build prompt, parse & validate réponse, retry)
  - Ajouter modèles Pydantic dans `backend/models.py` : `AITestKeyRequest`, `FilmForAI`, `AIRecommendRequest`, `AIRecommendResponse`, `AIRecommendation`
  - Ajouter endpoints dans `backend/main.py` : `POST /ai/test-key` et `POST /ai/recommend`
  - Sécurité : middleware `X-App-Token` (activé si env var `APP_TOKEN` est définie dans Railway)
  - Exporter `BASE_URL` depuis `app/src/services/api.ts`
  - Réécrire `app/src/services/llm.ts` : suppression de tout le code provider direct, appels via proxy Railway uniquement
  - **Sécurité** : HTTPS (TLS) chiffre la clé en transit. `X-App-Token` empêche l'usage du proxy par des tiers. La clé n'est jamais stockée côté serveur.
  - Mettre à jour `.env.example`, `ARCHITECTURE.md`, `CONSTRAINTS.md`
  - **Test** : Saisir une clé Groq dans l'app web → "Vérifier la clé" → succès

- [x] **TASK-26** — Déploiement backend Railway ✓ Backend déployé sur Railway
  - Créer `backend/Procfile` : `web: uvicorn main:app --host 0.0.0.0 --port $PORT`
  - Créer `backend/runtime.txt` : `python-3.11.0`
  - Mettre à jour `BASE_URL` dans `app/src/services/api.ts` avec l'URL Railway
  - **Test** : `curl https://ton-app.up.railway.app/health` → OK

- [N/A] **TASK-27** — Build Expo production — Pas de compte développeur Apple, app distribuée via Expo Go
  - Configurer `app.json` (name, slug, ios.bundleIdentifier)
  - `npx expo build:ios` ou `eas build --platform ios`
  - **Test** : L'app tourne sur un vrai iPhone sans Expo Go

---

## Phase 5 — Features futures (ne pas coder maintenant)

- [ ] **TASK-29** — User Profile Context
  - Questionnaire avancé sur les goûts durables (réalisateurs préférés, ambiances, références)
  - Scraping des films notés/vus sur Letterboxd pour inférer le profil automatiquement
  - Profil stocké en JSON dans AsyncStorage
  - Checkbox "Utiliser mon profil" sur HomeScreen pour injecter ce contexte dans le prompt
  - **Ne pas implémenter avant validation du flow V1 complet**

- [ ] **TASK-30** — Sélection de la source avant le questionnaire
  - Écran de sélection avant le questionnaire : Ma watchlist / Mes favoris Letterboxd / Mes films récemment vus / La watchlist de @quelqu'un
  - Chaque source = scraping différent ou combinaison
  - L'IA reçoit le bon corpus selon la sélection
  - **Ne pas implémenter avant validation du flow V1 complet**

---

## Tokens de design (référence pour TASK-03)

Voici le contenu à mettre dans `design/tokens.json` :

```json
{
  "colors": {
    "bg": "#0d0d0f",
    "surface": "#141417",
    "surfaceAlt": "#1a1a1f",
    "border": "#2a2a30",
    "borderSubtle": "#1f1f24",
    "accent": "#e8c87d",
    "accentDark": "#c4a55a",
    "accentMuted": "rgba(232,200,125,0.12)",
    "text": "#e8e6e0",
    "textMuted": "#a8a6a0",
    "textSubtle": "#6b6b72",
    "textDisabled": "#3a3a42",
    "success": "#00f5a0",
    "error": "#ff6b6b",
    "errorMuted": "rgba(255,107,107,0.1)",
    "swipeAccept": "#4ecdc4",
    "swipeReject": "#ff6b6b"
  },
  "fonts": {
    "display": "serif",
    "mono": "monospace",
    "body": "System"
  },
  "fontSizes": {
    "xs": 10,
    "sm": 12,
    "base": 14,
    "md": 16,
    "lg": 20,
    "xl": 24,
    "xxl": 32,
    "display": 40
  },
  "spacing": {
    "xs": 4,
    "sm": 8,
    "md": 16,
    "lg": 24,
    "xl": 32,
    "xxl": 48,
    "screen": 20
  },
  "radius": {
    "sm": 8,
    "md": 12,
    "lg": 16,
    "xl": 20,
    "full": 9999
  },
  "shadows": {
    "card": {
      "shadowColor": "#000",
      "shadowOffset": { "width": 0, "height": 8 },
      "shadowOpacity": 0.4,
      "shadowRadius": 20,
      "elevation": 10
    }
  }
}
```

---

## Types globaux (référence pour TASK-04)

```typescript
// app/src/types/index.ts

export type Screen = 'setup' | 'home' | 'questions' | 'loading' | 'result'

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
  // Champs ajoutés par Gemini
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
```
