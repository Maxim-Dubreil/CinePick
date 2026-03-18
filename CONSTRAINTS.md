# CONSTRAINTS.md — Limites, quotas & budget tokens

Ce fichier est la source de vérité sur les contraintes techniques et économiques du projet.
L'agent doit le lire avant toute décision d'architecture impliquant des appels réseau ou IA.

---

## Principe directeur

> Chaque utilisateur apporte sa propre clé API.
> Le backend ne détient aucune clé. Zéro coût côté serveur pour l'IA.

---

## Infrastructure backend — Railway free tier

| Limite | Valeur | Impact |
|--------|--------|--------|
| Compute | 500h/mois (~$5 crédit) | ~16h/jour max — suffisant usage perso |
| Cold start | 3–5s après inactivité | Afficher un loader "Connexion..." au lancement |
| RAM | 512 MB | Suffisant pour FastAPI + scraping léger |
| Bande passante | 100 GB/mois | Largement suffisant |
| Domaine | Inclus (`.up.railway.app`) | Pas besoin de domaine custom |
| Persistance | Aucune (pas de DB) | Tout est en AsyncStorage côté app |

**Règle** : le backend ne fait que scraper et router. Aucune donnée persistée côté serveur.

---

## Providers IA supportés

### Comparatif quotas gratuits

| Provider | Modèle recommandé | Req/jour (free) | Tokens/min | Coût après quota |
|----------|-------------------|-----------------|------------|-----------------|
| **Gemini** | Flash 2.0 | 1 500 | 1M | $0.075/1M tokens |
| **Groq** | Llama 3.3 70B | 14 400 | 6 000 | $0.59/1M tokens |
| OpenAI | GPT-4o mini | ❌ payant | — | $0.15/1M tokens |
| Anthropic | Claude Haiku | ❌ payant | — | $0.25/1M tokens |

**Recommandé par défaut dans l'onboarding : Gemini Flash 2.0**
**Alternative gratuite généreuse : Groq (Llama 3.3 70B)**
OpenAI et Anthropic listés mais marqués "payant" dans l'UI.

### Où obtenir les clés (liens pour l'onboarding)
- Gemini : https://aistudio.google.com/app/apikey
- Groq : https://console.groq.com/keys
- OpenAI : https://platform.openai.com/api-keys
- Anthropic : https://console.anthropic.com/settings/keys

---

## Budget tokens — estimation par session

### Composition d'un appel `/recommend`

```
Watchlist 100 films (titre + année + genres + durée)  ≈  4 500 tokens
Watchlist 150 films                                   ≈  6 500 tokens
Watchlist 300 films                                   ≈ 12 000 tokens
Questions / réponses utilisateur                      ≈    400 tokens
Titres refusés (max 10)                               ≈    100 tokens
Prompt système                                        ≈    300 tokens
Réponse Gemini (JSON recommandation)                  ≈    300 tokens
─────────────────────────────────────────────────────────────────────
TOTAL par appel (150 films)                           ≈  7 600 tokens
```

### Estimation sessions complètes (avec swipes)

| Scénario | Appels IA | Tokens total | Quota Gemini restant/jour |
|----------|-----------|--------------|--------------------------|
| Reco directe acceptée | 1 | ~7 600 | 1 499 restantes |
| 2 skips + accepté | 3 | ~22 800 | 1 497 restantes |
| 3 skips + retour questions | 3 | ~22 800 | 1 497 restantes |

**Conclusion** : avec Gemini, ~110 sessions complètes/jour par clé utilisateur.
Avec Groq : ~1 600 sessions/jour par clé. Pas de problème en usage perso.

---

## Stratégie d'optimisation tokens

### 1. Compression de la watchlist (côté backend)
Ne jamais envoyer les champs non utiles à la reco :
```python
# ❌ Ne pas envoyer
film = {"title":..., "poster":..., "overview":..., "tmdb_url":..., "providers":...}

# ✅ Envoyer uniquement pour le prompt IA
film_for_prompt = {"t": title, "y": year, "g": genres[:2], "r": runtime}
# "The Brutalist|2024|Drama,History|215" = ~8 tokens vs ~40 tokens en JSON complet
```

Format condensé : `"titre|année|genre1,genre2|durée"` — 1 ligne par film.
150 films en format condensé ≈ 2 500 tokens (vs 6 500 en JSON).

### 2. Limite watchlist pour le prompt
- Envoyer max 200 films au prompt (les plus récemment ajoutés à la watchlist)
- Si watchlist > 200 films : pré-filtrer côté backend selon les réponses aux questions avant d'envoyer à Gemini
- Exemple : si durée = "court" → exclure les films > 150min avant le prompt

### 3. Ne pas re-envoyer les films déjà refusés dans la watchlist
Les titres refusés sont passés séparément en instruction, pas intégrés dans la liste complète.

### 4. Cache de recommandation
Si les réponses aux questions sont identiques à la session précédente ET watchlist inchangée → proposer le même film sans appel IA (avec bouton "Nouvelle suggestion").

---

## Sync watchlist — politique

| Déclencheur | Comportement |
|-------------|--------------|
| Bouton manuel "↻ Sync" | Toujours autorisé, déclenche immédiatement |
| Dernière sync > 7 jours | Bannière rappel sur Home (non bloquant) |
| Lancement app | ❌ Jamais automatique |
| Onboarding (premier chargement) | 1 seul appel scraping obligatoire |

**Pas de sync automatique.** L'utilisateur contrôle quand Letterboxd est scraped.

Bannière rappel (après 7 jours sans sync) :
```
"Ta watchlist n'a pas été mise à jour depuis X jours.  [Sync →]  [Plus tard]"
```
Dismissable, ne réapparaît pas avant 3 jours supplémentaires si ignorée.

---

## TMDB API — quotas

- Gratuit : 10 000 req/jour
- Enrichissement watchlist 150 films = 150 req (1 par film)
- Largement dans les clous
- La clé TMDB reste côté backend (pas exposée à l'utilisateur)
- Si TMDB rate limit atteint : retourner le film sans enrichissement (titre + année suffisent pour Gemini)

---

## Scraping Letterboxd — bonnes pratiques

- User-Agent mobile (moins de friction)
- Délai 0.5s entre les pages (éviter le rate limiting)
- Max 20 pages = 560 films (au-delà, peu utile pour la reco)
- En cas d'échec scraping : utiliser la watchlist en cache si disponible

---

## Modèle custom fine-tuné — verdict

**Non viable dans les contraintes gratuites actuelles.**

| Option | Coût | Verdict |
|--------|------|---------|
| Fine-tuning Gemini | ~$2/1000 tokens entraînement | ❌ Payant |
| Fine-tuning Groq | Non disponible | ❌ Impossible |
| Ollama local (mobile) | Gratuit mais 4Go+ RAM | ❌ Trop lourd pour mobile |
| GGUF on-device | Gratuit mais Expo incompatible | ❌ Hors scope |

**Alternative** : optimisation du prompt système ("prompt engineering") qui donne 90-95% des résultats d'un fine-tune pour ce cas d'usage précis. Documenté dans `backend/gemini.py` comme `SYSTEM_PROMPT`.

Réserver le fine-tuning pour une V3 si l'app est utilisée par > 100 users et génère des données d'interaction.

---

## Variables d'environnement — séparation dev/prod

### Backend `.env.development`
```
TMDB_API_KEY=ta_clé_tmdb
ENV=development
# Pas de clé IA côté backend — elle vient du client
```

### Backend `.env.production`
```
TMDB_API_KEY=ta_clé_tmdb
ENV=production
```

### App — clé IA
La clé IA est saisie par l'utilisateur dans l'onboarding et stockée dans AsyncStorage.
Elle est envoyée dans le header de chaque requête `/recommend`.
**Elle ne transite jamais par le backend** — l'appel IA se fait directement depuis l'app.

> Architecture : App → Gemini/Groq API (direct)
>                App → Backend (scraping TMDB uniquement)

Cela élimine tout risque de fuite de clé côté serveur et supprime les coûts IA côté Railway.

---

## Architecture appel IA — direct depuis l'app

```
┌─────────────────────┐         ┌──────────────────────┐
│    App (Expo)       │────────▶│  Gemini / Groq API   │
│  clé stockée local  │  HTTPS  │  (provider choisi)   │
└─────────────────────┘         └──────────────────────┘
         │
         │ scraping + TMDB
         ▼
┌─────────────────────┐         ┌──────────────────────┐
│  Backend (Railway)  │────────▶│  Letterboxd + TMDB   │
│  clé TMDB seulement │         └──────────────────────┘
└─────────────────────┘
```

L'app appelle Gemini/Groq **directement** (pas via le backend).
Le backend n'a besoin que de la clé TMDB.
