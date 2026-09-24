# Écrans & Navigation

> Source de vérité : ce fichier (versionné avec le code qu'il décrit). Miroir en lecture sur [Linear](https://linear.app/maximdubreil/document/ecrans-and-navigation-3801798532e9) — modifie ici, pas là-bas.
> Wireframes basse fidélité réalisés sur Figma. Home détaille la **bannière warning « watchlist non connectée »** + le **bloc stats compte**.

## Inventaire V1 — 7 écrans + 1 modale

```sh
Landing (public)
  ↓ Google OAuth
Home (privé)
  ├─ → Questions → Résultat (carte film)
  ├─ → Historique
  └─ → Profil → [modale] Connexion Letterboxd

About (public) ← lien footer (Landing, Profil, Historique)
```

Les états (loading / erreur / succès) sont des états d'un écran existant, pas des écrans séparés.

## 1. Landing — `/`

Public (redirect Home si connecté). Logo + tagline, pitch court, démo visuelle, **CTA unique « Se connecter avec Google »**. États : défaut / loading OAuth / erreur inline. Pas de header, pas de scroll infini.

## 2. Home — `/home`

Privé (redirect `/` si non connecté).

**Contenu :** greeting personnalisé, bouton principal « Trouver mon film ce soir », accès Historique, accès Profil (avatar topbar).

**Bannière watchlist non connectée** (priorité haute) : sous la topbar, **ton warning (orange/jaune du design system)**, message friendly (ex. _« Ta watchlist n'est pas encore connectée — configure-la pour lancer ton premier pick »_) + bouton **« Configurer »** → ouvre la modale Connexion Letterboxd (écran Profil).

**Bannière sync > 7 jours** : _« Ta watchlist n'a pas été mise à jour depuis X jours. [Sync] [Plus tard] »_.

**Bloc stats compte** (sous le bouton principal) : username Letterboxd utilisé · **état du compte** (`pending` / `error` / `connected`) · nb films vus · films dispos · dernière sync.

**Home n'est PAS :** une liste de films, des recommandations automatiques sans action.

## 3. Questions — `/questions`

Privé, watchlist requise. Barre de progression (X/8) avec le groupe en cours (Contexte/Contenu/Ambiance/Verrou), question centrée plein écran, « Pas de préférence » toujours dispo, bouton retour.

8 questions fixes, réparties en **filtres durs** (Genre, Durée, Époque, Région, Déjà vu — recalculent la liste de films en temps réel) et **filtres mous** (Émotion, Ambiance, Avec qui — alimentent le prompt IA sans filtrer). Détail complet des options, types, groupes, champs TMDB et algorithme de recalcul : voir [Specs Questions](./questions.md).

Réponse → highlight + avance auto après loading court (~300-500ms, "we are cooking"). Pas de navigation hors flow.

## 4. Résultat — `/result`

Privé, depuis le flow questions. Après Q9 (dernière question filtre dur), la taille du sous-ensemble filtré détermine le chemin — détail complet dans [Specs AI](./ai.md) :

| Taille | Comportement                                                                                                                                      |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0      | Écran « Aucun film trouvé » + **Recommencer → Questions (reset)**                                                                                 |
| 1 à 3  | Affichage direct, sans appel IA — badge score et bloc critique **masqués** (`match_score`/`ai_critique` restent `null`, aucune donnée à afficher) |
| 4 et + | Appel Gemini, badge score et critique affichés normalement                                                                                        |

Dans tous les cas, la transition loading → Résultat est **automatique**, sans bouton intermédiaire — cohérent avec l'avance auto déjà en place sur Questions.

Carte film : affiche TMDB, titre + année, durée + genres, résumé tronqué (« Lire plus »), providers FR, boutons « Ce soir ✓ » / « Passer ». Overlay swipe LIKE (vert/droite) / SKIP (rouge/gauche).

Post-swipe : accept → « Bon film ! 🍿 » + écriture `watch_history` → Home. Skip 1-2 → candidat suivant déjà en cache (aucun appel réseau). Skip 3 (les 3 candidats refusés, uniquement si l'IA a été appelée) → 2ᵉ et dernier appel IA excluant les films refusés ; succès → nouveaux candidats, même logique de swipe ; échec → écran « On n'a pas réussi à répondre à ta demande » + bouton **Recommencer → retour Questions, reset complet des 9 réponses**. Dans le cas 1-3 (pas d'IA), skip de tous les candidats → écran « Plus de films disponibles » + **Recommencer**, pas de 2ᵉ tentative possible. Détail complet du mécanisme : voir [Specs Questions](./questions.md) et [Specs AI](./ai.md).

## 5. Historique — `/history`

Privé. Liste triée par date, une carte par film avec : **affiche · titre · critique IA (résumé, tronqué) · note de proximité (`match_score`) · statut (`accepted`/`skipped`)**. Ce sont les seules infos réutilisées telles quelles depuis la décision d'origine, sans nouvel appel. Pour les films acceptés/skip via le cas 1-3 (pas d'IA), critique et note de proximité sont absentes — même masquage que sur Résultat.

Tap sur une carte → panel de détail (slide-in/modale) qui réaffiche toutes les infos de la fiche film, y compris `providers` (dispo streaming FR) — toujours refetché à ce moment, jamais stocké. **La note TMDB (`vote_average`) n'existe plus dans le schéma** : elle n'était affichée nulle part sur Résultat et aurait de toute façon été refetchée ici — inutile de la stocker. Voir Specs DB pour le raisonnement complet.

Vide : « Pas encore de films — lance ta première reco ! ».

## 6. Profil — `/profile`

Privé. Avatar Google + email, username Letterboxd + bouton « Modifier » (→ modale), nb films + dernière sync, bouton « Synchroniser maintenant », « Se déconnecter ».

### Modale — Connexion Letterboxd

Déclencheur : bouton « Modifier » (Profil) **ou** bannière Home « Configurer ». Input préfixe `letterboxd.com/`, instructions (rendre le profil public + lien externe), bouton « Charger ma watchlist → ». États : loading (compteur « X films trouvés… ») / succès (« X films prêts ! ») / erreur typée (profil introuvable / privé / réseau). Fermable via ✕.

## 7. About — `/about`

**Public, sans garde d'auth** : la route ne dépend ni de `user` ni de `authLoading`, elle s'affiche à l'identique connecté ou non. Les gardes des écrans privés sont inchangés — taper `/history` depuis `/about` sans session redirige toujours vers `/`.

**Volontairement discret** : hors du parcours principal. Seul point d'entrée : un item **« À PROPOS »** en fin de footer, même style que les autres items (texte secondaire, 11px), souligné pour se lire comme un lien, hover par opacité. Donc accessible depuis Landing, Profil et Historique ; **pas depuis Home**, qui masque le footer — assumé.

**Seule page de l'app en anglais** (le lien footer reste en français). Les autres écrans restent en français.

**Mise en page** : même fond que Landing (mur d'affiches flouté), pas de topbar, colonne unique alignée à gauche, sans carte englobante. Un seul élément fort : le titre en police de titre, à l'échelle du hero de Landing.

**Contenu** :

- Lien « ← Back » → `/` (qui redirige déjà vers `/home` si connecté).
- Titre + pitch court (précise que c'est un projet perso au code public).
- Bouton « View the code on GitHub ↗ » → `https://github.com/Maxim-Dubreil/CinePick`, nouvel onglet (`target="_blank" rel="noopener noreferrer"`).
- **Credits** — liste à deux colonnes (rôle / fournisseur), empilée sur mobile :
  - Movie data : logo TMDB + mention obligatoire **mot pour mot** (conditions d'utilisation de l'API TMDB) : _« This product uses the TMDB API but is not endorsed or certified by TMDB. »_
  - Watchlist : Letterboxd (non affilié).
  - Recommendations : Gemini (Google).
  - Made by : Maxim Dubreil + contact `mailto:maxim.dubreil@epitech.eu`.

**Hors scope** : stack technique, numéro de version, formulaire de contact.

## Récap navigation

| Depuis    | Vers              | Déclencheur                                                                           |
| --------- | ----------------- | ------------------------------------------------------------------------------------- |
| Landing   | Home              | OAuth réussi                                                                          |
| Home      | Questions         | Bouton principal                                                                      |
| Home      | Profil            | Avatar / bannière « Configurer »                                                      |
| Profil    | Modale Letterboxd | « Modifier » / bannière Home                                                          |
| Questions | Résultat          | Dernière réponse (Q9), avec ou sans appel IA selon la taille du sous-ensemble         |
| Résultat  | Home              | Accept                                                                                |
| Résultat  | Questions         | Échec des 2 tentatives IA, ou tous les candidats skip en mode sans-IA (reset complet) |
| Footer    | About             | Lien « À PROPOS » (visible sur Landing, Profil, Historique)                           |
| About     | Landing / Home    | « ← Back » (vers `/`, redirect `/home` si connecté)                                   |

## Maquettes (Figma)

Wireframes basse fidélité faits. À passer en final design : Home (3 états : no watchlist / default / sync outdated), Questions, Résultat, Historique, Profil + modale.

## Docs liées

- [Specs Questions](./questions.md) — détail des 8 questions, types, algorithme de filtrage
- [Specs AI](./ai.md) — format prompt/réponse IA, mécanisme des 2 tentatives, court-circuit sans IA
- [Specs DB (Linear)](https://linear.app/maximdubreil/document/specs-db-09a3daa57241) — schéma des tables, cache vs refresh
