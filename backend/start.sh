#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
export PORT=8080
export DATABASE_URL="sosb4282_singgah_pos:b1nt@nG9@tcp(localhost:3306)/sosb4282_singgah_pos?charset=utf8mb4&parseTime=True&loc=Local"
export JWT_SECRET="sg7#pL8*RnY4&xWzB3!cFjT1@hN6eAd5"
export NODE_ENV=production
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
