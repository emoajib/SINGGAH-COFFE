#!/bin/bash
# backup-local.sh — Backup database + uploads di localhost (Docker Compose)
# Jalankan di project dir:  bash scripts/backup-local.sh
set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"
DB_NAME="singgah_pos"
UPLOADS_DIR="./backend/uploads"

mkdir -p "$BACKUP_DIR"

echo "=== Local backup started: $TIMESTAMP ==="

# 1. Dump database via Docker
echo "[1/2] Dumping database (docker exec)..."
docker exec singgah_mysql \
  mysqldump -u root -ppassword "$DB_NAME" \
  | gzip > "$BACKUP_DIR/db_local_${TIMESTAMP}.sql.gz"
echo "  ✅ DB: $(du -h "$BACKUP_DIR/db_local_${TIMESTAMP}.sql.gz" | cut -f1)"

# 2. Backup uploads
echo "[2/2] Backing up uploads..."
if [ -d "$UPLOADS_DIR" ]; then
  tar czf "$BACKUP_DIR/uploads_local_${TIMESTAMP}.tar.gz" -C "$UPLOADS_DIR" .
  echo "  ✅ Uploads: $(du -h "$BACKUP_DIR/uploads_local_${TIMESTAMP}.tar.gz" | cut -f1)"
else
  echo "  ⚠️  Uploads dir not found: $UPLOADS_DIR"
fi

# 3. Verify
echo "=== Backup files ==="
ls -lh "$BACKUP_DIR"/db_local_${TIMESTAMP}.sql.gz "$BACKUP_DIR"/uploads_local_${TIMESTAMP}.tar.gz 2>/dev/null

echo "=== ✅ Local backup complete ==="
