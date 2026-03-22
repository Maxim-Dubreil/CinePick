# PRD.md — CinePick

## Vision
Application mobile iOS qui analyse ta watchlist Letterboxd et recommande **le film parfait pour ce soir**, via un flow de questions adaptatif et Gemini AI. L'expérience doit être rapide, fluide, et donner l'impression que l'app te connaît.

---

## Problème résolu
Ta watchlist Letterboxd grossit sans fin. Quand vient le moment de regarder un film, tu passes 20 minutes à scroller sans choisir. CinePick te pose 4 questions et choisit pour toi — en tenant compte de ton humeur, ton temps, avec qui tu regardes.

---

## Utilisateur cible
- Cinéphile casual à avancé
- A une watchlist Letterboxd de 20 à 500+ films
- Utilise iOS
- Profil Letterboxd public

---

## Features — V1

### F0 — Onboarding (premier lancement uniquement)
- Wizard 3 écrans séquentiels, déclenché si aucune watchlist en cache
- **Écran 1 — Bienvenue** : présentation app, 3 blocs features, bouton "Commencer"
- **Écran 2 — Instructions** : guide pas à pas pour rendre la watchlist Letterboxd publique, bouton deep link vers les paramètres Letterboxd, checkbox de confirmation obligatoire avant de continuer
- **Écran 3 — Connexion** : saisie username, scraping avec progression en temps réel (3 étapes animées), écran de succès avec nb de films, gestion d'erreur typée (profil introuvable / watchlist privée / réseau)
- Après succès : flag `onboarding_complete` en AsyncStorage, jamais revu sauf reset
- Spec détaillée dans `ONBOARDING.md`

### F1 — Setup & Sync watchlist
- L'utilisateur entre son username Letterboxd
- Le backend scrape la watchlist (profil public)
- Chaque film est enrichi via TMDB : affiche, résumé, genres, durée, providers FR
- La watchlist est cachée localement (AsyncStorage)
- Sync automatique si dernière sync > 24h
- Bouton de sync manuelle sur l'écran Home

### F2 — Flow de questions adaptatif
- 4 questions max, une par écran plein (style Kahoot)
- Chaque question a 4 choix visuels (emoji + label)
- Animation de transition entre les questions (slide)
- Barre de progression en haut
- Les réponses sont envoyées au backend pour la recommandation

**Questions (dans l'ordre) :**
1. Énergie du soir (chill / intense / surprise / réfléchir)
2. Avec qui (seul / couple / amis / famille)
3. Temps disponible (-1h30 / 1h30-2h / 2h+ / peu importe)
4. Ce que tu veux ressentir (peur / rire / émotion / suspense)

### F3 — Recommandation Gemini
- Le backend envoie la watchlist enrichie + les réponses à Gemini 2.0 Flash
- Gemini retourne : titre, score de match (0-100), raison (2-3 phrases style critique ciné), mood tags, warning éventuel
- Le film retourné est forcément dans la watchlist de l'utilisateur
- Les films déjà refusés (swipés) sont exclus des recommandations suivantes

### F4 — Carte film swipeable
- Affiche TMDB pleine largeur
- Titre, durée, genres, score de match
- Citation Gemini en italique (style critique)
- Résumé TMDB (4 lignes, tronqué)
- Providers disponibles en France (Netflix, Canal+, etc.)
- Bouton "Voir sur TMDB"
- Swipe droite = "Ce soir !" (accepter)
- Swipe gauche = Skip (refus mémorisé)
- Overlay animé LIKE / SKIP pendant le swipe
- Boutons texte en bas (Skip / Ce soir) pour ceux qui ne savent pas swiper

### F5 — Logique post-swipe
- Après 1 ou 2 skips : nouvelle recommandation directe (Gemini prend en compte les refus)
- Après 3 skips : retour au flow de questions avec bannière "On affine !"
- Les titres refusés sont toujours passés à Gemini dans le contexte
- À l'acceptation : overlay plein-écran "Bon film ! 🍿" avec titre du film + bouton "Retour à l'accueil"
- Le film accepté est automatiquement sauvegardé dans l'historique local (AsyncStorage)

### F6 — Home screen
- Affiche username, nombre de films dans la watchlist
- Date/heure de la dernière sync
- Bouton principal "Trouver mon film ce soir"
- Bouton sync manuelle
- Bouton "🎬 Mes films validés (N)" → ouvre l'historique
- Message d'erreur si sync échoue

### F7 — Historique des films validés
- Liste scrollable des films acceptés, triés du plus récent au plus ancien (max 50)
- Chaque entrée : poster miniature, titre, année, genres, durée
- Tap sur un film → écran de détail (FilmDetailScreen)
- FilmDetailScreen : poster plein-cadre, titre, année, genres, runtime, match score, synopsis, raison IA, providers, warning
- Persisté en local (AsyncStorage, clé `watch_history`), dédupliqué par titre

---

## Features — V2 (future)
- Filtres par genre exclu persistants (ex: "jamais d'horreur")
- Support Android
- Partage de la reco (screenshot stylé)
- Mode "blind pick" (pas de questions, reco immédiate)
- Notation rapide après visionnage

---

## Contraintes techniques
- Profil Letterboxd doit être public (pas d'auth Letterboxd)
- Gemini API gratuite (quota ~1500 req/jour) — suffisant pour usage perso
- TMDB API gratuite
- Backend hébergé sur Railway (tier gratuit)
- App non publiée sur l'App Store (usage via Expo Go ou build perso)

---

## Métriques de succès V1
- Temps pour obtenir une reco < 8 secondes
- Moins de 5 questions pour arriver à un résultat
- Le film proposé est dans la watchlist 100% du temps
- Zéro crash sur le flow principal

---

## Non-objectifs V1
- Pas d'authentification utilisateur
- Pas de base de données cloud (tout local)
- Pas de support multi-utilisateurs
- Pas d'App Store
