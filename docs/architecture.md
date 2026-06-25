# CinePick — Architecture

## Schéma de base de données

```mermaid
erDiagram
    profiles {
        uuid id PK "FK → auth.users"
        text email
        text full_name
        text avatar_url
        text letterboxd_username
        timestamptz letterboxd_last_sync
        timestamptz created_at
        timestamptz updated_at
    }

    films {
        uuid id PK
        text letterboxd_slug UK "clé naturelle Letterboxd"
        integer tmdb_id
        text title
        integer year
        text poster_url
        text[] genres
        integer runtime
        text overview
        timestamptz created_at
    }

    user_watchlist_items {
        uuid user_id FK "→ profiles"
        uuid film_id FK "→ films"
        timestamptz added_at
    }

    watch_history {
        uuid id PK
        uuid user_id FK "→ profiles"
        uuid film_id FK "→ films"
        text decision "accepted | skipped"
        jsonb questions_context
        text ai_critique
        integer match_score
        timestamptz decided_at
    }

    profiles ||--o{ user_watchlist_items : "a une watchlist"
    films    ||--o{ user_watchlist_items : "est dans des watchlists"
    profiles ||--o{ watch_history       : "a un historique"
    films    ||--o{ watch_history       : "apparaît dans l'historique"
```

> **Note :** Ce schéma remplace `watchlist_films` (dénormalisé, une ligne par user × film)
> par `films` (catalogue global) + `user_watchlist_items` (table de jonction).
> Les données TMDB (`genres`, `runtime`, `overview`) sont stockées une seule fois par film,
> quel que soit le nombre d'utilisateurs qui l'ont dans leur watchlist.
> L'enrichissement TMDB est **lazy** : déclenché à la première recommandation du film, pas à la sync.

---

## Routes API

```mermaid
graph LR
    subgraph Letterboxd
        V["GET /letterboxd/validate?username=X<br/>→ { username, count }<br/>404 user inconnu · 403 watchlist privée"]
    end

    subgraph Watchlist
        S["POST /watchlist/sync<br/>body: { username }<br/>→ { count, synced_at }<br/>auth: Bearer JWT"]
    end

    subgraph Recommendations
        R["POST /recommend<br/>body: { answers[] }<br/>→ { films[] }<br/>auth: Bearer JWT"]
    end

    subgraph Profile
        GP["GET /profile<br/>→ { letterboxd_username, last_synced_at, … }<br/>auth: Bearer JWT"]
        PP["PUT /profile<br/>body: { … }<br/>auth: Bearer JWT"]
    end

    subgraph Santé
        H["GET /health → { status: ok }"]
        HR["GET /health/ready → { status, checks }"]
    end
```

### Flux utilisateur complet

```mermaid
sequenceDiagram
    actor U as Utilisateur
    participant F as Frontend
    participant B as Backend FastAPI
    participant LB as Letterboxd (scraping)
    participant TM as TMDB API
    participant DB as Supabase (PostgreSQL)

    Note over U,DB: Étape 1 — Vérification du compte Letterboxd
    U->>F: Saisit son pseudo Letterboxd
    F->>B: GET /letterboxd/validate?username=X
    B->>LB: Scrape page 1 watchlist
    LB-->>B: HTML page 1
    B-->>F: { username, count } · 404/403 si erreur
    F-->>U: "760 films trouvés" ou message d'erreur

    Note over U,DB: Étape 2 — Synchronisation watchlist
    U->>F: Clique "Synchroniser"
    F->>B: POST /watchlist/sync { username } + JWT
    B->>LB: Scrape toutes les pages (~N/28)
    LB-->>B: Tous les slugs + titres
    B->>DB: Upsert films (slugs nouveaux seulement)
    B->>DB: Remplace user_watchlist_items
    B->>DB: Met à jour profiles.letterboxd_last_sync
    B-->>F: { count, synced_at }
    F-->>U: "✓ 760 films synchronisés"

    Note over U,DB: Étape 3 — Recommandation
    U->>F: Répond aux questions (humeur, durée, …)
    F->>B: POST /recommend { answers[] } + JWT
    B->>DB: Récupère user_watchlist_items + films
    B->>TM: Enrichit les films sans tmdb_id (lazy)
    TM-->>B: genres, runtime, overview
    B->>DB: Met à jour films enrichis
    B->>B: Gemini : sélectionne les meilleurs films
    B-->>F: { films: [top picks] }
    F-->>U: Affiche les recommandations
```

---

## Ordre d'implémentation recommandé

| Ticket | Dépendances | Description |
|--------|-------------|-------------|
| **CIN-47** (révisé) | — | Créer `films` + `user_watchlist_items` (schéma normalisé) |
| **CIN-46** | CIN-47 | Implémenter POST /watchlist/sync réel (scraping toutes pages + DB) |
| **CIN-71** | CIN-46 | Topbar indicator (date dernière sync) |
| **CIN-72** | CIN-46 | Suppression cascade watchlist |
| Flow /recommend | CIN-46 | Questions → Gemini → résultats |
