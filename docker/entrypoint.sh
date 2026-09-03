#!/bin/sh
set -e

case "${BETTER_AUTH_SECRET}" in
  ""|dev-only-secret-change-me-in-production|CHANGEZ_MOI*)
    echo "[entrypoint] ERREUR : BETTER_AUTH_SECRET absent ou laisse a la valeur de dev." >&2
    echo "[entrypoint] Generez-en un : openssl rand -base64 32, puis mettez-le dans .env" >&2
    exit 1
    ;;
esac

DB_PATH="${DATABASE_URL#file:}"
DB_DIR="$(dirname "$DB_PATH")"

echo "[entrypoint] ProfilsActifs - NODE_ENV=${NODE_ENV}"
echo "[entrypoint] base SQLite : ${DB_PATH}"

if [ ! -d "$DB_DIR" ]; then
  echo "[entrypoint] ERREUR : ${DB_DIR} n'existe pas (volume non monte ?)" >&2
  exit 1
fi

if [ ! -w "$DB_DIR" ]; then
  echo "[entrypoint] ERREUR : ${DB_DIR} n'est pas accessible en ecriture." >&2
  echo "[entrypoint] uid courant : $(id -u), proprietaire : $(stat -c '%u' "$DB_DIR")" >&2
  echo "[entrypoint] Corrigez avec : docker compose down -v puis relancez." >&2
  exit 1
fi

if [ ! -e "$DB_PATH" ] || [ "$(node -e "const D=require('better-sqlite3'); const d=new D('$DB_PATH'); console.log(d.prepare('select count(*) as count from user').get().count)" 2>/dev/null)" = "0" ]; then
  echo "[entrypoint] initialisation de la base de demonstration..."
  cp ./seed.db "$DB_PATH"
fi

if [ "${RUN_MIGRATIONS_ON_BOOT}" = "true" ] && [ -f "./scripts/migrate.mjs" ]; then
  echo "[entrypoint] execution des migrations Drizzle..."
  node ./scripts/migrate.mjs
fi

echo "[entrypoint] demarrage : $*"
exec "$@"
