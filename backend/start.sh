#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Salin kredensial produksi TIDAK boleh di-commit ke git (repo ini publik).
# Nilai asli DATABASE_URL/JWT_SECRET disimpan di backend/.env (gitignored).
if [ -f "$SCRIPT_DIR/.env" ]; then
    set -a
    # shellcheck disable=SC1091
    source "$SCRIPT_DIR/.env"
    set +a
fi

export PORT="${PORT:-8080}"
export DATABASE_URL="${DATABASE_URL:?DATABASE_URL harus di-set di backend/.env}"
export JWT_SECRET="${JWT_SECRET:?JWT_SECRET harus di-set di backend/.env}"
export NODE_ENV="${NODE_ENV:-production}"

# Shared-hosting hardening: batasi jumlah OS thread & memori Go agar tidak
# melampaui ulimit -u server (mencegah crash "fatal error: newosproc").
export GOMAXPROCS=1
export GOMEMLIMIT=200MiB

cd "$SCRIPT_DIR"
# Binary is at backend/ relative to this script (deploy.sh places it there).
# Fall back to ./singgah-backend if script is inside the backend/ dir itself.
if [ -x "$SCRIPT_DIR/backend/singgah-backend" ]; then
    exec ./backend/singgah-backend
elif [ -x "$SCRIPT_DIR/singgah-backend" ]; then
    exec ./singgah-backend
else
    echo "ERROR: singgah-backend binary not found in $SCRIPT_DIR or $SCRIPT_DIR/backend/" >&2
    exit 1
fi
