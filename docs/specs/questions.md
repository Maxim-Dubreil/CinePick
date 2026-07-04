# Specs Questions

> Source de vérité : [Linear](https://linear.app/maximdubreil/document/specs-questions-12a8a783e754). Ce fichier est un miroir — toute modification doit se faire sur Linear puis être resynchronisée ici.
> Référencé depuis [Écrans & Navigation](../ecrans-navigation.md). Détaille le contenu, les types et l'algorithme de sélection des 9 questions du flow de recommandation. Source des wireframes : Figma (pages CINEPICK).

## Principe : deux catégories de questions

C'est la distinction structurante de tout le flow. Elle détermine ce qui filtre réellement la watchlist et ce qui ne fait qu'orienter le prompt envoyé à l'IA.

| Catégorie        | Questions                                | Rôle                                                              | Déclenche un recalcul ? |
| ---------------- | ---------------------------------------- | ----------------------------------------------------------------- | ----------------------- |
| **Filtres durs** | Genre, Durée, Époque, Région, Déjà vu    | Réduisent déterministiquement le sous-ensemble de films candidats | Oui — recalcul front    |
| **Filtres mous** | Émotion, Ambiance, Avec qui, Sous-titres | Texte libre accumulé pour le prompt IA, n'éliminent aucun film    | Non                     |

Les filtres durs correspondent chacun à un champ concret de la watchlist enrichie TMDB (`genre_ids`, `runtime`, `release_date`, `origin_country`), à l'exception de Déjà vu qui s'appuie sur une donnée interne (`historique.film_id`, pas TMDB). Les filtres mous n'ont pas d'équivalent structuré côté données — ils ne servent qu'à nourrir le texte du prompt final.

## Détail des 9 questions

### 1. Genre — filtre dur, multi-select

Liste fixe codée côté front (id stable, label en français) : Action, Aventure, Animation, Comédie, Crime, Documentaire, Drame, Familial, Fantastique, Histoire, Horreur, Musique, Mystère, Romance, Science-Fiction, Thriller, Guerre, Western, + « Pas de préférence » (exclusif).

Champ TMDB : `genre_ids`. Pas besoin d'appeler l'endpoint `/genre/movie/list` de TMDB pour ça — les `genres` reviennent déjà en `{id, name}` lors de l'enrichissement de chaque film, et la liste d'options de cette question peut être une constante statique `{28: "Action", ...}` (la liste TMDB est stable depuis des années). ⚠️ Filtrer sur l'id, jamais sur le `name` affiché.

### 2. Émotion — filtre mou, multi-select

Peur, Rire, Ému, Tendu, Zen, Inspiré, Nostalgique, Amoureux, Dépaysé, Réfléchi, Choqué, Mystère, Épique, + « Peu m'importe » (exclusif).

### 3. Ambiance — filtre mou, multi-select

Spatial, Futuriste, Historique, Urbain, Rural, Film noir, Nature, Guerre, Fantastique, Conte, Surréaliste, Post-apocalyptique, Médiéval, Dystopique, Mer, Montagne/froid, Minimaliste, + « Pas de préférence » (exclusif).

### 4. Avec qui — filtre mou, single-select

Seul, Entre amis, En couple, En famille, Pas de préférence.

### 5. Durée disponible — filtre dur, single-select

Moins d'1h30, 1h30–2h, 2h–2h30, 2h30+, Peu importe.

Champ TMDB : `runtime`. ⚠️ Parfois absent ou à `0` sur des films peu renseignés — les traiter comme « non filtrables » (ni inclus ni exclus) plutôt que de les éliminer par erreur.

### 6. Époque — filtre dur, single-select

Muet & Noir/Blanc (avant 1930), Âge d'or Hollywood (1930–1959), Nouvelle Vague & Westerns (1960–1979), Blockbusters & Indie (1980–1999), 2000–2014, Récent (2015+), Pas de préférence.

Champ TMDB : `release_date`.

### 7. Région — filtre dur, multi-select + sous-cas

5 grandes régions en chips : Américain, Britannique, Français, Japonais, Sud-Coréen, + « Pas de préférence » (exclusif) + « Autre région » qui ouvre un input de recherche pour ajouter un ou plusieurs pays hors liste.

Champ TMDB : `origin_country` (ou `production_countries`). ⚠️ **Piège critique** : `origin_country` (pays de production) et `original_language` (langue) sont deux champs séparés. Un film britannique a typiquement `origin_country: GB` mais `original_language: en` — identique à un film américain. Filtrer sur la langue confondrait donc systématiquement UK et US. Le filtre doit obligatoirement utiliser `origin_country`, jamais `original_language`.

### 8. Sous-titres — filtre mou, single-select

Avec sous-titres, Sans sous-titre, Pas de préférence.

Ne filtre aucun film : aucune donnée de sous-titres n'existe dans la watchlist enrichie. Traité comme une préférence cosmétique ignorée par le backend en V1.

### 9. Déjà vu — filtre dur, single-select

« Non, je veux du nouveau » (exclut les films déjà validés via CinePick) / « Peu importe » (les inclut aussi, utile pour un rewatch volontaire).

Champ utilisé : interne, pas TMDB — `historique.film_id` (liste des films acceptés via le swipe "Ce soir ✓" dans Résultat), stocké côté Supabase. **C'est aussi la dernière question posée** — sa réponse fige la taille finale du sous-ensemble filtré, qui détermine ensuite si l'IA est appelée ou non (voir "Sélection IA" plus bas).

⚠️ **À affiner plus tard** : un film marqué vu directement sur Letterboxd (sans passer par CinePick) ne disparaît de la watchlist qu'au prochain resync. Entre deux syncs, "déjà vu" (CinePick) et "retiré de la watchlist" (Letterboxd) peuvent diverger — mis de côté pour l'instant, pas bloquant pour la V1.

## Algorithme de sélection

```sh
Watchlist scrappée (Letterboxd)
        │
        ▼
Enrichissement TMDB LÉGER (une fois, au clic "Synchroniser")
  → genres, runtime, release_date, origin_country
  → sauvegardé en DB (Supabase), refait à chaque resync
        │
        ▼
Watchlist enrichie téléchargée en bloc, tenue en mémoire côté FRONT
  (un seul fetch DB par session, pas d'appel TMDB pendant les questions)
        │
   ┌────┴─────────────────────────────────────┐
   │ Pour chaque question filtre DUR           │
   │  (Genre, Durée, Époque, Région, Déjà vu)  │
   │  réponse → recalcul front                 │
   │  (filter sur ids/champs, pas de back)      │
   │  → compteur "N films" affiché              │
   └────┬─────────────────────────────────────┘
        │
   N = 0 ? ──oui──► retire le dernier filtre appliqué, recalcule,
        │           affiche "aucun film exact, voici les plus proches"
        │ non
        ▼
   Questions filtres MOUS (Émotion, Ambiance, Avec qui, Sous-titres)
   → aucune incidence sur la liste, accumulées en texte
        │
        ▼
   Après Q9 : taille du sous-ensemble final connue
   → 0 : écran "Aucun film trouvé" + Recommencer
   → 1 à 3 : affichage direct, PAS d'appel IA (voir Specs AI)
   → 4+ : prompt final envoyé à Gemini → 3 candidats classés
```

**Pourquoi le recalcul est en front et pas en back** : la watchlist enrichie est chargée une seule fois en mémoire après le scrape. Filtrer quelques centaines de films sur des critères simples (ids, runtime, date, pays, historique interne) est de l'ordre de la milliseconde — un aller-retour réseau à chaque question ajouterait de la latence pour rien.

**Le loading « we are cooking »** s'affiche après chaque question (cohérence visuelle demandée), avec un délai minimum artificiel (~300–500 ms) sur les questions filtres mous, puisque techniquement elles ne recalculent rien. Sur les questions filtres durs, ce délai correspond en partie au recalcul réel — qui reste de toute façon quasi instantané si l'algo est bien fait. **Ce délai est volontaire, pas un reflet du temps de calcul réel du moteur de filtrage** — à garder en tête si quelqu'un relit ce doc plus tard en pensant que le filtrage est lent.

**Fallback 0 résultat** : on ne retire jamais le dernier filtre dur posé à l'utilisateur sans explication. On recalcule en ignorant uniquement ce dernier filtre, et on affiche clairement que les résultats sont approchants plutôt qu'exacts.

### Exemple de parcours (illustratif)

| Étape                | Filtre appliqué | Films restants |
| -------------------- | --------------- | -------------- |
| Départ               | —               | 180            |
| Q1 Genre = Comédie   | dur             | 42             |
| Q5 Durée = 1h30–2h   | dur             | 19             |
| Q6 Époque = 2015+    | dur             | 6              |
| Q9 Déjà vu = Non     | dur             | 4              |
| Q7 Région = Français | dur             | 0              |

→ fallback déclenché sur la dernière étape : on retire le filtre Région, on recalcule → 4 films restants, message "aucun film exact, voici les plus proches".

## Deux enrichissements TMDB distincts, à ne pas confondre

Le terme "enrichissement TMDB" recouvre en réalité deux opérations différentes en granularité, en timing et en lieu de stockage — détail complet (champs, déclencheur, règles de suppression) dans [Specs DB](./db.md).

|               | Enrichissement "filtre"                                  | Enrichissement "fiche"                                                                                           |
| ------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Champs        | `genre_ids`, `runtime`, `release_date`, `origin_country` | poster, casting, synopsis complet, providers streaming                                                           |
| Portée        | Toute la watchlist (potentiellement 200+ films)          | Seulement les 1 à 3 candidats retournés par l'IA (ou affichés directement si court-circuit)                      |
| Déclenché par | Clic "Synchroniser" (modale Letterboxd)                  | Réception de la réponse IA, ou directement si sous-ensemble ≤ 3 (jamais en spéculatif sur tout le sous-ensemble) |
| Stockage      | DB (Supabase), rafraîchi à chaque resync                 | DB (Supabase), table `films`, jamais supprimé même si l'historique l'est                                         |

## Sélection IA : 3 candidats par appel, 2 appels maximum par session — sauf court-circuit

L'IA renvoie 3 candidats classés en un seul appel (détail complet du prompt, format et flow technique : [Specs AI](./ai.md)).

**Court-circuit sans IA** : si le sous-ensemble final (après Q9) contient 3 films ou moins, l'IA n'est pas appelée du tout — rien à sélectionner, ce serait juste réordonner 1 à 3 films déjà connus pour rien. Affichage direct, `match_score`/`ai_critique` restent `null`, badge score et critique masqués sur Résultat. Détail complet : [Specs AI](./ai.md).

Flow swipe complet (sous-ensemble ≥ 4, avec IA) :

- Skip 1 → candidat rank=2, déjà en cache (aucun appel réseau)
- Skip 2 → candidat rank=3, déjà en cache (aucun appel réseau)
- Skip 3 (tous refusés) → **2ème et dernier appel Gemini** dans la même conversation, films refusés exclus du sous-ensemble
  - Succès → retour sur "Carte film" avec les nouveaux candidats (même logique de swipe, mais pas de 3ème appel possible)
  - Échec (erreur technique ou sous-ensemble épuisé) → écran final "On n'a pas réussi à répondre à ta demande" + bouton **"Recommencer"** → **retour Questions, reset complet des 9 réponses**

2 appels Gemini maximum par session quand l'IA est appelée, sans exception. Passé cette limite, la session est considérée comme épuisée et l'utilisateur repart de zéro.

⚠️ **Diagramme Excalidraw "5. Résultat" à mettre à jour** : il décrit encore "1-2 skips → nouvelle reco IA / 3 skips → retour Questions", ce qui ne correspond plus à ce mécanisme. Changements à faire dans le diagramme (listés mais pas encore appliqués) :

1. "1-2 skips → Nouvelle reco IA" → remplacer par "Carte suivante (cache)"
2. "3 skips → ? Questions (reset ?)" → remplacer par "2ème prompt Gemini (exclut films refusés)"
3. Ajouter deux sorties au 2ème prompt : succès → "Carte film" / échec → "Recommencer → Questions (reset)"
4. Ajouter le branchement court-circuit (0 / 1-3 / 4+) en amont de la boucle de swipe

## Trous produit — état au 03/07/2026

| Sujet                                                                      | Statut                                                                                   |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 0 film après filtres durs                                                  | ✅ Résolu — fallback "plus proche" (retire le dernier filtre, recalcule)                 |
| Sous-ensemble < 3 films pour l'IA                                          | ✅ Résolu — court-circuit, pas d'appel IA du tout (voir Specs AI)                        |
| Compteurs skip/échec scopés à une session                                  | ✅ Résolu — state front uniquement, pas de colonne DB nécessaire en V1                   |
| Fin de session après échec des 2 prompts IA                                | ✅ Résolu — message "On n'a pas réussi" + bouton "Recommencer" → Questions reset complet |
| Watchlist publique vide au scrape (0 film trouvé)                          | ⏳ Ouvert                                                                                |
| Bouton "précédent" sur Question 1 — annule vers Home ou désactivé ?        | ⏳ Ouvert                                                                                |
| Désync Letterboxd / "déjà vu" CinePick entre deux syncs                    | ⏳ Ouvert, non bloquant V1                                                               |
| Diff de sync watchlist (film retiré entre deux syncs, pas de `removed_at`) | ⏳ Ouvert, voir Specs DB                                                                 |
| `films.genres` : ids TMDB ou noms localisés ?                              | ⏳ À vérifier côté code existant                                                         |
