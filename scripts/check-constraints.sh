#!/usr/bin/env bash
# Guard mekanis: pastikan constraint shared hosting tidak diregresi.
# Dipanggil oleh CI (test.yml, main.yml) dan manual sebelum deploy.
# Exit non-zero = constraint hilang → build/release HARUS gagal.
set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FAIL=0

p() { printf '%s\n' "$@"; }
check() { # check <desc> <command...>
  if eval "$2"; then
    p "  [PASS] $1"
  else
    p "  [FAIL] $1"
    FAIL=1
  fi
}

p "== Shared Hosting Constraint Guard =="

p "-- DB connection pool (database.go) --"
check "SetMaxOpenConns(10)"      "grep -q 'SetMaxOpenConns(10)'             '$ROOT/backend/internal/database/database.go'"
check "SetMaxIdleConns(2)"       "grep -q 'SetMaxIdleConns(2)'              '$ROOT/backend/internal/database/database.go'"
check "SetConnMaxLifetime(5min)" "grep -q 'SetConnMaxLifetime(5 \\* time.Minute)' '$ROOT/backend/internal/database/database.go'"

p "-- start.sh hardening --"
check "GOMAXPROCS=1 in start.sh"    "grep -q 'GOMAXPROCS=1'     '$ROOT/backend/start.sh'"
check "GOMEMLIMIT=200MiB in start.sh" "grep -q 'GOMEMLIMIT=200MiB' '$ROOT/backend/start.sh'"

p "-- api-proxy.php multipart forwarding --"
check "CURLOPT_POSTFIELDS in api-proxy.php" "grep -q 'CURLOPT_POSTFIELDS' '$ROOT/api-proxy.php'"
if command -v php >/dev/null 2>&1; then
  check "php -l api-proxy.php" "php -l '$ROOT/api-proxy.php' >/dev/null 2>&1"
else
  p "  [SKIP] php CLI tidak tersedia (php -l dilompati)"
fi

p "-- Larangan raw DB connection di luar pool --"
if rg -n 'gorm\.Open|sql\.Open' "$ROOT/backend" --glob '*.go' \
     -g '!internal/database/database.go' -g '!**/*_test.go' >/dev/null 2>&1; then
  p "  [FAIL] ditemukan gorm.Open/sql.Open di luar database.go (selain _test.go):"
  rg -n 'gorm\.Open|sql\.Open' "$ROOT/backend" --glob '*.go' -g '!internal/database/database.go' -g '!**/*_test.go'
  FAIL=1
else
  p "  [PASS] tidak ada koneksi DB liar di kode produksi"
fi

p "-- Larangan kredensial produksi di repo (secret scan) --"
# Literal nyata = value langsung, bukan placeholder \${VAR:?} atau kosong.
if grep -rnE 'DATABASE_URL="[a-z]|DATABASE_URL="[A-Za-z0-9%]|JWT_SECRET="[^$]' \
    "$ROOT/backend/start.sh" "$ROOT/server-start.sh" >/dev/null 2>&1; then
  p "  [FAIL] kredensial literal ditemukan di start.sh (ganti dengan \${VAR} + .env)"
  grep -rnE 'DATABASE_URL="[a-z]|DATABASE_URL="[A-Za-z0-9%]|JWT_SECRET="[^$]' "$ROOT/backend/start.sh" "$ROOT/server-start.sh" || true
  FAIL=1
else
  p "  [PASS] tidak ada kredensial literal di start.sh"
fi

p "-- Larangan DB_PASS literal di scripts/ --"
if grep -rnE '^DB_PASS="[^$]' "$ROOT/scripts" 2>/dev/null | grep -v check-constraints >/dev/null 2>&1; then
  p "  [FAIL] DB_PASS literal ditemukan di scripts/ (ambil dari .env)"
  grep -rnE '^DB_PASS="[^$]' "$ROOT/scripts" 2>/dev/null | grep -v check-constraints || true
  FAIL=1
else
  p "  [PASS] tidak ada DB_PASS literal di scripts/"
fi

p "-- deploy.tar.gz tidak boleh di-commit (artifact stale + bocor secret) --"
if git -C "$ROOT" ls-files --error-unmatch deploy.tar.gz >/dev/null 2>&1; then
  p "  [FAIL] deploy.tar.gz masih tracked di git — hapus dengan 'git rm --cached deploy.tar.gz'"
  FAIL=1
else
  p "  [PASS] deploy.tar.gz tidak tracked"
fi

p ""
if [ "$FAIL" -ne 0 ]; then
  p "RESULT: GAGAL — constraint shared hosting diregresi. JANGAN deploy."
  exit 1
else
  p "RESULT: OK — semua constraint shared hosting utuh."
fi