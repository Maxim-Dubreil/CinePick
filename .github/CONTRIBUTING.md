# Contributing to CinePick

CinePick is not open source (see [LICENSE](../LICENSE)), but contributions are welcome. By
submitting a pull request, you agree that your contribution may be integrated into the project
and distributed under the same terms, with all rights granted to the copyright holder.

For anything beyond a small fix, open an issue first to discuss the change.

## Setup

Follow the [Local setup](../README.md#local-setup) section of the README.

## Workflow

- `develop` is the default branch; `main` is the protected production branch (merges only).
- Fork the repository, create a branch from `develop`, and open your pull request against
  `develop`.

## Local validation

To enable the repository git hooks once on a new clone:

```sh
make install-hooks
```

Two gates, different speed:

- **pre-commit** (`make verify-commit`): whitespace check on the staged diff + `make verify-db`
  (Supabase migrations dry-run pushed against the linked project, schema lint — fails if local and
  remote migration history don't match). Fast, runs on every commit.
- **pre-push** (`make verify-push`, i.e. `make verify`): rebuilds the Docker images, then runs
  backend and frontend tests, linting, type checking, and the production frontend build. Slower,
  runs once per push.

Run either target manually at any time with `make verify-commit` / `make verify-push`.

## Commits

```sh
type: [CIN-XX] description
```

`CIN-XX` is the internal ticket reference; external contributors can omit it or reference the
GitHub issue instead (`type: #12 description`).

| Type    | Usage                        |
| ------- | ---------------------------- |
| `feat`  | New feature                  |
| `fix`   | Bug fix                      |
| `chore` | Config, setup, refactor      |
| `docs`  | Documentation                |
| `test`  | Add or update tests          |
| `style` | Formatting, no logic changes |

## Code of conduct

This project follows the [Code of Conduct](CODE_OF_CONDUCT.md).
