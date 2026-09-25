#!/usr/bin/env bash
# Push pending Supabase migrations to the PROD project, then lint its schema.
#
# The repo stays `supabase link`ed to the dev project on purpose (the
# pre-commit gate dry-runs against the linked project), so prod is reached
# through an explicit connection URL instead.
#
# The database password comes from supabase/.env.prod (SUPABASE_PROD_DB_PASSWORD,
# git-ignored, local machine only — never copied to the VPS, never in
# backend/.env.prod) when present, otherwise from a hidden prompt. Either way it
# stays out of the shell history and the process list.
set -euo pipefail

PROD_REF="aigangdpobaebazferpc"
POOLER_HOST="aws-1-eu-west-1.pooler.supabase.com"
PASSWORD_FILE="$(dirname "$0")/../supabase/.env.prod"

password=""
if [[ -f "$PASSWORD_FILE" ]]; then
  # shellcheck source=/dev/null
  source "$PASSWORD_FILE"
  password="${SUPABASE_PROD_DB_PASSWORD:-}"
fi
if [[ -z "$password" ]]; then
  read -rsp "Mot de passe de la base PROD ($PROD_REF) : " password
  echo
fi
if [[ -z "$password" ]]; then
  echo "Aucun mot de passe saisi, abandon." >&2
  exit 1
fi

# Percent-encode so any special character survives inside the URL. Piped from
# the printf builtin (no trailing newline, never in argv / the process list).
encoded=$(printf '%s' "$password" | python3 -c 'import sys, urllib.parse; print(urllib.parse.quote(sys.stdin.read(), safe=""), end="")')
db_url="postgresql://postgres.${PROD_REF}:${encoded}@${POOLER_HOST}:5432/postgres"

# `db push` lists the pending migrations and asks for confirmation itself.
supabase db push --db-url "$db_url"
supabase db lint --db-url "$db_url" --schema public --level error --fail-on error
