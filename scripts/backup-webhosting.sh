#!/bin/bash
# backup-webhosting.sh — Backup database + uploads di server webhosting
# Jalankan di terminal hosting:  bash ~/singgah-pos/scripts/backup-webhosting.sh
set -euo pipefail

BACKUP_DIR="$HOME/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="sosb4282_singgah_pos"
DB_USER="sosb4282_singgah_pos"
DB_PASS="b1nt@nG9"
UPLOADS_DIR="$HOME/singgah-pos/backend/uploads"

mkdir -p "$BACKUP_DIR"

echo "=== Backup started: $TIMESTAMP ==="

# 1. Dump database
echo "[1/2] Dumping database..."
mysqldump -u "$DB_USER" -p"$DB_PASS" -h localhost "$DB_NAME" \
  | gzip > "$BACKUP_DIR/db_${TIMESTAMP}.sql.gz"
echo "  ✅ DB: $(du -h "$BACKUP_DIR/db_${TIMESTAMP}.sql.gz" | cut -f1)"

# 2. Backup uploads
echo "[2/2] Backing up uploads..."
if [ -d "$UPLOADS_DIR" ]; then
  tar czf "$BACKUP_DIR/uploads_${TIMESTAMP}.tar.gz" -C "$UPLOADS_DIR" .
  echo "  ✅ Uploads: $(du -h "$BACKUP_DIR/uploads_${TIMESTAMP}.tar.gz" | cut -f1)"
else
  echo "  ⚠️  Uploads dir not found: $UPLOADS_DIR"
fi

# 3. Rotation (keep last 5)
echo "=== Clean old backups (keep 5) ==="
ls -t "$BACKUP_DIR"/db_*.sql.gz 2>/dev/null | tail -n +6 | xargs rm -f
ls -t "$BACKUP_DIR"/uploads_*.tar.gz 2>/dev/null | tail -n +6 | xargs rm -f

# 4. Verify
echo "=== Backup files ==="
ls -lh "$BACKUP_DIR"/db_${TIMESTAMP}.sql.gz "$BACKUP_DIR"/uploads_${TIMESTAMP}.tar.gz 2>/dev/null

echo "=== ✅ Backup complete ==="
