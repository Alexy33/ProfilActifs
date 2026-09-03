#!/bin/sh
set -e

DB_PATH="${DATABASE_URL#file:}"
DB_DIR="$(dirname "$DB_PATH")"

echo "[dev-entrypoint] base SQLite : ${DB_PATH}"

if [ ! -w "$DB_DIR" ]; then
  echo "[dev-entrypoint] ERREUR : ${DB_DIR} n'est pas accessible en ecriture." >&2
  echo "[dev-entrypoint] uid courant : $(id -u), proprietaire : $(stat -c '%u' "$DB_DIR")" >&2
  echo "[dev-entrypoint] Corrigez avec : docker compose down -v puis relancez." >&2
  exit 1
fi

echo "[dev-entrypoint] migrations Drizzle..."
npm run db:migrate

USERS="$(node -e "const D=require('better-sqlite3');try{const d=new D('$DB_PATH');console.log(d.prepare('select count(*) as c from user').get().c)}catch{console.log(0)}" 2>/dev/null || echo 0)"

if [ "$USERS" = "0" ]; then
  echo "[dev-entrypoint] base vide -> seed de demonstration..."
  npm run db:seed
else
  echo "[dev-entrypoint] base deja peuplee (${USERS} comptes) -> seed ignore."
fi

echo "[dev-entrypoint] demarrage : $*"
exec "$@"
