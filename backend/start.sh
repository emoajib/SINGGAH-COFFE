#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# --- Robust .env loader -------------------------------------------------
# Do NOT `source "$SCRIPT_DIR/.env"`: the MySQL DSN contains shell
# metacharacters (@ $ ( ) & ? =) that make `source` abort with a syntax
# error, leaving DATABASE_URL/JWT_SECRET unset and crashing start-up.
# Parse KEY=value lines line-by-line so special characters are safe.
# Check both root and backend/ subfolder for .env
load_env_file() {
  if [ -f "$SCRIPT_DIR/.env" ]; then
    ENV_PATH="$SCRIPT_DIR/.env"
  elif [ -f "$SCRIPT_DIR/backend/.env" ]; then
    ENV_PATH="$SCRIPT_DIR/backend/.env"
  else
    return 0
  fi
  set -a
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in ''|\#*) continue ;; esac
    case "$line" in *=*) : ;; *) continue ;; esac
    name="${line%%=*}"
    value="${line#*=}"
    case "$value" in
      \"*\") value="${value#\"}"; value="${value%\"}" ;;
      \'*\') value="${value#\'}"; value="${value%\'}" ;;
    esac
    [ -n "$name" ] && export "$name=${value}" 2>/dev/null || true
  done < "$ENV_PATH"
  set +a
}
load_env_file

export PORT="${PORT:-8080}"
: "${DATABASE_URL:?DATABASE_URL harus di-set di backend/.env}"
: "${JWT_SECRET:?JWT_SECRET harus di-set di backend/.env}"
export NODE_ENV="${NODE_ENV:-production}"

# Shared-hosting hardening: cap OS threads & memory to avoid the
# "fatal error: newosproc" crash under low ulimit -u (shared hosting).
export GOMAXPROCS=1
export GOMEMLIMIT=200MiB

cd "$SCRIPT_DIR"
if [ -x "$SCRIPT_DIR/singgah-backend" ]; then
  exec "$SCRIPT_DIR/singgah-backend"
elif [ -x "$SCRIPT_DIR/backend/singgah-backend" ]; then
  exec "$SCRIPT_DIR/backend/singgah-backend"
else
  echo "ERROR: singgah-backend binary not found in $SCRIPT_DIR or $SCRIPT_DIR/backend" >&2
  exit 1
fi
