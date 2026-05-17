# Frontend — CLAUDE.md

This file supplements the root [CLAUDE.md](../CLAUDE.md) with frontend-specific conventions and guidance.

## Quick Start

```bash
cd frontend
pnpm dev              # Start dev server (localhost:5173)
pnpm test:watch      # Run tests in watch mode
VITE_MOCK_AUTH=true pnpm dev  # Dev with mocked authentication (no Supabase needed)
```

## Development with Mocked Auth

When Supabase is unavailable or during feature development, use the **mock authentication**:

```bash
VITE_MOCK_AUTH=true pnpm dev
```

**How it works:**

- Vite aliases `@/hooks/useAuth` → `__mocks__/useAuth.ts`
- The mock returns a hardcoded user session (see `__mocks__/useAuth.ts`)
- All pages can be built/tested without a live Supabase connection
- **To disable**: Simply omit `VITE_MOCK_AUTH=true` and ensure Supabase is running

**Mock user details:**

- Email: `dev@example.com`
- Name: `Dev User`
- ID: `mock-user-123`

## Component Structure

```sh
src/
├── pages/               # Page components (routed)
│   ├── Landing.tsx      # Auth + landing (unauthenticated)
│   ├── Home.tsx         # Main post-login page
│   ├── Question.tsx     # Q&A survey
│   ├── Résultat.tsx     # Recommendations result
│   ├── Profile.tsx      # User profile
│   └── NotFound.tsx     # 404 fallback
├── components/
│   ├── layout/          # Layout wrappers (Topbar, Background)
│   ├── ui/              # shadcn/ui primitives (Button, Card, Spinner, etc.)
│   ├── landing/         # Landing page sub-components
│   └── [feature]/       # Feature-specific components
├── hooks/
│   ├── useAuth.ts       # Auth state hook (real Supabase)
│   └── useTheme.ts      # Theme toggle hook
├── lib/
│   ├── supabase.ts      # Supabase client (anon key, browser-side)
│   ├── auth.ts          # Auth helpers (signInWithGoogle, signOut)
│   └── utils.ts         # Utility functions
└── App.tsx              # Root component (routes + auth guard)
```

## Key Conventions

### Imports

- Use `@` alias for `src/` imports: `import { Button } from "@/components/ui/button"`
- Avoid `../../../` relative paths

### Typing

- Strict TypeScript: no `any` types
- Import types from `@supabase/supabase-js` when needed
- Use `React.FC` sparingly; prefer function components with `React.ReactNode` return types

### Styling

- Tailwind CSS v4 (no `tailwind.config.js`)
- Design tokens are CSS variables in `index.css`
- shadcn/ui components use `nova` style variant
- No inline styles; all styling via Tailwind + CSS modules if needed

### Form Handling

- Use React hooks for form state (no form library yet)
- Validate on submit and display errors inline

### Async/Data

- Use React hooks (`useState`, `useEffect`) for async operations
- Mock API calls during development; integrate backend endpoints when ready
- No global state manager yet (Context API for auth only)

## Testing & Quality

- Tests: **jsdom** + React Testing Library (query by role, label, text)
- All checks from root `CLAUDE.md` apply: `pnpm lint`, `pnpm typecheck`, `pnpm test:watch`
- Mock Supabase in test setup; see `vitest.config.ts`

## Quick Troubleshooting

- **Module alias error** or **Supabase failed** → Run `VITE_MOCK_AUTH=true pnpm dev` first
- **ESLint on save** → `pnpm lint --fix` (formatter runs in CI)
