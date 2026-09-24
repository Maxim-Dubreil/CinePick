# Specs AI

> Source de vérité : ce fichier (versionné avec le code qu'il décrit). Miroir en lecture sur
> [Linear](https://linear.app/maximdubreil/document/specs-ai-ffdc701ff665) — modifie ici, pas
> là-bas. Référencé depuis [Specs Questions](./questions.md). Détaille le prompt envoyé à Gemini, le
> format de réponse attendu, et le flow technique après réception de la réponse. Implémentation :
> `backend/reco_ai.py` (CIN-49/CIN-78/CIN-94).

## Modèle

`gemini-3.1-flash-lite` (`_MODEL` dans `reco_ai.py`). **Ne pas repasser sur `gemini-3.5-flash` ou
`gemini-3.6-flash`** : les deux renvoient un `503` quasi instantané dès que `response_schema`
(sortie JSON structurée) est combiné à leur mode "réflexion" activé par défaut — indépendant de la
charge réelle malgré le message d'erreur Google ("high demand"), voir CIN-94.
`gemini-3.1-flash-lite` n'a pas ce mode et répond en ~1-4s sur ce prompt. Timeout client : 30s
(`_REQUEST_TIMEOUT`).

**Fallback** : `gemini-3-flash-preview` (`_FALLBACK_MODEL`), appelé une seule fois si `_MODEL`
renvoie un `5xx` (surcharge réelle constatée le 23/09 : `503` même sur un prompt de deux mots, sans
schéma). Réflexion forcée à `minimal` (~1s ; au niveau par défaut, 20s+ et risque de timeout).
`gemini-3.5-flash-lite` écarté : 20-55s sur ce prompt même en `minimal`. Modèle `-preview` : Google
peut le retirer, à revérifier en cas de `404`.

## Vue d'ensemble

L'IA reçoit le sous-ensemble de films déjà filtré (filtres durs, `filtering.py`) + les signaux mous,
et renvoie jusqu'à **3 candidats classés** en une seule réponse structurée (JSON). Aucune watchlist
complète n'est jamais envoyée — voir Specs Questions pour le détail du filtrage en amont. Chaque
appel est **stateless** : pas de conversation Gemini à état, pas d'historique de messages conservé
entre deux appels.

**Correction du 2026-09-23** : l'IA est désormais appelée dès qu'il reste **au moins 1** candidat
après filtrage — l'ancien court-circuit (retour direct sans IA si ≤ 3 candidats) a été retiré. Il
laissait `match_score`/`critique` à `null` en dessous du seuil, et surtout rendait les filtres mous
(Avec qui / Émotion / Ambiance) sans aucun effet dès que le sous-ensemble était petit, puisque l'IA
— seule consommatrice de ces signaux — n'était jamais appelée. Le prompt gère déjà nativement moins
de 3 candidats (_"Pick up to 3 films"_), donc aucun changement de prompt n'était nécessaire.

| Taille du sous-ensemble | Comportement                                                 |
| ----------------------- | ------------------------------------------------------------ |
| 0                       | `422 no_candidates` / `422 empty_watchlist` (voir Specs API) |
| 1 et +                  | Appel Gemini, toujours (voir reste du doc)                   |

## Prompt (un seul, généré par `_build_prompt`)

Pas de découpage system/user côté Gemini — un unique prompt texte, en anglais, qui demande
explicitement une réponse en français pour `critique` :

```
Pick up to 3 films from this list, ranked best first, for someone who
{signaux mous en langage naturel}. For each, give a match_score (0-100)
and a 1-2 sentence critique, written in French, referencing at least one
of their preferences. When a film has a [Saga: ...] tag, you may mention
its place in the saga if relevant. Reply with ONLY a JSON object like
{"candidates": [{"film_id": "<id>", "rank": 1, "match_score": 90,
"critique": "..."}]}, using only ids from the list below, nothing else.

{liste des films candidats}
```

**Tag saga** (`_saga_tag`, CIN-113) : ajouté en fin de ligne pour chaque film candidat quand
`collection_name` est non-null — `[Saga: <nom> — <ordre>/<total>]`, ou juste `[Saga: <nom>]` si
l'ordre n'a pas pu être résolu côté TMDB. `ordre`/`total` sont un **ordre de sortie**
(`films.collection_order`/`collection_total`, calculé à l'enrichissement — voir Specs DB), pas un
ordre de visionnage canonique : sur des sagas comme Evangelion (Rebuild vs série originale) ou
Vampire Hunter D (1985/2000, deux continuités disjointes), TMDB ne fait pas la distinction. Purement
informatif, à charge de l'IA de le mentionner ou non dans sa critique — aucun filtre dur/mou dessus.

## Input — ce qu'on envoie

| Champ           | Source                                            | Notes                                                                                                                                                                                                                                                                                                              |
| --------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Films candidats | Sous-ensemble post-filtres durs (Specs Questions) | Par film : `id`, `title`, `year`, `overview` tronqué à 200 caractères, tag saga optionnel (voir ci-dessous). Pas `genres`/`runtime` (déjà utilisés pour filtrer, inutiles dans le prompt).                                                                                                                         |
| Signaux mous    | `emotion`, `ambiance`, `withWho`, `subtitles`     | Rendus en une phrase naturelle (`_soft_signals`), valeurs "no preference" (`none`/`any`) omises. `subtitles` n'a plus de question dédiée côté front depuis le 2026-09-22 (voir [Specs Questions](./questions.md)) — toujours envoyé à `"any"`, donc de fait omis en pratique, mais le champ backend reste inchangé |

## Output — format attendu (JSON structuré, `response_schema` Gemini)

| Champ                      | Type                            | Description                                                                                                                                    |
| -------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `candidates`               | array (1 à `_MAX_CANDIDATES`=3) | Les candidats retenus                                                                                                                          |
| `candidates[].film_id`     | string                          | Doit être un id de la liste envoyée — un id hors liste, un doublon, ou des rangs non séquentiels fait échouer tout l'appel (`AIProviderError`) |
| `candidates[].rank`        | int (1-3), séquentiel           | 1 = meilleur choix                                                                                                                             |
| `candidates[].match_score` | int (0-100)                     | Écrit dans `watch_history.match_score` **à la proposition** (avant même que l'utilisateur swipe) — voir "Session pérenne" ci-dessous           |
| `candidates[].critique`    | string, max 1000 caractères     | En français, doit référencer au moins un signal mou ; écrite dans `ai_critique` au même moment que `match_score`                               |

`meta.candidates_considered` (dans la réponse `/recommend`, pas dans la réponse Gemini) est calculé
côté back : `len(candidates)` avant l'appel IA — debug/logs, jamais affiché.

Seul retry : le fallback de modèle ci-dessus, sur `5xx` uniquement. Sinon, toute erreur (réseau,
JSON malformé, id hors liste, rangs incohérents) lève `AIProviderError`, que `main.py` transforme en
`502 ai_error`. Reproposer un film hors du sous-ensemble filtré violerait le principe #2 du North
Star.

## "Retry" après swipes — pas un 2ᵉ prompt, un 2ᵉ appel indépendant

Il n'y a pas de continuation de conversation. Quand le front épuise les candidats reçus (tous skip),
il rappelle `POST /recommend` avec le même body — un nouveau `recommendation_session_id` est généré,
indépendant du premier. Les films déjà proposés à cette session sont naturellement exclus par
`filtering.py` : toute ligne `watch_history` (proposée ou décidée) touchée il y a moins de 15
minutes (`_SESSION_WINDOW`) est retirée du sous-ensemble, qu'elle ait été acceptée, skip, ou juste
montrée sans décision. Le front plafonne à 2 tentatives (`MAX_ATTEMPTS` dans `useResultFlow.ts`)
avant d'afficher l'écran "aucun film trouvé". Exception : si tous les films du sous-ensemble filtré
viennent d'être montrés (`meta.candidates_considered` ≤ nombre de cartes reçues), le front
n'effectue pas ce rappel — il sait qu'il renverrait `422 no_candidates` — et affiche directement "Tu
as vu tous les films qui correspondent à tes critères" (`deadEndReason: "exhausted"`). Même écran si
un rappel renvoie malgré tout un 422 (cas d'une session reprise, dont le `meta` ne reflète pas le
sous-ensemble d'origine).

## Session pérenne — reprendre sans rappeler l'IA

**Ajouté le 2026-09-23**, voir [Specs Questions](./questions.md#session-pérenne) pour le détail du
mécanisme et le rôle de `GET /recommend/current` / `POST /recommend/current/abandon`. Le point qui
concerne ce doc : `match_score`/`ai_critique`/`rank` sont écrits en base **à la proposition**, pas à
la décision — `/recommend/decision` ne les reçoit plus du tout, il ne fait plus que changer
`decision`/`decided_at`. Conséquence directe : reprendre une session interrompue (reload, app
relancée) ne nécessite jamais un second appel Gemini, tout est déjà en base.

## Enrichissement des candidats — rien après la réponse IA

Tous les champs retournés par `/recommend` (`poster_url`, `runtime`, `overview`, `genres`,
`origin_country`, `director`) viennent directement du watchlist déjà enrichi au moment du sync
Letterboxd (`upsert_films`, voir Specs API) — il n'y a **pas** d'étape d'enrichissement
supplémentaire déclenchée après la réponse Gemini. Un film jamais enrichi avec succès au sync garde
ces champs à `null`/vide, IA ou pas.

## Docs liées

- [Specs Questions](./questions.md) — filtrage en amont (filtres durs/mous)
- [Specs API](./api.md) — contrat `/recommend` et `/recommend/decision`
