#!/bin/bash
# cron-backup-webhosting.sh — Setup daily cron backup di webhosting server
# Jalankan sekali:  bash ~/singgah-pos/scripts/cron-backup-webhosting.sh
set -e

CRON_CMD="0 2 * * * $HOME/singgah-pos/scripts/backup-webhosting.sh >> $HOME/singgah-pos/logs/backup-cron.log 2>&1"

# Check if already in crontab
if crontab -l 2>/dev/null | grep -q "backup-webhosting.sh"; then
  echo "✅ Cron job sudah terpasang."
  echo "Current crontab entry:"
  crontab -l | grep "backup-webhosting.sh"
  exit 0
fi

# Add to crontab
(crontab -l 2>/dev/null; echo "$CRON_CMD") | crontab -
echo "✅ Cron backup harian terpasang: $CRON_CMD"
echo "Backup akan berjalan setiap hari jam 02:00 server time"
