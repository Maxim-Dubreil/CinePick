# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CinePick is a movie recommendation app. Users connect their Letterboxd watchlist, answer
questions, and receive AI-powered film recommendations.

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4 + shadcn/ui
- **Backend**: FastAPI (Python 3.12) + Uvicorn
- **Database/Auth**: Supabase (PostgreSQL with RLS, Google OAuth)
- **AI**: Gemini API
- **Movie metadata**: TMDB API

Frontend-specific conventions live in [frontend/CLAUDE.md](frontend/CLAUDE.md).

## Development Commands

### Frontend (`/frontend`, pnpm only)

```bash
pnpm dev          # dev server (localhost:5173)
pnpm build        # production build
pnpm lint         # ESLint (zero-warning policy)
pnpm typecheck    # tsc --noEmit
pnpm test         # Vitest (run once) — pnpm test:watch for watch mode
```

### Backend (`/backend`)

```bash
uvicorn main:app --reload   # dev server (localhost:8000)
pytest                       # tests (single: pytest tests/test_main.py::test_name)
ruff check . / ruff format . # lint / format
pyright                      # type check
```

### Docker (full stack)

```bash
docker compose up --build
```

## Environment Setup

Copy `.env.example` to `.env.dev` in both `frontend/` and `backend/` (use `.env.prod` for local
prod testing). The authoritative variable lists are in each `.env.example` — refer to them rather
than duplicating here.

The backend selects the file via `ENV` (`load_dotenv(f".env.{ENV}")`, defaults to `dev`). The
frontend uses Vite's `--mode dev|prod`, which natively loads `.env.dev` / `.env.prod`.

## Architecture

### Auth Flow

Google OAuth is handled entirely by Supabase. On first login, a database trigger auto-creates a
row in `profiles`. The frontend tracks session state via `useAuth.ts` (wraps
`supabase.auth.onAuthStateChange`); `auth.ts` exposes `signInWithGoogle` / `signOut`.

### Backend

FastAPI app. The Supabase Python client is initialized in `supabase_client.py` using
`SUPABASE_SERVICE_ROLE_KEY` (server-side, bypasses RLS). New API routes are added as FastAPI routers.

### Database Schema

The schema (tables, columns, RLS policies) is versioned in
[backend/db/schema.sql](backend/db/schema.sql) — read it there. Core tables: `profiles`,
`watchlist_films`, `watch_history`. **All tables have Row Level Security enabled; users can only
access their own rows.**

### CI/CD

GitHub Actions with path-filtered triggers, one workflow per side — see
[.github/workflows/](.github/workflows/). Lint → Typecheck → Test on every push to
`develop`/`main`; build / integration tests gated to `main`. Reusable setup actions in
`.github/actions/`.

## Git

Solo developer on a monorepo: commit directly to `develop`, no feature branches. Commit message
format (English):

```text
type: [CIN-XX] description
```

Types: `feat`, `fix`, `chore`, `docs`, `test`, `style`.

## Language Policy

All code (identifiers, comments, documentation) in English. Frontend GUI text (labels, buttons,
messages) in French — currently hardcoded (no i18n layer).

## Key Conventions

- **Package manager**: pnpm (frontend only; never npm/yarn)
- **Python**: 3.12 (enforced in CI); Ruff line length 100
- **Tests**: backend mocks Supabase in `conftest.py` before importing `main`
