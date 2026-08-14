#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# --- Robust .env loader -------------------------------------------------
# Do NOT `source "$SCRIPT_DIR/.env"`: the MySQL DSN contains shell
# metacharacters (@ $ ( ) & ? =) that make `source` abort with a syntax
# error, leaving DATABASE_URL/JWT_SECRET unset and crashing start-up.
# Parse KEY=value lines line-by-line so special characters are safe.
load_env_file() {
  [ -f "$SCRIPT_DIR/.env" ] || return 0
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
  done < "$SCRIPT_DIR/.env"
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
  exec "./singgah-backend"
else
  echo "ERROR: singgah-backend binary not found in $SCRIPT_DIR" >&2
  exit 1
fi
