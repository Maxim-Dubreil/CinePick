# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CinePick is a movie recommendation app. Users connect their Letterboxd watchlist, answer questions, and receive AI-powered film recommendations. The stack is:

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4 + shadcn/ui
- **Backend**: FastAPI (Python 3.12) + Uvicorn
- **Database/Auth**: Supabase (PostgreSQL with RLS, Google OAuth)
- **AI**: Gemini API (key provisioned, not yet wired)
- **Movie metadata**: TMDB API

## Development Commands

### Frontend (`/frontend`)

```bash
pnpm dev          # start dev server (localhost:5173)
pnpm build        # production build
pnpm lint         # ESLint (must pass with 0 warnings)
pnpm typecheck    # tsc --noEmit
pnpm test         # Vitest (run once)
pnpm test:watch   # Vitest watch mode
```

### Backend (`/backend`)

```bash
uvicorn main:app --reload              # start dev server (localhost:8000)
pytest                                  # run all tests
pytest tests/test_main.py::test_name   # run a single test
ruff check .                           # lint
ruff format .                          # format
pyright                                # type check
```

### Docker (full stack)

```bash
docker compose up --build   # start frontend + backend together
```

## Frontend-Specific Conventions

For detailed frontend architecture, development patterns, and mocked auth setup, see [`frontend/CLAUDE.md`](frontend/CLAUDE.md).

### Developing Without Supabase (Mocked Auth)

When Supabase is unavailable or you're building UI in isolation:

```bash
cd frontend
VITE_MOCK_AUTH=true pnpm dev
```

This aliases `useAuth` to a mock that returns a hardcoded user session. **Perfect for feature development when Supabase is paused.**

To disable, simply run `pnpm dev` (requires live Supabase).

## Environment Setup

Copy `.env.example` to `.env.dev` in both `frontend/` and `backend/`. For local production testing, use `.env.prod` (optional; in real production environments, Railway and Vercel inject vars directly).

**Backend** (`.env.dev`): `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ALLOWED_ORIGINS`, `GEMINI_API_KEY`, `TMDB_API_KEY`

**Frontend** (`.env.dev`): `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

The backend reads the correct file via `ENV` variable: `load_dotenv(f".env.{ENV}")` (defaults to `dev`). The frontend uses Vite's `--mode dev` / `--mode prod` flags, which natively load `.env.dev` / `.env.prod`.

## Architecture

### Auth Flow

Google OAuth is handled entirely by Supabase. On first login, a database trigger auto-creates a row in `profiles`. The frontend uses `useAuth.ts` (wraps `supabase.auth.onAuthStateChange`) to track session state; `auth.ts` exposes `signInWithGoogle` / `signOut` helpers.

### Backend

Minimal FastAPI app — currently only health check endpoints. The Supabase Python client is initialized in `supabase_client.py` using `SUPABASE_SERVICE_ROLE_KEY` (server-side, bypasses RLS). New API routes should be added as FastAPI routers.

### Frontend Component Structure

- `App.tsx` — root; manages auth loading state and delegates to pages
- `pages/Landing.tsx` — the only page currently; renders auth + feature intro
- `components/layout/` — `Topbar`, `Background` (two variants: `landing`/`app`), `AppLoader`
- `components/ui/` — shadcn/ui primitives (Button, Card, Spinner, etc.)
- `lib/supabase.ts` — browser Supabase client (uses anon key)

### Database Schema (Supabase/PostgreSQL)

- `profiles` — user info + Letterboxd username/sync timestamp
- `watchlist_films` — enriched film records (TMDB id, genres, poster, runtime)
- `watch_history` — per-user decision log (`accepted`/`skipped`) with AI critique and match score stored as JSONB

All tables have Row Level Security enabled; users can only access their own rows.

### CI/CD

GitHub Actions with path-filtered triggers. Each side (frontend/backend) has its own workflow:

1. Lint → Typecheck → Test (on all pushes to `develop`/`main`)
2. Build / Smoke test (only on `main`)

Reusable setup actions live in `.github/actions/setup-frontend` and `setup-backend`.

## Session Logging

After each significant commit, update `/home/maxim/.claude/projects/-home-maxim-work-CinePick/logs.md` with:

- **Action number and status** (✅ for completed)
- **Date/time range** of the work
- **Description** (one sentence summary)
- **Details** (what was done, what changed)
- **Files** (created, modified, deleted)
- **Commits** (list of commit hashes and messages)
- Update the Summary section at the bottom with current totals

This keeps a persistent record of work across sessions.

## Language Policy

All code (identifiers, comments, documentation files) must be written in English. Frontend GUI text (labels, buttons, messages visible in the browser) must be in French. An i18n system is not yet implemented; French strings are currently hardcoded.

## Key Conventions

- **Package manager**: pnpm (frontend only; never use npm/yarn in `frontend/`)
- **Python version**: 3.12 (enforced in CI)
- **Ruff line length**: 100, target Python 3.12
- **Tailwind**: v4 Vite plugin — no `tailwind.config.js`; design tokens are CSS variables in `index.css`
- **shadcn/ui style**: `nova` variant with Radix UI primitives
- **ESLint**: zero-warning policy enforced in CI
- **Tests**: Backend tests mock Supabase in `conftest.py` before importing `main`; frontend tests use jsdom + React Testing Library
