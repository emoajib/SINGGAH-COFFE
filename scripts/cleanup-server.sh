#!/bin/bash
# ====================================================================
# cleanup-server.sh — Bersihkan artifact build/deploy stale di webhost
# Jalankan DI SERVER (sosb4282@sosiomen.com) via SSH, dari ~/singgah-pos
#
# USAGE:
#   bash scripts/cleanup-server.sh              # dry-run: tampilkan saja
#   bash scripts/cleanup-server.sh --force      # benar-benar hapus
#
# SAFETY — BERIKUT TIDAK PERNAH DISENTUH:
#   • backend/.env             (kredensial produksi)
#   • backend/.env.backup
#   • backend/singgah-backend  (binary yang sedang berjalan)
#   • backend/uploads/         (gambar produk/logo)
#   • public_html/             (frontend live + api-proxy.php)
#   • backups/                 (backup DB lokal)
#   • semua *.sql.gz/*.tar.gz di backups/
# ====================================================================
set -euo pipefail
shopt -s nullglob

PROJ_DIR="${PROJ_DIR:-$HOME/singgah-pos}"
FORCE=false
REMOVED=0
SKIPPED=0

# --- Parse args ---
usage() {
    echo "Usage: bash $0 [--force] [--help]"
    echo "  --force   benar-benar menghapus artifact (tanpa ini = dry-run)"
    echo "  --help    tampilkan bantuan ini"
}

for arg in "$@"; do
    case "$arg" in
        --force) FORCE=true ;;
        --help|-h) usage; exit 0 ;;
        *) echo "Argumen tidak dikenal: $arg (lihat --help)"; usage; exit 1 ;;
    esac
done

# --- Sanity checks ---
if [ ! -d "$PROJ_DIR/backend" ]; then
    echo "⚠️  $PROJ_DIR/backend tidak ditemukan."
    echo "   Script ini harus dijalankan di server. Atau set PROJ_DIR=/path/ke/singgah-pos"
    exit 1
fi

# --- Helpers ---
msg_remove() {
    local rel="$1"
    # Proteksi keras: jangan pernah hapus kredensial/binary jalan/uploads/web/backups
    if [[ "/$rel" =~ (^|/)(\.env|\.env\.backup|singgah-backend|uploads|public_html|backups)(/|$) ]]; then
        echo "  ⛔ SKIP     : $rel (dilindungi)"
        SKIPPED=$((SKIPPED+1))
        return
    fi
    if [ "$FORCE" = true ]; then
        rm -rf -- "$PROJ_DIR/$rel"
        echo "  🗑  REMOVED : $rel"
    else
        echo "  [dry-run]  : $rel"
    fi
    REMOVED=$((REMOVED+1))
}

try_remove() {
    local rel="$1"
    if [ -e "$PROJ_DIR/$rel" ] || [ -L "$PROJ_DIR/$rel" ]; then
        msg_remove "$rel"
    fi
}

try_remove_glob() {
    local rel f
    for f in "$PROJ_DIR"/$1; do
        [ -e "$f" ] || continue
        rel="${f#"$PROJ_DIR"/}"
        msg_remove "$rel"
    done
}

echo ""
if [ "$FORCE" = true ]; then
    echo "=== Cleanup mode: FORCE (menghapus) ==="
else
    echo "=== Cleanup mode: DRY-RUN (hanya tampil) ==="
fi
echo "=== Target dir : $PROJ_DIR ==="
echo ""

# --- A. Artifact di root repo ---
echo "--- A. Artifact di root repo ---"
try_remove "deploy.tar.gz"
try_remove "deploy"
try_remove "web-fixed.zip"
try_remove_glob "backup_before_cleanup_*.sql"

# --- B. Artifact backend/ ---
echo "--- B. Artifact di backend/ ---"
try_remove "backend/backend.pid"
try_remove "backend/main_linux_amd64"
try_remove "backend/cmd/server/main_linux_amd64"
try_remove "backend/go.mod.backup"
try_remove "backend/server"

# --- C. Artifact web-dashboard/ ---
echo "--- C. Artifact di web-dashboard/ ---"
try_remove "web-dashboard/web-dashboard.pid"
try_remove "web-dashboard/web-fixed.zip"

# --- D. Sisa file yang dihapus dari git (jaring pengaman utk server lama) ---
echo "--- D. Sisa file yang dihapus dari git (jaring pengaman utk server lama) ---"
try_remove "MODULE.bazel"
try_remove "start_everything.sh"
try_remove "deploy-manual-instructions.txt"
try_remove "cleanup_dummy_test_data.sql"
try_remove "insert_dummy_test_data.sql"
try_remove "database_cleanup.sql"

echo ""
echo "=== Selesai: ${REMOVED} path ditangani, ${SKIPPED} path dilindungi & dilewati. ==="
if [ "$FORCE" = false ]; then
    echo "ℹ️  Ini dry-run — jalankan ulang dengan --force untuk benar-benar menghapus."
fi