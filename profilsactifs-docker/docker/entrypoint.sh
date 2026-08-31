#!/bin/sh
# ---------------------------------------------------------------------------
# Entrypoint : verifications avant de passer la main au serveur Next.js.
# `set -e` : toute commande en echec arrete le conteneur immediatement plutot
# que de laisser demarrer une app a moitie cassee.
# ---------------------------------------------------------------------------
set -e

DB_PATH="${DATABASE_URL#file:}"
DB_DIR="$(dirname "$DB_PATH")"

echo "[entrypoint] ProfilsActifs - NODE_ENV=${NODE_ENV}"
echo "[entrypoint] base SQLite : ${DB_PATH}"

# Le volume est-il bien monte et accessible en ecriture par l'utilisateur
# nextjs (uid 1001) ? C'est l'erreur numero un en Docker + SQLite.
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

# Les migrations Drizzle sont jouees par instrumentation.ts au demarrage du
# serveur (elles font partie du bundle trace par Next.js standalone).
# On les lance ici uniquement si un script dedie existe (cas non-standalone).
if [ "${RUN_MIGRATIONS_ON_BOOT}" = "true" ] && [ -f "./scripts/migrate.mjs" ]; then
  echo "[entrypoint] execution des migrations Drizzle..."
  node ./scripts/migrate.mjs
fi

# `exec` remplace le shell par le processus Node : PID 1 devient le serveur,
# donc SIGTERM lui parvient directement et l'arret est propre (pas de 10s
# d'attente avant SIGKILL).
echo "[entrypoint] demarrage : $*"
exec "$@"
