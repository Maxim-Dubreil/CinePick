# CinePick — Frontend

React 19 + TypeScript + Vite + Tailwind CSS v4 + shadcn/ui.

See the [root README](../README.md) for the full-stack overview and setup, and
[CLAUDE.md](CLAUDE.md) for frontend conventions (imports, typing, styling, state, tests).

## Commands

```sh
pnpm install
pnpm dev          # dev server (localhost:5173)
pnpm build        # production build
pnpm lint         # ESLint (zero-warning policy)
pnpm typecheck    # tsc --noEmit
pnpm test         # Vitest (run once)
pnpm test:watch   # Vitest (watch mode)
```

## Mocked auth

By default `pnpm dev` connects to real Supabase (values from `.env.dev`). To run the UI without
a live Supabase connection, use a hardcoded session instead:

```sh
VITE_MOCK_AUTH=true pnpm dev
```

The mock user is defined in [`__mocks__/useAuth.ts`](__mocks__/useAuth.ts).

## Structure

```sh
src/
├── components/   # UI components (shadcn/ui primitives + app components)
├── hooks/        # useAuth, etc.
├── lib/          # Supabase client, utils
├── pages/        # Route-level views
└── index.css     # Tailwind v4 + design tokens (CSS variables)
```
