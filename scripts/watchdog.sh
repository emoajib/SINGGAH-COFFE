#!/usr/bin/env bash
# Vetted by AI - Manual Review Required by Senior Engineer/Manager
# ==============================================================================
# Singgah POS Watchdog - Automated Process Monitor & Auto-Recovery
# Dipanggil via cPanel Cron Job setiap 5 atau 10 menit:
# */5 * * * * /bin/bash /home/sosb4282/singgah-pos/scripts/watchdog.sh >/dev/null 2>&1
# ==============================================================================
set -u

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJ_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_FILE="$PROJ_DIR/logs/watchdog.log"
PORT="8080"

mkdir -p "$PROJ_DIR/logs"

# 1. Cek endpoint lokal health
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORT}/health" 2>/dev/null || echo "000")

if [ "$HEALTH" = "200" ]; then
    # Backend sehat, tidak ada tindakan yang diperlukan
    exit 0
fi

# 2. Jika health bukan 200, catat insiden dan lakukan recovery
echo "[$(date '+%Y-%m-%d %H:%M:%S')] [WARN] Backend unhealth/down (HTTP $HEALTH). Memulai auto-recovery..." >> "$LOG_FILE"

cd "$PROJ_DIR"

# Matikan proses yang mungkin hang / zombie
for f in "$PROJ_DIR/backend/backend.pid" "$PROJ_DIR/backend.pid"; do
    if [ -f "$f" ]; then
        OLD_PID=$(cat "$f" 2>/dev/null || true)
        [ -n "$OLD_PID" ] && kill -9 "$OLD_PID" 2>/dev/null || true
        rm -f "$f"
    fi
done

# Jalankan backend via start.sh
if [ -f "$PROJ_DIR/start.sh" ]; then
    chmod +x "$PROJ_DIR/start.sh" 2>/dev/null || true
    setsid nohup ./start.sh >> "$PROJ_DIR/logs/backend.log" 2>&1 &
    disown 2>/dev/null || true
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [INFO] Backend restarted via start.sh (PID: $!)" >> "$LOG_FILE"
elif [ -f "$PROJ_DIR/backend/start.sh" ]; then
    chmod +x "$PROJ_DIR/backend/start.sh" 2>/dev/null || true
    setsid nohup ./backend/start.sh >> "$PROJ_DIR/logs/backend.log" 2>&1 &
    disown 2>/dev/null || true
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [INFO] Backend restarted via backend/start.sh (PID: $!)" >> "$LOG_FILE"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] start.sh tidak ditemukan!" >> "$LOG_FILE"
    exit 1
fi

sleep 3
NEW_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORT}/health" 2>/dev/null || echo "000")
echo "[$(date '+%Y-%m-%d %H:%M:%S')] [INFO] Auto-recovery selesai, status baru: HTTP $NEW_HEALTH" >> "$LOG_FILE"
