.PHONY: verify verify-backend verify-frontend verify-db verify-commit verify-push install-hooks build

build:
	docker compose build

verify: build verify-backend verify-frontend

# Dry-run push is not enough on its own: a migration file renamed or edited
# after being applied remotely can still "succeed" as a no-op dry run,
# hiding drift between local files and the project's applied-migrations
# ledger. Fail explicitly unless the CLI reports nothing pending.
verify-db:
	@output=$$(supabase db push --linked --dry-run 2>&1); \
	echo "$$output"; \
	echo "$$output" | grep -q "up to date" || { \
		echo "Local migrations are not in sync with the linked Supabase project."; \
		echo "Run 'supabase migration list --linked' to inspect the drift."; \
		exit 1; \
	}
	supabase db lint --linked --schema public --level error --fail-on error

# Runs on every commit (.githooks/pre-commit): fast, local-only checks.
verify-commit:
	git diff --cached --check
	$(MAKE) verify-db

# Runs on every push (.githooks/pre-push): the full, slower suite —
# Docker build, backend + frontend tests/lint/typecheck/build. Kept out of
# verify-commit so day-to-day commits on develop stay fast.
verify-push: verify

install-hooks:
	git config core.hooksPath .githooks
	@echo "Git hooks enabled from .githooks"

verify-backend:
	docker compose run --rm backend pytest -q
	docker compose run --rm backend ruff check .
	docker compose run --rm backend pyright

verify-frontend:
	docker compose run --rm frontend pnpm lint
	docker compose run --rm frontend pnpm typecheck
	docker compose run --rm frontend pnpm test -- --run
	docker compose run --rm frontend pnpm build
