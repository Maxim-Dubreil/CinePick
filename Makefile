.PHONY: verify verify-backend verify-frontend verify-db verify-commit install-hooks build

build:
	docker compose build

verify: build verify-backend verify-frontend

verify-db:
	supabase db push --linked --dry-run
	supabase db lint --linked --schema public --level error --fail-on error

verify-commit:
	git diff --cached --check
	$(MAKE) verify-db

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
