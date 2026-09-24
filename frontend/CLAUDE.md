# Frontend — CLAUDE.md

Supplements the root [CLAUDE.md](../CLAUDE.md) with frontend-specific conventions.

## Tooling

- **pnpm** only (Node 24, pnpm 11.27.1 — matches CI). Never npm/yarn.
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

### Loading States

- Every component that renders data from a hook exposing `loading` must render a loading state
  for it — never leave a silent blank area while data is in flight.
- Check `loading` before checking "empty"/"error": e.g. `loading ? <Skeleton /> : !hasData ? <Empty /> : <Content />`.
  Never let "no data yet" (loading) fall through into the "confirmed empty" branch — they read as
  the same UI to the user but mean different things.
- Never use placeholder text (`'—'`, `"Chargement…"`) as a substitute for a loading state.

**Skeleton vs Spinner** — these are not interchangeable stand-ins for each other, they mark two
different situations:
- `Skeleton` (`@/components/ui`), shaped like the real content (same size/layout), for **any**
  passive data fetch that renders into a place with a known final shape — a section, a card, a
  list with a bounded page size. This is the default for page/section content, lists included —
  see [WatchProvidersBlock.tsx](src/components/WatchProvidersBlock.tsx) for the shaped-placeholder
  pattern and [History.tsx](src/pages/History.tsx) for a list of cards.
- `Spinner` only for: app bootstrap where the destination layout isn't known yet
  ([AppLoader.tsx](src/components/layout/AppLoader.tsx)); a full-screen blocking overlay for a
  user-triggered mutation with no content shape to preview
  ([SyncOverlay.tsx](src/components/home/SyncOverlay.tsx),
  [LoadingOverlay.tsx](src/components/question/LoadingOverlay.tsx)); or inline on a button/control
  mid-action (a rotating icon on a submit/delete/resync button — feedback that *this control* is
  busy, not a content placeholder).

**Page-level reveal** — when a page depends on more than one hook, aggregate every `loading` into
one `pageLoading = a || b || c` and pass that single flag down to every section instead of each
section's own hook loading. All sections mount already in their skeleton state and swap to real
content together, in one paint, once everything is ready — never section-by-section as each hook
happens to resolve, which reads as the page "jumping" repeatedly. See
[Profile.tsx](src/pages/Profile.tsx) for the pattern.

A secondary/enrichment block backed by a slower or less reliable external API (e.g. TMDB watch
providers via `useWatchProviders`) may join the gate, but only with a **bounded wait**: past a max
delay, reveal the rest anyway and let that block fall back to its own skeleton — an unbounded wait
would hold the whole view hostage to a third-party API's latency. See
[FilmCard.tsx](src/components/result/FilmCard.tsx) (`PROVIDERS_MAX_WAIT_MS`).

## Quality

- ESLint **zero-warning** policy (enforced in CI). Lint/format runs in CI — don't run formatters
  locally.
- Tests: Vitest + jsdom + React Testing Library (query by role / label / text). Supabase is mocked
  in test setup (`vitest.config.ts`).
