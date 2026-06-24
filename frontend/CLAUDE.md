# Frontend — CLAUDE.md

Supplements the root [CLAUDE.md](../CLAUDE.md) with frontend-specific conventions.

## Tooling

- **pnpm** only (Node 22, pnpm 9 — matches CI). Never npm/yarn.
- `pnpm dev` (localhost:5173) · `pnpm build` · `pnpm lint` · `pnpm typecheck` · `pnpm test` /
  `pnpm test:watch`.

## Mocked Auth

`VITE_MOCK_AUTH=true pnpm dev` aliases `@/hooks/useAuth` → `__mocks__/useAuth.ts`, returning a
hardcoded session so the UI runs without a live Supabase connection. Omit the flag to use real
Supabase. The mock user is defined in `__mocks__/useAuth.ts`.

## Conventions

### Imports

- Use the `@` alias for `src/` imports (`@/components/ui/button`); avoid `../../../` paths.

### Typing

- Strict TypeScript, no `any`. Import Supabase types from `@supabase/supabase-js`.
- Prefer plain function components over `React.FC`.

### Styling

- Tailwind CSS v4 via the Vite plugin — no `tailwind.config.js`; design tokens are CSS variables
  in `index.css`.
- shadcn/ui primitives use the `nova` style variant.
- Style via Tailwind classes; no inline styles.

### State & Forms

- Auth state via Context (`useAuth`); other state via React hooks.
- Form state via React hooks; validate on submit and display errors inline.

## Quality

- ESLint **zero-warning** policy (enforced in CI). Lint/format runs in CI — don't run formatters
  locally.
- Tests: Vitest + jsdom + React Testing Library (query by role / label / text). Supabase is mocked
  in test setup (`vitest.config.ts`).
