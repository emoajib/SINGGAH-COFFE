#!/usr/bin/env bash
# Blue/Green deploy helper for shared hosting (OPS-02).
# Run on server: bash blue-green-deploy.sh <path-to-deploy.tar.gz>
set -euo pipefail

BASE_DIR="${BASE_DIR:-/home/sosb4282/singgah-pos}"
ARCHIVE="${1:-$BASE_DIR/deploy.tar.gz}"

cd "$BASE_DIR"
mkdir -p blue green

CURRENT=$(readlink current 2>/dev/null || echo blue)
if [ "$CURRENT" = "blue" ]; then TARGET="green"; else TARGET="blue"; fi
echo "Current: $CURRENT -> Target: $TARGET"

rm -rf "$TARGET.old"
mv "$TARGET" "$TARGET.old" 2>/dev/null || true
mkdir -p "$TARGET"

tar -xzf "$ARCHIVE" -C "$TARGET"

ln -sfn "$TARGET" current_new
mv -Tf current_new current

echo "Swapped to $TARGET. Restart backend via start.sh"
echo "Rollback: ln -sfn $CURRENT current && ./start.sh"
