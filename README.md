# CinePick

[![backend coverage](https://img.shields.io/codecov/c/github/Maxim-Dubreil/CinePick/develop?flag=backend&label=backend%20coverage)](https://app.codecov.io/gh/Maxim-Dubreil/CinePick?flags%5B0%5D=backend)
[![frontend coverage](https://img.shields.io/codecov/c/github/Maxim-Dubreil/CinePick/develop?flag=frontend&label=frontend%20coverage)](https://app.codecov.io/gh/Maxim-Dubreil/CinePick?flags%5B0%5D=frontend)

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

- Node.js 24
- pnpm 11.27.1
- Python 3.13
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

Frontend available at: `http://localhost:5173` Backend available at: `http://localhost:8000`

### API reference (Swagger UI)

FastAPI generates interactive API docs automatically — no setup needed. With the backend running,
open:

- `http://localhost:8000/docs` — Swagger UI (try requests directly in the browser)
- `http://localhost:8000/redoc` — ReDoc (read-only, cleaner for reference)
- `http://localhost:8000/openapi.json` — raw OpenAPI schema

Routes are grouped by tag (`health`, `letterboxd`, `profile`). This is the source of truth for exact
request/response shapes — [docs/specs/api.md](docs/specs/api.md) covers the _why_ (business rules,
open questions), not the exact contract.

## Project structure

```sh
CinePick/
├── frontend/
├── backend/
├── docker-compose.yml
└── README.md
```

## Contributing

See [CONTRIBUTING.md](.github/CONTRIBUTING.md) for the workflow, local validation hooks, and commit
conventions.

## License

All rights reserved — see [LICENSE](LICENSE).
