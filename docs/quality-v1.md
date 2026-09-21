# V1 Quality Scope

This document defines the minimum quality scope for the first functional version of CinePick. It
links user-facing features to automated checks and makes the remaining coverage visible.

## Validation Commands

Run the full local validation from the repository root:

```sh
make verify
git diff --check
```

`make verify` rebuilds the Docker images, then runs backend tests, Ruff, Pyright, frontend lint,
TypeScript, frontend tests, and the production frontend build.

GitHub Actions repeats the checks in clean runners. The Supabase RLS integration tests run when the
integration job has `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, and
`RUN_INTEGRATION_TESTS=1`.

## V1 Feature Scope

| Feature                        | Main implementation                                                            | Current automated coverage                                     |
| ------------------------------ | ------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| Google/Supabase authentication | `frontend/src/contexts/AuthContext.tsx`                                        | Routing and component tests with auth mocks                    |
| Letterboxd validation and sync | `backend/scraper.py`, `backend/main.py`                                        | Endpoint, scraper fixture, error-path tests                    |
| Atomic watchlist replacement   | `backend/repositories/watchlist.py`, Supabase migration                        | Repository tests; database integration path                    |
| Questionnaire filters          | `backend/filtering.py`, `frontend/src/hooks/useQuestionFlow.ts`                | Backend filtering tests and questionnaire UI tests             |
| AI recommendations             | `backend/reco_ai.py`                                                           | Provider parsing, bounds, duplicate and invalid-response tests |
| Recommendation decisions       | `backend/repositories/watch_history.py`, `frontend/src/hooks/useResultFlow.ts` | API, repository and result-flow tests                          |
| Profile and history            | `frontend/src/pages/Profile.tsx`, `frontend/src/hooks/useHistory.ts`           | Partial component coverage                                     |
| Error feedback                 | `frontend/src/components/ui/toast.tsx`                                         | Toast and page-level error paths                               |
| RLS ownership                  | `supabase/migrations/`, `backend/tests/test_rls.py`                            | Real two-user test when integration secrets are available      |

## Current Baseline

- Backend: 91 passing tests in the local Docker validation.
- Frontend: 104 passing tests.
- Ruff: passing.
- Pyright: passing in Docker.
- TypeScript and ESLint: passing.
- Production frontend build: passing.

Skipped tests are environment-dependent integration tests. They must not be interpreted as passing
security checks unless the Supabase integration job actually runs them.

## Test Backlog

### P0: release confidence

- Run the two-user RLS suite in GitHub Actions on every release candidate, not only `main`.
- Add a browser end-to-end test for login, Letterboxd sync, questionnaire, recommendation, and
  accept/skip decision.
- Add a migration smoke test that starts from an empty database and verifies all migrations,
  functions, triggers, indexes, and RLS policies.
- Add an API contract test covering the recommendation session identifier from `/recommend` through
  `/recommend/decision`.

### P1: user workflows

- Test profile and history loading when the Google user changes.
- Test sync, unlink, and history deletion failures with visible recovery feedback.
- Test modal close/reopen while validation or sync is still running.
- Test concurrent sync requests and verify that the final watchlist is consistent.
- Test duplicate clicks on accept/skip and decision retry behavior.

### P2: accessibility and maintainability

- Add automated accessibility checks for keyboard navigation, focus trapping, labels,
  `aria-pressed`, and busy/dialog states.
- Add coverage thresholds to Vitest and pytest reporting.
- Publish test and coverage artifacts from GitHub Actions.
- Add database performance checks for foreign-key indexes and RLS query plans.

## Definition Of Done For V1

A release candidate is considered validated when:

1. `make verify` succeeds locally.
2. GitHub Actions passes lint, typecheck, tests, and build.
3. The Supabase integration job passes the two-user RLS tests.
4. No P0 item is open.
5. The migration list and deployed schema match the repository migrations.
6. The feature scope and remaining test gaps are updated in this document.
