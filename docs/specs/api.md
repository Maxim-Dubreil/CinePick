# Specs API

> Source de vérité : ce fichier (versionné avec le code qu'il décrit). Miroir en lecture sur [Linear](https://linear.app/maximdubreil/document/specs-api-76c2035d0d24) — modifie ici, pas là-bas.
> Référencé depuis [Specs Questions](./questions.md). Périmètre des routes FastAPI custom — le reste (lecture profil, lecture/écriture historique) passe directement par le client Supabase + RLS depuis le front, sans backend custom.

## Principe : FastAPI seulement là où une clé secrète est nécessaire

4 tables, mais seules `films` (écriture) et `user_watchlist_items` (écriture au sync) ont besoin de passer par FastAPI pour leurs écritures — elles nécessitent des clés secrètes (TMDB, Gemini) qui ne peuvent pas vivre côté front. `GET /films/{tmdb_id}/watch-providers` est la même règle appliquée à une lecture : pas d'écriture, mais un appel TMDB à la volée qui a besoin de la clé serveur. Tout le reste (lecture `users`, lecture/écriture `watch_history` sur accept/decline, lecture Historique) passe directement par le client Supabase (SDK JS) protégé par RLS — pas de route custom à écrire, à documenter, ni à maintenir pour du CRUD que Supabase fait déjà nativement.

## Routes

### `GET /letterboxd/validate`

Appelé à la soumission du formulaire dans la modale Letterboxd (avant le bouton "Synchroniser"), pour vérifier que le pseudo existe et que la watchlist est publique, sans encore rien écrire en base.

|                 |                                                                                    |
| --------------- | ---------------------------------------------------------------------------------- |
| Query param     | `username: string`                                                                |
| Réponse         | `{ username: string, count: number }`                                             |
| Erreurs typées  | `404` pseudo introuvable / `403` watchlist privée / `502` Letterboxd injoignable   |
| Appels externes | Scraper Letterboxd (comptage seul, pas d'enrichissement TMDB)                     |

### `POST /letterboxd/sync`

Déclenché par le bouton "Synchroniser" (Profil / bannière Home). Nécessite un token utilisateur (`Authorization: Bearer`). Scrape la watchlist Letterboxd (toutes les pages), upsert les films dans `films` (dédupliqué par `letterboxd_slug`), applique l'enrichissement TMDB (`genres`, `runtime`, `origin_country`, `overview`, `director`, `actors`), reconcilie `user_watchlist_items` via la fonction SQL `sync_user_watchlist` (nouveaux films ajoutés, `removed_at` renseigné sur les films disparus — soft delete, une seule transaction).

- **Enrichissement best-effort** : un échec TMDB sur un film (pas de match, timeout, réponse
  malformée) n'annule jamais tout le sync — le film reste juste non enrichi. Un échec
  n'écrase **jamais** une valeur déjà connue dans `films` (cache partagé entre tous les users) :
  `repositories/watchlist.py::upsert_films` n'écrit `tmdb_id`/`genres`/`runtime`/`origin_country`/
  `director`/`actors` que si l'enrichissement a réussi pour ce film sur ce sync.
- **Piège PostgREST** : ces colonnes doivent rester `NULLABLE` en base, sinon un batch qui mélange
  films enrichis et non-enrichis fait planter le sync entier (voir `docs/db-schema.md`).

|                 |                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------ |
| Auth            | Requis (`get_current_user_id`)                                                            |
| Body            | `{ letterboxd_username: string }`                                                          |
| Réponse         | `{ film_count: number, sync_duration_ms: number }`                                         |
| Erreurs typées  | `404` profil introuvable / `403` watchlist privée / `502` Letterboxd injoignable           |
| Appels externes | Scraper Letterboxd (paginé, concurrence 5) + TMDB (enrichissement, concurrence 5)          |

### `DELETE /letterboxd/unlink`

Délie le compte Letterboxd de l'utilisateur (bouton dans les paramètres du compte, CIN-72). Laisse le watchlist déjà synchronisé intact — seuls `letterboxd_username`, `letterboxd_last_sync`, `letterboxd_film_count` sont réinitialisés sur `users`.

|         |                                    |
| ------- | ---------------------------------- |
| Auth    | Requis                            |
| Réponse | `{ unlinked: true }`               |

### `GET /watchlist`

Watchlist active de l'utilisateur, allégée et pré-bucketée (`duration`, `era` via `filtering.py`) pour alimenter le compteur de résultats live du questionnaire — les mêmes règles de bucket que `/recommend`, sans les dupliquer côté front. Inclut `last_proposed_at` par film (depuis `watch_history`) pour que la question "jamais vu" compte comme `/recommend` exclura réellement.

|         |                                                                                                    |
| ------- | -------------------------------------------------------------------------------------------------- |
| Auth    | Requis                                                                                             |
| Réponse | `{ films: [{ id, genres, duration, era, origin_country, last_proposed_at }] }`                     |

### `POST /recommend`

Reçoit les 9 réponses brutes du questionnaire (pas de pré-filtrage côté front — voir [Specs Questions](./questions.md)). Filtre le watchlist actif côté back (`filtering.py`), puis appelle Gemini pour classer jusqu'à 3 candidats avec score et critique — **toujours**, dès qu'il reste au moins 1 candidat après filtrage (plus de court-circuit sous un seuil : voir [Specs AI](./ai.md)). Génère un `recommendation_session_id` (UUID) et enregistre une ligne `"proposed"` par candidat dans `watch_history` avant de répondre, déjà porteuse de son `rank`/`match_score`/`ai_critique` — c'est ce que `/recommend/decision` vérifie ensuite, et ce que `/recommend/current` relit pour reprendre une session sans rappeler l'IA.

Un nouvel appel à `/recommend` (même body, mêmes films déjà proposés exclus via `watch_history`) est le mécanisme de "retry" — pas de route dédiée, pas de conversation IA à état : chaque appel est indépendant, avec un nouveau `recommendation_session_id` (voir [Specs AI](./ai.md)).

|                 |                                                                                                                        |
| --------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Auth            | Requis                                                                                                                    |
| Body            | 9 champs du questionnaire — voir `RecommendRequest` dans `backend/models.py` et [Specs Questions](./questions.md)         |
| Réponse         | `{ candidates: [{ film_id, tmdb_id, title, poster_url, year, runtime, overview, genres, origin_country, director, actors, rank, match_score, critique }], meta: { candidates_considered }, recommendation_session_id }` |
| Erreurs typées  | `422 empty_watchlist` / `422 no_candidates` / `502 ai_error`                                                              |
| Appels externes | Gemini, dès qu'au moins 1 candidat reste après filtrage                                                                   |
| Détail complet  | [Specs AI](./ai.md)                                                                                                       |

### `GET /recommend/current`

Reprend la session de recommandation en attente de l'utilisateur, s'il y en a une — c'est-à-dire un `recommendation_session_id` dont au moins une ligne `watch_history` est encore `"proposed"` (aucune décision prise sur ces candidats). Aucun appel IA : tout (`rank`, `match_score`, `ai_critique`, `questions_context`) est déjà en base depuis l'appel `/recommend` d'origine. Utilisé par le front avant de router vers Questions ou Résultat (au chargement de l'app, au clic sur "Nouvelle recherche", après un reload de la page Résultat) — voir [Specs Questions](./questions.md), section "Session pérenne".

`answers` dans la réponse est le `questions_context` d'origine — nécessaire pour pouvoir relancer un `/recommend` (retry) si tous les candidats repris sont ensuite passés, sans jamais être repassé par Questions cette session-ci.

|                 |                                                                                                                        |
| --------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Auth            | Requis                                                                                                                    |
| Réponse         | Même forme que `POST /recommend`, plus `answers` (le `RecommendRequest` d'origine)                                       |
| Erreurs typées  | `404 no_pending_session` — rien en attente, le front retombe sur Questions                                               |
| Appels externes | Aucun                                                                                                                     |

### `POST /recommend/current/abandon`

Le "Recommencer" explicite depuis une session reprise (pas depuis un premier lancement) : marque en masse tous les candidats encore `"proposed"` de la session comme `"skipped"`, pour que `/recommend/current` arrête de la renvoyer. Idempotent — abandonner une session sans rien à abandonner (déjà décidée, id obsolète) n'est pas une erreur.

|                 |                                                                                    |
| --------------- | ------------------------------------------------------------------------------------ |
| Auth            | Requis                                                                                |
| Body            | `{ recommendation_session_id }`                                                       |
| Réponse         | `{ status: "ok" }`                                                                    |

### `POST /recommend/decision`

Enregistre un swipe (accepté/passé). N'accepte que si une ligne `"proposed"` correspondante existe pour ce `recommendation_session_id` + `film_id` — c'est la preuve que le film a vraiment été montré (CIN-78). Ne touche plus `match_score`/`ai_critique` : ces champs sont écrits une fois pour toutes à la proposition (voir `POST /recommend` ci-dessus), pas à la décision.

Un `"accepted"` clôt la session : les autres candidats encore `"proposed"` de cette session passent en `"skipped"` (même effet que `POST /recommend/current/abandon`), pour que `GET /recommend/current` ne la repropose pas (CIN-111).

|                 |                                                                                    |
| --------------- | ------------------------------------------------------------------------------------ |
| Auth            | Requis                                                                                |
| Body            | `{ recommendation_session_id, film_id, decision: "accepted" \| "skipped" }`           |
| Réponse         | `{ status: "ok" }`                                                                    |
| Erreurs typées  | `404 unknown_candidate` — pas de proposition en attente pour ce film                  |

### `GET /films/{tmdb_id}/watch-providers`

Où regarder un film en France (CIN-103) — un seul endpoint réutilisé par les 3 écrans qui l'affichent (Résultat, Home, Historique), la clé TMDB reste côté serveur. Appelle `GET /movie/{tmdb_id}/watch/providers` de TMDB (région `FR`), regroupe les 5 catégories TMDB (`free`, `ads`, `flatrate`, `rent`, `buy`) en 3 catégories affichées, filtre via une liste blanche statique d'une quinzaine de plateformes (`backend/watch_providers_whitelist.py`, construite à la main depuis `GET /watch/providers/movie?watch_region=FR`) et déduplique chaque variante/channel vers sa plateforme canonique (ex. `Paramount+ Amazon Channel` → `Paramount+`).

Aucun stockage en base : les dispos changent trop souvent pour être persistées durablement. Mise en cache **en mémoire process** (`backend/cache.py::TTLCache`, TTL 6h) côté `watch_providers.py` — un dict clé `tmdb_id`, perdu au redémarrage du serveur, pas partagé entre plusieurs instances si le backend scale un jour (non pertinent à l'échelle actuelle). Seuls les résultats réussis sont cachés : une erreur TMDB n'est jamais mémorisée comme si c'était la vraie disponibilité du film. `TTLCache` est générique (`TTLCache[K, V]`) — pensé pour être réutilisé par d'autres données volatiles dérivées de TMDB (ex. notes multi-plateformes, [CIN-104](https://linear.app/maximdubreil/issue/CIN-104)) sans dupliquer la logique d'expiration.

Distinction volontaire entre "pas de film disponible" et "TMDB injoignable" : un film sans offre FR renvoie `200` avec `providers: []` (le front affiche "Pas disponible en streaming en France"), une erreur/timeout TMDB renvoie `502` (le front masque le bloc entièrement).

|                 |                                                                                                                        |
| --------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Auth            | Requis                                                                                                                    |
| Réponse         | `{ providers: [{ provider_id, name, logo_url, category: "free" \| "subscription" \| "rent_buy", ads: boolean }], link: string \| null }` |
| Erreurs typées  | `502` — TMDB injoignable ou en erreur                                                                                     |

### `GET /films/{tmdb_id}/rating`

Note TMDB d'un film ([CIN-104](https://linear.app/maximdubreil/issue/CIN-104), étape 1 — TMDB seul, la multi-plateforme viendra ensuite). Appelle `GET /movie/{tmdb_id}` de TMDB et lit `vote_average`/`vote_count`, sans recalcul ni pondération : la note brute TMDB, juste formatée côté front (1 décimale, virgule FR).

Même pattern que `/films/{tmdb_id}/watch-providers` : aucun stockage en base (une note change trop souvent pour être persistée durablement, voir [docs/db-schema.md](../db-schema.md)), mise en cache **en mémoire process** via le même `TTLCache` générique (`backend/tmdb_rating.py`, TTL 6h), seuls les résultats réussis sont cachés.

`vote_average` vaut `null` quand TMDB n'a encore aucun vote pour ce film (`vote_count == 0`) — distingué d'une vraie note de 0/10 — ou quand le lookup a échoué côté front (même comportement masqué que les watch providers).

|                 |                                                        |
| --------------- | ------------------------------------------------------ |
| Auth            | Requis                                                  |
| Réponse         | `{ vote_average: number \| null }`                      |
| Erreurs typées  | `502` — TMDB injoignable ou en erreur                   |
| Appels externes | TMDB, si le film n'est pas déjà en cache (TTL 6h)                                                                         |

Région FR uniquement pour l'instant (l'app est 100% francophone) — voir [CIN-112](https://linear.app/maximdubreil/issue/CIN-112) pour la détection de région quand l'app passera à l'international.

## Ce qui NE passe PAS par FastAPI (Supabase direct)

| Besoin                                | Table                                 | Mécanisme                                      |
| ------------------------------------- | -------------------------------------- | ----------------------------------------------- |
| Lecture profil, stats compte          | `users`                                | Client Supabase, RLS sur `auth.uid()`           |
| Lecture Historique (liste + détail)   | `watch_history` (join `films`)         | Client Supabase                                 |
| Auth                                  | `users`                                | Supabase Auth (Google OAuth), géré nativement   |

## Docs liées

- [Specs Questions](./questions.md) — les 9 champs du questionnaire
- [Specs AI](./ai.md) — détail prompt/réponse Gemini
- [Specs DB (Linear)](https://linear.app/maximdubreil/document/specs-db-09a3daa57241) — schéma des tables
