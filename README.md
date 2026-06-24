# CinePick

A web app that analyzes a Letterboxd watchlist to recommend a movie through a question flow and AI.

## Stack

- _Frontend_ : Vite, React, TypeScript
- _Backend_ : FastAPI (Python)
- _Database_ : Supabase (PostgreSQL)
- _Auth_ : Google OAuth via Supabase
- _AI_ : Gemini AI
- _Hosting_ : Vercel (frontend) and Railway (backend)

## Local setup

### Prerequisites

- Node.js 22
- Python 3.12
- Docker / Docker Desktop

### Environment variables

Copy `.env.example` to `.env.dev` in both `frontend/` and `backend/`, then fill in the values.

### Installation

#### Frontend

```sh
cd frontend && \
pnpm install && \
pnpm run dev
```

#### Backend

```sh
cd backend && \
pip install -r requirements.txt && \
uvicorn main:app --reload
```

#### Docker (recommended)

```sh
docker compose up --build
```

Frontend available at: `http://localhost:5173`
Backend available at: `http://localhost:8000`

## Project structure

```sh
CinePick/
├── frontend/
├── backend/
├── docker-compose.yml
└── README.md
```

## Conventions

### Branches

Solo developer: commit directly to `develop` (default branch). `main` is the protected
production branch (merges only).

### Commits

```sh
type: [CIN-XX] description
```

| Type    | Usage                        |
| ------- | ---------------------------- |
| `feat`  | New feature                  |
| `fix`   | Bug fix                      |
| `chore` | Config, setup, refactor      |
| `docs`  | Documentation                |
| `test`  | Add or update tests          |
| `style` | Formatting, no logic changes |
