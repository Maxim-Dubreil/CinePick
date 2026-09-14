# Specs AI

> Source de vérité : [Linear](https://linear.app/maximdubreil/document/specs-ai-ffdc701ff665). Ce fichier est un miroir — toute modification doit se faire sur Linear puis être resynchronisée ici.
> Référencé depuis [Specs Questions](./questions.md). Détaille le prompt envoyé à Gemini, le format de réponse attendu, et le flow technique après réception de la réponse.

## Vue d'ensemble

L'IA reçoit le sous-ensemble de films déjà filtré (filtres durs) + les signaux mous accumulés, et renvoie **3 candidats classés** en une seule réponse structurée (JSON). Aucune watchlist complète n'est jamais envoyée — voir Specs Questions pour le détail du filtrage en amont.

**L'IA n'est pas toujours appelée** — voir "Court-circuit sans IA" ci-dessous : si le sous-ensemble filtré contient 3 films ou moins après la dernière question filtre dur (Q9), l'appel Gemini est sauté entièrement.

**Transition loading → Résultat : automatique, pas de bouton.** Que ce soit après l'appel Gemini (N≥4) ou après le court-circuit (N≤3), le dernier step du loading ("Prêt") enchaîne directement sur la carte Résultat — cohérent avec le pattern déjà en place sur Questions (avance auto après chaque réponse, pas de clic supplémentaire requis).

## Court-circuit sans IA (sous-ensemble ≤ 3 films)

Dès que le sous-ensemble filtré (après Q9, dernier filtre dur) contient 3 films ou moins, il n'y a rien à sélectionner — l'IA servirait juste à réordonner 1 à 3 films déjà connus, ce qui n'apporte rien et coûte un appel réseau + tokens pour rien.

| Taille du sous-ensemble | Comportement                                                                  |
| ----------------------- | ----------------------------------------------------------------------------- |
| 0                       | Écran "Aucun film trouvé" + bouton **Recommencer → Questions, reset complet** |
| 1 à 3                   | Affichage direct des films, **sans appel Gemini**                             |
| 4 et +                  | Flow normal, appel Gemini (voir reste du doc)                                 |

**Affichage direct (1 à 3 films)** : mêmes écrans que le flow normal (carte film, swipe accept/skip), mais `match_score` et `ai_critique` restent `null` — ces deux champs ne peuvent venir que d'une réponse IA. Le badge score et le bloc critique doivent être masqués sur la carte plutôt que d'afficher un vide (voir Écrans & Navigation, section Résultat). Ordre d'affichage : par date d'ajout à la watchlist, le plus ancien en premier (déterministe, pas d'aléatoire).

Si l'utilisateur skip tous les films affichés (1, 2 ou 3 selon le cas) : écran "Plus de films disponibles" + bouton **Recommencer → Questions, reset complet**. Pas de 2ᵉ tentative IA possible dans ce cas, puisqu'aucune IA n'a été appelée pour ce sous-ensemble — il n'y a rien de plus à demander.

Cette écriture `watch_history` reste identique au flow normal (accept/skip loggé), seuls `match_score`/`ai_critique` sont `null`.

## Pré-prompt (template)

**System prompt** (rôle + contrainte de format) :

```sh
Tu es un assistant de recommandation de films. Tu reçois une liste de films
candidats (déjà filtrés sur genre/durée/époque/région/déjà-vu) et des
préférences exprimées par l'utilisateur. Choisis les 3 meilleurs candidats
parmi la liste fournie UNIQUEMENT (n'invente jamais de film hors liste).
Réponds strictement au format JSON défini par le schema fourni.
```

**User prompt** (généré dynamiquement à partir des réponses aux questions) :

```sh
Films candidats :
[{id, title, year, genres, runtime, overview_tronqué}, ...]

Préférences exprimées :
- Émotion recherchée : {réponse Q2}
- Ambiance : {réponse Q3}
- Avec qui : {réponse Q4}
- Sous-titres : {réponse Q8}
```

## Input — ce qu'on envoie

| Champ                                           | Source                                            | Notes                                                                                                                                                              |
| ----------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Liste de films candidats                        | Sous-ensemble post-filtres durs (Specs Questions) | `id` (uuid interne, pas tmdb_id), `title`, `year`, `genres`, `runtime`, `overview` tronqué (~200 caractères, pas le synopsis complet — limite le budget de tokens) |
| Signaux mous                                    | Réponses Q2, Q3, Q4, Q8                           | Formatés en phrases naturelles, pas en JSON brut — l'IA répond mieux à du texte qu'à des clés techniques                                                           |
| Historique de conversation (relance uniquement) | Messages précédents de la même session            | Réutilisé tel quel pour le 2ᵉ prompt après 3 skips, pas reconstruit depuis zéro                                                                                    |

## Output — format attendu (JSON structuré)

Recommandé : utiliser le mode sortie structurée de Gemini (`response_schema`) plutôt que parser du texte libre — élimine les erreurs de parsing et les hallucinations de format.

| Champ                        | Type                                                  | Description                                                                                                                             |
| ---------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `candidates`                 | array (1 à 3 éléments, **pas fixe** — voir edge case) | Les candidats retenus                                                                                                                   |
| `candidates[].film_id`       | uuid                                                  | Correspond à `films.id` (l'id interne envoyé en input), jamais `tmdb_id` directement — évite une traduction supplémentaire côté back    |
| `candidates[].rank`          | int (1-3)                                             | Ordre de pertinence, 1 = meilleur choix                                                                                                 |
| `candidates[].match_score`   | int (0-100)                                           | Confiance du modèle — stocké tel quel dans `watch_history.match_score`                                                                  |
| `candidates[].critique`      | string, 1-2 phrases                                   | Justification courte, affichée en italique sur la carte Résultat. Doit référencer au moins un signal mou pour ne pas paraître générique |
| `meta.candidates_considered` | int                                                   | Taille du sous-ensemble envoyé — debug/logs uniquement, jamais affiché à l'utilisateur                                                  |

### Exemple de réponse

```json
{
  "candidates": [
    {
      "film_id": "a1b2c3d4-...",
      "rank": 1,
      "match_score": 87,
      "critique": "Un thriller psychologique tendu, parfait pour une soirée seul — l'ambiance pesante colle exactement à ce que tu cherches."
    },
    {
      "film_id": "e5f6g7h8-...",
      "rank": 2,
      "match_score": 74,
      "critique": "Plus léger mais garde la tension demandée, avec une touche de mystère qui rejoint ton envie de dépaysement."
    },
    {
      "film_id": "i9j0k1l2-...",
      "rank": 3,
      "match_score": 61,
      "critique": "Choix plus risqué : moins dans le ton tendu, mais le genre et la durée matchent parfaitement tes contraintes."
    }
  ],
  "meta": { "candidates_considered": 6 }
}
```

## Edge case : sous-ensemble entre 4 et quelques films

Si le sous-ensemble filtré contient un petit nombre de films au-dessus du seuil de court-circuit (4-5 par exemple), le schema de sortie doit quand même accepter un tableau de 1 ou 2 éléments plutôt que de forcer 3 candidats fixes — sinon l'IA risque d'halluciner un film hors liste pour respecter le format.

## Flow technique après réception de l'output

1. Parser le JSON, valider contre le schema (zod / pydantic selon le côté qui traite — à date Vite/React + FastAPI)
2. Pour les candidats reçus uniquement (1 à 3, jamais plus) : lancer l'enrichissement **fiche** (poster, casting, providers) — démarré seulement après la réponse IA, jamais en spéculatif sur tout le sous-ensemble (voir Specs DB pour la distinction filtre/fiche)
3. Pendant l'enrichissement : loading avec progress bar par étape ("Appel IA" → "Enrichissement fiche" → "Prêt") — temps réel, pas de délai artificiel ici contrairement au loading entre les questions. Fin du loading → transition automatique vers Résultat, aucun bouton intermédiaire (voir "Vue d'ensemble")
4. Affichage Résultat : carte du candidat `rank=1`, swipe accept/skip
   - skip → carte `rank=2` (déjà en cache, aucun nouvel appel)
   - skip → carte `rank=3` (déjà en cache)
   - skip (3ᵉ, tous refusés) → 2ᵉ et dernier prompt dans la même conversation : "l'utilisateur a refusé [ids/titres], propose jusqu'à 3 nouveaux candidats parmi le reste du sous-ensemble (candidats déjà proposés exclus)"
   - Succès du 2ᵉ prompt → nouveaux candidats, même logique de swipe, plus de 3ᵉ tentative possible
   - Échec du 2ᵉ prompt (erreur technique ou sous-ensemble épuisé) → écran "On n'a pas réussi à répondre à ta demande" + bouton **Recommencer → retour Questions, reset complet des 9 réponses** (tranché, voir Specs Questions)

## Section à tester (manuel, avant intégration code)

À faire dans Google AI Studio ou via l'API Gemini directement, avant d'écrire le code d'intégration :

1. **Test format** — input minimal (3-5 films, signaux mous simples) → vérifier que le JSON respecte le schema, que les `film_id` matchent bien les ids envoyés, que `critique` référence vraiment un signal mou et ne sonne pas générique
2. **Test charge** — sous-ensemble large (50+ films) → vérifier le temps de réponse et le budget de tokens réel (avec overview tronqué à 200 caractères par film)
3. **Test relance** — simuler le rejet des 3 candidats, vérifier que la continuation de conversation fonctionne (Gemini ne re-propose pas les mêmes films, comprend bien l'exclusion)
4. **Test seuil** — vérifier que le court-circuit se déclenche bien à N≤3 et jamais à N≥4, et qu'aucun appel Gemini n'est fait dans le premier cas

## Docs liées

- [Specs Questions](./questions.md) — filtrage en amont (filtres durs/mous)
- [Specs DB](./db.md) — distinction enrichissement filtre/fiche, stockage
