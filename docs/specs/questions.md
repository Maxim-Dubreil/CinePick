# Specs Questions

> Source de vérité : ce fichier (versionné avec le code qu'il décrit). Miroir en lecture sur [Linear](https://linear.app/maximdubreil/document/specs-questions-12a8a783e754) — modifie ici, pas là-bas.
> Référencé depuis [Écrans & Navigation](./ecrans-navigation.md). Détaille le contenu, les types et l'algorithme de sélection des 8 questions du flow de recommandation. Source des wireframes : Figma (pages CINEPICK).

## Principe : deux catégories de questions

C'est la distinction structurante de tout le flow. Elle détermine ce qui filtre réellement la watchlist et ce qui ne fait qu'orienter le prompt envoyé à l'IA.

| Catégorie        | Questions                              | Rôle                                                              | Déclenche un recalcul ? |
| ---------------- | --------------------------------------- | ----------------------------------------------------------------- | ----------------------- |
| **Filtres durs** | Genre, Durée, Époque, Région, Déjà vu  | Réduisent déterministiquement le sous-ensemble de films candidats | Oui — recalcul front    |
| **Filtres mous** | Émotion, Ambiance, Avec qui            | Texte libre accumulé pour le prompt IA, n'éliminent aucun film    | Non                     |

Les filtres durs correspondent chacun à un champ concret de la watchlist enrichie TMDB (`genre_ids`, `runtime`, `release_date`, `origin_country`), à l'exception de Déjà vu qui s'appuie sur une donnée interne (`historique.film_id`, pas TMDB). Les filtres mous n'ont pas d'équivalent structuré côté données — ils ne servent qu'à nourrir le texte du prompt final.

## Ordre : 4 groupes par intention, pas une liste plate

**Correction du 2026-09-22** : le flow posait les questions dans un ordre arbitraire, sans lien
avec la façon dont on décide vraiment quoi regarder. Réorganisé en 4 groupes affichés dans le
header (`QuestionFlowHeader`) :

1. **Contexte** — Durée, Avec qui : les contraintes factuelles du moment, indépendantes du
   contenu.
2. **Contenu** — Genre, Époque, Région : ce qu'on a envie de voir.
3. **Ambiance** — Émotion, Ambiance : comment on veut se sentir.
4. **Verrou** — Déjà vu : reste seule et dernière, pour la raison structurelle ci-dessous (fige la
   taille du sous-ensemble avant l'appel IA).

Le fallback 0-résultat retire toujours le *dernier* filtre dur posé (voir plus bas). La séquence
des filtres durs elle-même ne change pas d'ordre relatif : Genre → Durée → Époque → Région → Déjà
vu devient Durée → Genre → Époque → Région → Déjà vu (seuls Genre et Durée sont permutés) — Déjà vu
reste donc le dernier filtre dur posé dans les deux versions, ce comportement déjà spécifié n'est
pas affecté par la réorganisation.

**Sous-titres retiré du flow.** Cette question demandait une préférence purement cosmétique — mais
contrairement à ce que ce document affirmait ici jusqu'au 2026-09-21 ("ignoré par le backend"), le
champ `subtitles` était en réalité bien transmis à l'IA comme signal mou au même titre
qu'Émotion/Ambiance/Avec qui (voir `reco_ai.py::_soft_signals`). Le champ reste **requis** côté
backend (`models.py`) — non modifié pour ne pas toucher à l'API — donc le front envoie désormais
`subtitles: "any"` en dur à la place de la réponse utilisateur. Conséquence assumée : ce signal
n'atteint plus jamais l'IA, y compris pour les utilisateurs à qui ça tenait ; jugé acceptable au vu
de sa valeur marginale face au gain de simplicité (8 questions au lieu de 9).

**Ambiance perd "Guerre" et "Fantastique".** Ces deux valeurs existaient déjà dans la liste Genre —
les redemander en Ambiance dupliquait le signal et pouvait produire une incohérence si
l'utilisateur ne cochait pas les deux de façon cohérente.

## Détail des 8 questions

### 1. Durée disponible — Contexte, filtre dur, single-select

Moins d'1h30, 1h30–2h, 2h–2h30, 2h30+, Peu importe.

Champ TMDB : `runtime`. ⚠️ Parfois absent ou à `0` sur des films peu renseignés — les traiter comme « non filtrables » (ni inclus ni exclus) plutôt que de les éliminer par erreur.

### 2. Avec qui — Contexte, filtre mou, single-select

Seul, Entre amis, En couple, En famille, Pas de préférence.

### 3. Genre — Contenu, filtre dur, multi-select

Liste fixe codée côté front (id stable, label en français) : Action, Aventure, Animation, Comédie, Crime, Documentaire, Drame, Familial, Fantastique, Histoire, Horreur, Musique, Mystère, Romance, Science-Fiction, Thriller, Guerre, Western, + « Pas de préférence » (exclusif).

Champ TMDB : `genre_ids`. Pas besoin d'appeler l'endpoint `/genre/movie/list` de TMDB pour ça — les `genres` reviennent déjà en `{id, name}` lors de l'enrichissement de chaque film, et la liste d'options de cette question peut être une constante statique `{28: "Action", ...}` (la liste TMDB est stable depuis des années). ⚠️ Filtrer sur l'id, jamais sur le `name` affiché.

### 4. Époque — Contenu, filtre dur, single-select

Muet & Noir/Blanc (avant 1930), Âge d'or Hollywood (1930–1959), Nouvelle Vague & Westerns (1960–1979), Blockbusters & Indie (1980–1999), 2000–2014, Récent (2015+), Pas de préférence.

Champ TMDB : `release_date`.

### 5. Région — Contenu, filtre dur, multi-select + sous-cas

Libellé UI : « Produit dans quel pays ? » — volontairement explicite sur le pays de **production**,
pas la langue ni le lieu où se déroule l'histoire (voir piège critique ci-dessous). L'ancien libellé
« Une région du monde qui t'attire ? » prêtait à confusion sur ce point.

5 grandes régions en chips : Américain, Britannique, Français, Japonais, Sud-Coréen, + « Pas de préférence » (exclusif) + « Autre pays » qui ouvre un input de recherche pour ajouter un ou plusieurs pays hors liste.

Champ TMDB : `origin_country` (ou `production_countries`). ⚠️ **Piège critique** : `origin_country` (pays de production) et `original_language` (langue) sont deux champs séparés. Un film britannique a typiquement `origin_country: GB` mais `original_language: en` — identique à un film américain. Filtrer sur la langue confondrait donc systématiquement UK et US. Le filtre doit obligatoirement utiliser `origin_country`, jamais `original_language`.

### 6. Émotion — Ambiance, filtre mou, multi-select

Peur, Rire, Ému, Tendu, Zen, Inspiré, Nostalgique, Amoureux, Dépaysé, Réfléchi, Choqué, Mystère, Épique, + « Peu m'importe » (exclusif).

### 7. Ambiance — Ambiance, filtre mou, multi-select

Spatial, Futuriste, Historique, Urbain, Rural, Film noir, Nature, Conte, Surréaliste, Post-apocalyptique, Médiéval, Dystopique, Mer, Montagne/froid, Minimaliste, + « Pas de préférence » (exclusif). Sans « Guerre » ni « Fantastique » — déjà couverts par Genre, voir plus haut.

### 8. Déjà vu — Verrou, filtre dur, single-select

« Oui, je veux du nouveau » (exclut les films déjà validés via CinePick) / « Peu importe » (les inclut aussi, utile pour un rewatch volontaire).

Champ utilisé : interne, pas TMDB — `historique.film_id` (liste des films acceptés via le swipe "Ce soir ✓" dans Résultat), stocké côté Supabase. **C'est aussi la dernière question posée** — sa réponse fige la taille finale du sous-ensemble filtré, envoyé à l'IA (voir "Sélection IA" plus bas).

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
   │  (Durée, Genre, Époque, Région, Déjà vu)  │
   │  réponse → recalcul front                 │
   │  (filter sur ids/champs, pas de back)      │
   │  → compteur "N films" affiché              │
   └────┬─────────────────────────────────────┘
        │
   N = 0 ? ──oui──► retire le dernier filtre appliqué, recalcule,
        │           affiche "aucun film exact, voici les plus proches"
        │ non
        ▼
   Questions filtres MOUS (Avec qui, Émotion, Ambiance)
   → aucune incidence sur la liste, accumulées en texte
        │
        ▼
   Après Déjà vu (dernière question) : taille du sous-ensemble final connue
   → 0 : écran "Aucun film trouvé" + Recommencer
   → 1+ : prompt final envoyé à Gemini → jusqu'à 3 candidats classés (voir Specs AI)
```

**Pourquoi le recalcul est en front et pas en back** : la watchlist enrichie est chargée une seule fois en mémoire après le scrape. Filtrer quelques centaines de films sur des critères simples (ids, runtime, date, pays, historique interne) est de l'ordre de la milliseconde — un aller-retour réseau à chaque question ajouterait de la latence pour rien.

**Le loading « we are cooking »** s'affiche après chaque question (cohérence visuelle demandée), avec un délai minimum artificiel (~300–500 ms) sur les questions filtres mous, puisque techniquement elles ne recalculent rien. Sur les questions filtres durs, ce délai correspond en partie au recalcul réel — qui reste de toute façon quasi instantané si l'algo est bien fait. **Ce délai est volontaire, pas un reflet du temps de calcul réel du moteur de filtrage** — à garder en tête si quelqu'un relit ce doc plus tard en pensant que le filtrage est lent.

**Fallback 0 résultat** : on ne retire jamais le dernier filtre dur posé à l'utilisateur sans explication. On recalcule en ignorant uniquement ce dernier filtre, et on affiche clairement que les résultats sont approchants plutôt qu'exacts.

### Exemple de parcours (illustratif)

Ordre réel des filtres durs : Durée → Genre → Époque → Région → Déjà vu (Déjà vu est toujours la
dernière question, donc le dernier filtre dur posé).

| Étape                | Filtre appliqué | Films restants |
| --------------------- | --------------- | -------------- |
| Départ                | —               | 180            |
| Durée = 1h30–2h       | dur             | 90             |
| Genre = Comédie       | dur             | 42             |
| Époque = 2015+        | dur             | 6              |
| Région = Français     | dur             | 4              |
| Déjà vu = Non         | dur             | 0              |

→ fallback déclenché sur la dernière étape : on retire le filtre Déjà vu, on recalcule → 4 films restants, message "aucun film exact, voici les plus proches". Sous-ensemble final = 4 → envoyé à Gemini, qui classe jusqu'à 3 candidats (voir "Sélection IA" plus bas).

## Un seul enrichissement TMDB, fait au sync

> **Correction du 2026-09-21** : cette section décrivait deux enrichissements distincts ("filtre" léger + "fiche" lourde post-IA) — ce plan n'a jamais été celui livré, voir [Specs DB](https://linear.app/maximdubreil/document/specs-db-09a3daa57241).

Un seul enrichissement TMDB (`genres`, `runtime`, `origin_country`, `overview`, `director`), appliqué à toute la watchlist au clic "Synchroniser", stocké dans `films`. `/recommend` ne fait aucun appel TMDB — il lit `films` tel quel, y compris pour les candidats retenus par l'IA.

## Sélection IA : 3 candidats par appel, 2 appels maximum par session

L'IA renvoie jusqu'à 3 candidats classés en un seul appel, dès qu'il reste au moins 1 film après
Déjà vu (détail complet du prompt, format et flow technique : [Specs AI](./ai.md)).

**Correction du 2026-09-23** : l'ancien court-circuit ("≤ 3 films → affichage direct, pas d'appel
IA") a été retiré. Il avait deux effets de bord non voulus, remontés en test utilisateur : les
questions filtres mous (Avec qui, Émotion, Ambiance) n'avaient plus aucun effet dès que le
sous-ensemble était petit (l'IA, seule à les lire, n'était jamais appelée), et `match_score`/
`ai_critique` restaient `null` — pas de résumé sur Résultat. L'IA est maintenant appelée dans tous
les cas où il reste au moins 1 film ; le prompt gère déjà nativement moins de 3 candidats.

Flow swipe complet :

- Skip 1 → candidat rank=2, déjà en cache (aucun appel réseau)
- Skip 2 → candidat rank=3, déjà en cache (aucun appel réseau)
- Skip 3 (tous refusés) → **2ème et dernier appel `/recommend`**, indépendant du premier (pas de conversation Gemini à état — voir [Specs AI](./ai.md)) ; films touchés il y a moins de 15 min naturellement exclus par `filtering.py`
  - Succès → retour sur "Carte film" avec les nouveaux candidats (même logique de swipe, mais pas de 3ème appel possible)
  - Échec (erreur technique ou sous-ensemble épuisé) → écran final "On n'a pas réussi à répondre à ta demande" + bouton **"Recommencer"** → **retour Questions, reset complet des 9 réponses**

2 appels `/recommend` maximum par session quand l'IA est appelée, sans exception (`MAX_ATTEMPTS`, `useResultFlow.ts`). Passé cette limite, la session est considérée comme épuisée et l'utilisateur repart de zéro.

## Session pérenne

Comment reprendre une recommandation en attente.

**Ajouté le 2026-09-23**, suite à un trou remonté en test utilisateur : une recommandation jamais
tranchée (reload de la page Résultat, app relancée, onglet fermé) n'avait aucune existence en
dehors de la mémoire de l'onglet — impossible d'y revenir, et rouvrir Questions relançait un appel
IA pour rien.

Le principe : `watch_history` est déjà la source de vérité (chaque candidat proposé y a une ligne
`"proposed"` avant même que l'utilisateur swipe, avec `rank`/`match_score`/`ai_critique` déjà
écrits — voir [Specs AI](./ai.md#session-pérenne)). Une session est **en attente** tant qu'au moins
une de ses lignes n'a pas de décision. Rien à stocker en plus côté serveur, et rien à garder côté
navigateur (`sessionStorage`, `location.state`) : la question "y a-t-il une recommandation en
attente" se répond avec une seule requête (`GET /recommend/current`, voir [Specs API](./api.md)).

**Le point d'entrée décide, jamais la page** :

- Avant de router vers Questions ou Résultat (clic sur "Nouvelle recherche", reload, retour dans
  l'app), le front appelle `GET /recommend/current`. Une session en attente → Résultat, reprise
  directement, aucun appel IA. Rien en attente → Questions, flow normal.
- Résultat n'a donc plus besoin de recevoir quoi que ce soit du routeur pour se reconstruire —
  l'URL fonctionne même après un reload complet ou depuis un autre appareil.

**"Recommencer"** (bouton visible uniquement sur une session reprise, pas sur un premier lancement)
appelle `POST /recommend/current/abandon` : marque en masse les candidats encore `"proposed"` de la
session comme `"skipped"` — réutilise la valeur de decision existante, rien de nouveau à modéliser.
Best-effort côté front (un échec réseau affiche un toast mais ne bloque pas le retour à Questions).

**Films jamais décidés et le verrou Déjà vu** : avec cette architecture, une session ne reste plus
jamais orpheline en silence — elle est soit reprise, soit explicitement close via "Recommencer".
Le cas résiduel (session très ancienne, jamais rouverte) suit la même règle qu'aujourd'hui : au-delà
de la fenêtre de 15 minutes (`_SESSION_WINDOW`, `filtering.py`), plus rien ne la distingue d'un
film simplement "touché" — comportement inchangé, pas de nouvelle règle nécessaire côté filtres durs.

⚠️ **Diagramme Excalidraw "5. Résultat" à mettre à jour** : il décrit encore "1-2 skips → nouvelle reco IA / 3 skips → retour Questions", ce qui ne correspond plus à ce mécanisme. Changements à faire dans le diagramme (listés mais pas encore appliqués) :

1. "1-2 skips → Nouvelle reco IA" → remplacer par "Carte suivante (cache)"
2. "3 skips → ? Questions (reset ?)" → remplacer par "2ème prompt Gemini (exclut films refusés)"
3. Ajouter deux sorties au 2ème prompt : succès → "Carte film" / échec → "Recommencer → Questions (reset)"
4. Ajouter le branchement 0 / 1+ (plus de palier 1-3 vs 4+, voir "Sélection IA" plus haut) en amont
   de la boucle de swipe
5. Ajouter l'entrée "session en attente" (`GET /recommend/current`) en amont de Questions — voir
   "Session pérenne" plus haut

## Trous produit — état au 2026-09-23

| Sujet                                                                      | Statut                                                                                   |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 0 film après filtres durs                                                  | ✅ Résolu — fallback "plus proche" (retire le dernier filtre, recalcule)                 |
| Sous-ensemble < 3 films pour l'IA                                          | ✅ Résolu — plus de court-circuit, l'IA est appelée dès 1 film (voir Specs AI)           |
| Filtres mous sans effet sur un petit sous-ensemble                        | ✅ Résolu — conséquence directe du point ci-dessus                                       |
| Compteurs skip/échec scopés à une session                                  | ✅ Résolu — state front uniquement, pas de colonne DB nécessaire en V1                   |
| Fin de session après échec des 2 prompts IA                                | ✅ Résolu — message "On n'a pas réussi" + bouton "Recommencer" → Questions reset complet |
| Recommandation jamais décidée = orpheline (reload, app relancée)          | ✅ Résolu — session pérenne, voir "Session pérenne" plus haut                            |
| Watchlist publique vide au scrape (0 film trouvé)                          | ⏳ Ouvert                                                                                |
| Bouton "précédent" sur Question 1 — annule vers Home ou désactivé ?        | ⏳ Ouvert                                                                                |
| Désync Letterboxd / "déjà vu" CinePick entre deux syncs                    | ⏳ Ouvert, non bloquant V1                                                               |
| Diff de sync watchlist (film retiré entre deux syncs, pas de `removed_at`) | ⏳ Ouvert, voir Specs DB                                                                 |
| `films.genres` : ids TMDB ou noms localisés ?                              | ⏳ À vérifier côté code existant                                                         |
