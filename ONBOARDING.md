# ONBOARDING.md — CinePick Setup Wizard

Spec complète du flow d'initialisation. Se déclenche uniquement au premier lancement (aucune watchlist en cache). Après complétion, l'utilisateur ne revoit jamais ces écrans sauf s'il reset son compte.

---

## Vue d'ensemble du wizard

```
[Écran 1 — Bienvenue]
        ↓
[Écran 2 — Clé API]
        ↓
[Écran 3 — Rendre le profil public]
        ↓
[Écran 4 — Connexion username]
        ↓ (sync réussie)
[Home Screen]
```

Progression visible via stepper 4 points en haut de chaque écran.
Pas de bouton retour sur l'écran 1. Retour possible sur les écrans 2, 3 et 4.

---

## Écran 1 — Bienvenue

### Rôle
Présenter l'app, créer l'envie, expliquer le concept en 10 secondes.

### Contenu
```
🎬  [grande icône animée]

CinePick

"Ta watchlist Letterboxd.
 Le film parfait pour ce soir."

——————————————————————————

[Bloc feature 1]  🎯  Analyse ta watchlist
                      Gemini parcourt tous tes films
                      
[Bloc feature 2]  ⚡  4 questions max
                      On cible ton humeur du soir
                      
[Bloc feature 3]  🃏  Swipe pour choisir
                      Skip jusqu'au bon

——————————————————————————

[Bouton principal]  "Commencer  →"
```

### Comportement
- Animation d'entrée : les 3 blocs features apparaissent en stagger (délai 100ms entre chaque)
- Bouton "Commencer" → slide vers Écran 2
- Pas de "Skip" — l'onboarding est obligatoire au premier lancement

---

## Écran 2 — Clé API

### Rôle
Permettre à l'utilisateur de brancher son propre provider IA. L'app ne prend en charge aucun coût IA — chaque utilisateur utilise son quota gratuit personnel.

### Contenu
```
◀ Retour    ● ○ ○ ○    [stepper]

Étape 1 sur 3

Connecte ton IA

"CinePick utilise un modèle IA pour analyser
 ta watchlist. Tu as besoin d'une clé API gratuite."

——————————————————————————

Choisis ton provider :

[●] Gemini (Google)     RECOMMANDÉ · Gratuit
[ ] Groq (Llama 3.3)    Gratuit · Très généreux
[ ] OpenAI (GPT-4o)     Payant après essai
[ ] Anthropic (Claude)  Payant

——————————————————————————

Ta clé API [_________________________]
           input texte · sécurisé

[Lien]  "Comment obtenir ma clé →"
        (ouvre le lien doc du provider sélectionné)

[Bouton principal — désactivé si champ vide]
"Vérifier la clé  →"
```

### Providers et liens

| Provider | Lien clé | Quota gratuit |
|----------|----------|---------------|
| Gemini | https://aistudio.google.com/app/apikey | 1 500 req/jour |
| Groq | https://console.groq.com/keys | 14 400 req/jour |
| OpenAI | https://platform.openai.com/api-keys | Payant |
| Anthropic | https://console.anthropic.com/settings/keys | Payant |

### Comportement
- Sélection provider → met à jour le lien "Comment obtenir ma clé"
- Bouton "Vérifier la clé" → appel de test minimaliste (~10 tokens) vers le provider
  - Succès → slide vers Écran 3
  - Erreur → message d'erreur inline (clé invalide / quota dépassé / réseau)
- La clé est stockée dans AsyncStorage avec le nom du provider
- Elle n'est **jamais** envoyée au backend — elle part directement vers le provider IA depuis l'app

### Vérification de la clé (appel test)
```json
// Test Gemini
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent
{ "contents": [{ "parts": [{ "text": "Réponds juste: ok" }] }] }

// Test Groq
POST https://api.groq.com/openai/v1/chat/completions
{ "model": "llama-3.3-70b-versatile", "messages": [{"role":"user","content":"ok"}], "max_tokens": 2 }
```

### Messages d'erreur
- Clé invalide : "Clé non reconnue par [Provider]. Vérifie que tu l'as bien copiée."
- Quota dépassé : "Quota journalier atteint. Réessaie demain ou choisis un autre provider."
- Réseau : "Impossible de joindre [Provider]. Vérifie ta connexion."

### Note sécurité
La clé est stockée avec `AsyncStorage` (chiffré sur iOS via Secure Enclave).
Afficher la clé masquée (••••••••) après saisie, avec bouton 👁 pour révéler.

---

## Écran 3 — Préparer Letterboxd

### Rôle
Guider l'utilisateur pour rendre sa watchlist publique sur Letterboxd avant de tenter le scraping. Évite l'erreur "profil introuvable" sur l'écran suivant.

### Contenu
```
◀ Retour    ● ● ○    [stepper]

Étape 2 sur 3

Rends ta watchlist
publique

"CinePick lit ta watchlist directement
 depuis Letterboxd. Elle doit être publique."

——————————————————————————

Instructions pas à pas :

[1]  Ouvre Letterboxd
     → Bouton  "Ouvrir Letterboxd  ↗"
       (ouvre letterboxd.com dans le navigateur)

[2]  Va dans  Paramètres → Privacy

[3]  "Watchlist visibility"
     Passe sur  ✅ Public

[4]  Enregistre

——————————————————————————

[Checkbox]  ☐  "C'est fait, ma watchlist est publique"

[Bouton principal — désactivé jusqu'à checkbox cochée]
"Continuer  →"
```

### Comportement
- Bouton "Ouvrir Letterboxd" → `Linking.openURL('https://letterboxd.com/settings/privacy/')`
- Checkbox obligatoire avant de pouvoir continuer — c'est un engagement de l'utilisateur, pas une vérification technique
- Checkbox cochée → bouton s'active avec animation (opacity 0.4 → 1)
- "Continuer" → slide vers Écran 3

### Note pour l'agent
Ne pas vérifier techniquement si le profil est public à cette étape. La vérification se fait naturellement lors du scraping sur l'écran suivant.

---

## Écran 4 — Connexion

### Rôle
Saisir le username, déclencher le scraping, afficher la progression, confirmer le succès.

### États de cet écran

```
État A : Saisie
État B : Chargement (scraping en cours)
État C : Succès
État D : Erreur
```

---

### État A — Saisie

```
◀ Retour    ● ● ● ○    [stepper]

Étape 3 sur 3

Ton username
Letterboxd

"On va charger tous tes films
 et les enrichir avec les affiches."

——————————————————————————

letterboxd.com/ [____________]
                  input texte

——————————————————————————

[Bouton principal]  "Charger ma watchlist  →"
(désactivé si input vide)
```

---

### État B — Chargement

```
[Remplace tout le contenu de l'écran]

🎬  [animation : barre de progression ou spinner]

Chargement en cours...

Étape 1/3  Connexion à Letterboxd  ✓
Étape 2/3  Lecture de ta watchlist...  ⟳
Étape 3/3  Enrichissement des films      (grisé)

"X films trouvés"  ← se met à jour en temps réel
```

Les 3 étapes s'affichent séquentiellement avec icône :
- `⟳` en cours (animé)
- `✓` terminé (vert)
- texte grisé = pas encore commencé

**Progression temps réel** : le backend envoie le compte de films scrapés avant enrichissement TMDB. Afficher `"X films trouvés dans ta watchlist"` dès que disponible.

---

### État C — Succès

```
✅  [grande coche animée, scale in]

Watchlist chargée !

"142 films prêts à être analysés"
       ↑ nombre réel

——————————————————————————

[Bouton principal]  "C'est parti  🎬"
```

Animation : la coche apparaît avec un scale spring (0 → 1.2 → 1).
Bouton → Home Screen.

---

### État D — Erreur

Trois types d'erreur possibles, chacun avec un message et une action différente :

**Erreur : profil introuvable**
```
⚠️  Profil introuvable

"Le username '@[username]' n'existe pas
 sur Letterboxd."

[Bouton]  "Corriger le username"  → retour État A
```

**Erreur : watchlist privée ou vide**
```
🔒  Watchlist inaccessible

"Ta watchlist semble être privée ou vide.
 Retourne sur l'étape précédente pour
 vérifier les réglages."

[Bouton secondaire]  "← Retour aux instructions"  → Écran 2
[Bouton principal]   "Réessayer"  → relance le scraping
```

**Erreur : réseau / serveur**
```
📡  Problème de connexion

"Impossible de joindre le serveur.
 Vérifie ta connexion internet."

[Bouton]  "Réessayer"  → relance le scraping
```

---

## State machine onboarding (pour App.tsx)

```typescript
type OnboardingScreen = 
  | 'welcome'        // Écran 1
  | 'instructions'   // Écran 2
  | 'connect'        // Écran 3 état A
  | 'loading'        // Écran 3 état B
  | 'success'        // Écran 3 état C
  // Les erreurs sont des sous-états de 'connect'

// Condition de déclenchement de l'onboarding
const needsOnboarding = !(await AsyncStorage.getItem('watchlist'))
```

---

## Données persistées après onboarding

Une fois l'onboarding terminé avec succès, sauvegarder dans AsyncStorage :

```typescript
'letterboxd_username'    // string — le username saisi
'watchlist'              // JSON — array de Film enrichis
'watchlist_synced_at'    // string — timestamp ISO
'onboarding_complete'    // 'true' — flag pour ne plus afficher l'onboarding
```

---

## Reset du compte (option dans settings futurs)

Pour permettre un futur "Changer de compte" ou "Reset" :
```typescript
async function resetAccount() {
  await AsyncStorage.multiRemove([
    'letterboxd_username',
    'watchlist',
    'watchlist_synced_at',
    'onboarding_complete'
  ])
  // → redirige vers 'welcome'
}
```

---

## Règles UX globales du wizard

- **Jamais de données techniques** dans les messages d'erreur (pas de stack trace, pas de code HTTP)
- **Toujours une action de sortie** sur chaque état d'erreur
- **Transitions** : slide horizontal entre écrans (gauche → droite pour avancer, droite → gauche pour retour)
- **Stepper** : 3 points, le point actif est accent (`tokens.colors.accent`), les autres sont `tokens.colors.border`
- **Bouton désactivé** = opacity 0.4, non pressable — jamais caché
