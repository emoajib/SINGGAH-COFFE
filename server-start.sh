#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# DEPRECATED — gunakan backend/start.sh. File ini dipertahankan hanya agar
# dokumentasi lama tidak lagi men-deploy versi tanpa hardening.
if [ -f "$SCRIPT_DIR/backend/.env" ]; then
    set -a
    # shellcheck disable=SC1091
    source "$SCRIPT_DIR/backend/.env"
    set +a
fi

export PORT="${PORT:-8080}"
export DATABASE_URL="${DATABASE_URL:?DATABASE_URL harus di-set di backend/.env}"
export JWT_SECRET="${JWT_SECRET:?JWT_SECRET harus di-set di backend/.env}"
export NODE_ENV="${NODE_ENV:-production}"

# Hardening shared hosting (wajib — sama dengan backend/start.sh).
export GOMAXPROCS=1
export GOMEMLIMIT=200MiB

cd "$SCRIPT_DIR/backend"
exec ./singgah-backend
