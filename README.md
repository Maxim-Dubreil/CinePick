# CinePick

Web app analysant une watchlist Letterboxd pour recommander un film via un flow de questions et une IA.

## Stack

- _Frontend_ : Vite, React, TypeScript
- _Backend_ : FastAPI (Python)
- _Database_ : Supabase (PostgreSQL)
- _Auth_ : Google OAuth via Supabase
- _IA_ : Gemini AI
- _Hosting_ : Vercel (frontend) et Railway (backend)

## Setup local

### Prérequis

- Node.js 18+
- Python 3.11+
- Docker / Docker Desktop

### Installation

**Frontend**

```sh
cd frontend && \
pnpm install && \
pnpm run dev
```

**Backend**

```sh
cd backend && \
pip install -r requirements.txt && \
uvicorn main:app --reload
```

## Structure du projet

```
CinePick/
├── frontend/
├── backend/
├── docker-compose.yml
└── README.md
```

## Conventions

**Branches**

main : Production - PR merge only - _protected_
develop : Work - Feature done - _default_
feat/CIN-XX-name : New feature
fix/CIN-XX-name : Bug correction
chore/CIN-XX-name : Config, Setup, Refacto

**Commits**

```sh
type(scope): [CIN-XX] short description
```

| Type    | Usage                          |
| ------- | ------------------------------ |
| `feat`  | Nouvelle fonctionnalité        |
| `fix`   | Correction de bug              |
| `chore` | Config, setup, refacto         |
| `docs`  | Documentation                  |
| `test`  | Ajout ou modification de tests |
| `style` | Formatage, pas de logique      |
