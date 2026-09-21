.PHONY: verify verify-backend verify-frontend build

build:
	docker compose build

verify: build verify-backend verify-frontend

verify-backend:
	docker compose run --rm backend pytest -q
	docker compose run --rm backend ruff check .
	docker compose run --rm backend pyright

verify-frontend:
	docker compose run --rm frontend pnpm lint
	docker compose run --rm frontend pnpm typecheck
	docker compose run --rm frontend pnpm test -- --run
	docker compose run --rm frontend pnpm build
