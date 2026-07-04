# Specs API

> Source de vérité : [Linear](https://linear.app/maximdubreil/document/specs-api). Ce fichier est un miroir — toute modification doit se faire sur Linear puis être resynchronisée ici.

> Référencé depuis [Specs Questions](./questions.md). Périmètre des routes FastAPI custom — le reste (lecture profil, lecture/écriture historique, lecture watchlist) passe directement par le client Supabase + RLS depuis le front, sans backend custom.

## Principe : FastAPI seulement là où une clé secrète est nécessaire

4 tables, mais seules `films` (écriture) et une partie de `user_watchlist_items` (écriture au sync) ont besoin de passer par FastAPI — parce que ces écritures nécessitent des clés secrètes (TMDB, Gemini) qui ne peuvent pas vivre côté front. Tout le reste (lecture `users`, lecture/écriture `watch_history` sur accept/decline, lecture `user_watchlist_items` pour le filtrage) passe directement par le client Supabase (SDK JS) protégé par RLS — pas de route custom à écrire, à documenter, ni à maintenir pour du CRUD que Supabase fait déjà nativement.

## Routes

### `GET /letterboxd/validate`

Appelé à la soumission du formulaire dans la modale Letterboxd (avant le bouton "Synchroniser"), pour vérifier que le pseudo existe et que la watchlist est publique, sans encore rien écrire en base.

| | |
| -- | -- |
| Query param | `username: string` |
| Réponse | `{ username: string, count: number }` |
| Erreurs typées | `404` pseudo introuvable / `403` watchlist privée / `502` Letterboxd injoignable |
| Appels externes | Scraper Letterboxd (comptage seul, pas d'enrichissement TMDB) |

### `POST /letterboxd/sync`

Déclenché par le bouton "Synchroniser" (Profil / bannière Home). Scrape la watchlist Letterboxd, upsert les films dans `films` (dédupliqué par `letterboxd_slug`), applique l'enrichissement "filtre" léger (`genres`, `runtime`, `release_date`, `origin_country`), upsert `user_watchlist_items` (nouveaux films ajoutés, `removed_at` renseigné sur les films disparus — voir Specs DB).

> **Statut actuel (CIN-69)** : stub. Renvoie `{ count: number, synced_at: string }` et sauvegarde
> uniquement les compteurs sur `users` — pas encore de scrape complet ni d'écriture dans
> `user_watchlist_items`/`films`. Le comportement ci-dessous est la cible de CIN-46.

| | |
| -- | -- |
| Body | `{ letterboxd_username: string }` |
| Réponse | `{ film_count: number, sync_duration_ms: number }` |
| Erreurs typées | `profile_not_found` / `profile_private` / `network_error` (voir modale Letterboxd, Écrans & Navigation) |
| Appels externes | Scraper Letterboxd + TMDB (enrichissement filtre, en masse) |

### `POST /recommend`

1er appel IA. Reçoit le sous-ensemble déjà filtré côté front (filtres durs appliqués) + les réponses aux filtres mous. Appelle Gemini, reçoit 1 à 3 candidats, déclenche l'enrichissement "fiche" lourd uniquement pour ces candidats, retourne la fiche complète.

| | |
| -- | -- |
| Body | `{ film_ids: string[], soft_signals: { emotion, ambiance, avec_qui, sous_titres } }` |
| Réponse | `{ candidates: [{ film_id, rank, match_score, critique, poster_url, overview, ... }], conversation_id }` |
| Appels externes | Gemini (1er prompt) + TMDB (enrichissement fiche, 1 à 3 films) |
| Détail complet | [Specs AI](./ai.md) |

### `POST /recommend/retry`

2ᵉ et dernier appel IA, déclenché après 3 skips. Même conversation que `/recommend` (via `conversation_id`), exclut les films refusés.

| | |
| -- | -- |
| Body | `{ conversation_id: string, refused_film_ids: string[] }` |
| Réponse | Identique à `/recommend`, ou `{ error: "no_more_candidates" }` si le sous-ensemble est épuisé |
| Appels externes | Gemini (2ᵉ prompt) + TMDB (enrichissement fiche des nouveaux candidats) |

### `GET /films/{film_id}/live`

Données jamais stockées (voir Specs DB) : `providers`, `trailer_url`, note TMDB. Appelé sur Résultat (juste après `/recommend`) et au clic sur une carte dans Historique.

| | |
| -- | -- |
| Réponse | `{ providers: { flatrate: [...], rent: [...] }, trailer_url, vote_average, vote_count }` |
| Appels externes | TMDB (`/watch/providers`, `/videos`, `/movie/{id}`) |
| Cache | Aucun — toujours live, voir Specs DB pour le raisonnement |

## Ce qui NE passe PAS par FastAPI (Supabase direct)

| Besoin | Table | Mécanisme |
| -- | -- | -- |
| Lecture profil, stats compte | `users` | Client Supabase, RLS sur `auth.uid()` |
| Lecture watchlist pour filtrage front | `user_watchlist_items` (join `films`) | Client Supabase |
| Écriture décision (accept/decline) | `watch_history` | Client Supabase, insert direct depuis le front |
| Lecture Historique (liste + détail) | `watch_history` (join `films`) | Client Supabase |
| Auth | `users` | Supabase Auth (Google OAuth), géré nativement |

## Trous à trancher avant implémentation

| Sujet | Statut |
| -- | -- |
| Format exact de `conversation_id` — id généré par Gemini ou juste l'historique de messages renvoyé tel quel par le front à `/recommend/retry` ? | ⏳ Ouvert |
| `POST /sync` : synchrone (attend la fin du scrape+enrichissement) ou retourne immédiatement avec polling/websocket pour la progression ? Le loading "X films trouvés…" de la modale suppose un retour progressif | ⏳ Ouvert |
| Rate limiting TMDB — `/sync` peut déclencher des centaines d'appels d'un coup, à batcher/throttler | ⏳ Ouvert |

## Docs liées

- [Specs Questions](./questions.md) — filtres durs/mous
- [Specs AI](./ai.md) — détail prompt/réponse Gemini
- [Specs DB](./db.md) — schéma des tables, cache vs live
