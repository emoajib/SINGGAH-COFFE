#!/usr/bin/env bash
# =============================================================================
#  Load Test Script — Singgah POS Backend API
#  (curl + parallel background processes — no k6 required)
# =============================================================================
#
# Usage:
#   ./load_test.sh                                          # uses defaults
#   BASE_URL=http://staging.example.com ./load_test.sh      # custom URL
#   CONCURRENCY=10 ./load_test.sh                           # 10 parallel reqs
#   ITERATIONS=20 ./load_test.sh                            # 20 iterations
#   EMAIL=x PASSWORD=y ./load_test.sh                       # custom credentials
#
# Adjust concurrency:  CONCURRENCY=5  (default)
# Adjust total hits:   ITERATIONS=10  (default)
#
# The backend rate-limiter allows 100 req/min burst per IP.
# Keep (CONCURRENCY × 3 endpoints × ITERATIONS) ≤ 80 to stay safe.
# =============================================================================

set -euo pipefail

# ── Configuration ────────────────────────────────────────────────────────────
BASE_URL="${BASE_URL:-http://localhost:8080/api}"
CONCURRENCY="${CONCURRENCY:-5}"
ITERATIONS="${ITERATIONS:-10}"

# Credentials — override via env vars
EMAIL="${EMAIL:-owner@singgah.com}"
PASSWORD="${PASSWORD:-password}"

# ── Colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Colour

# ── Counters (global, updated in subshells via temp files) ───────────────────
RESULTS_DIR=$(mktemp -d 2>/dev/null || mktemp -d -t 'loadtest')
trap 'rm -rf "$RESULTS_DIR"' EXIT

TOTAL_FILE="${RESULTS_DIR}/total"
SUCCESS_FILE="${RESULTS_DIR}/success"
FAIL_FILE="${RESULTS_DIR}/fail"
echo 0 > "$TOTAL_FILE"
echo 0 > "$SUCCESS_FILE"
echo 0 > "$FAIL_FILE"

# Per-endpoint timing accumulators (nanoseconds) and counters
TIMING_LOGIN="${RESULTS_DIR}/timing_login"
TIMING_DASHBOARD="${RESULTS_DIR}/timing_dashboard"
TIMING_REPORT="${RESULTS_DIR}/timing_report"
COUNT_LOGIN="${RESULTS_DIR}/count_login"
COUNT_DASHBOARD="${RESULTS_DIR}/count_dashboard"
COUNT_REPORT="${RESULTS_DIR}/count_report"

echo 0 > "$TIMING_LOGIN"
echo 0 > "$TIMING_DASHBOARD"
echo 0 > "$TIMING_REPORT"
echo 0 > "$COUNT_LOGIN"
echo 0 > "$COUNT_DASHBOARD"
echo 0 > "$COUNT_REPORT"

# Semaphore for file-locking (atomic append is enough with simple ops, but
# we use a tiny lockfile to avoid races on the multi-line increment sequence)
LOCK_DIR="${RESULTS_DIR}/locks"
mkdir -p "$LOCK_DIR"

lock() {
    local name="$1"
    local lockfile="${LOCK_DIR}/${name}"
    while ! ln "$lockfile" "$lockfile.locked" 2>/dev/null; do
        : # spin
    done
}

unlock() {
    local name="$1"
    rm -f "${LOCK_DIR}/${name}.locked"
}

# ── Helpers ──────────────────────────────────────────────────────────────────
now_ns() {
    # macOS & Linux compatible nanosecond timestamp
    perl -MTime::HiRes=time -e 'printf "%.0f\n", time() * 1_000_000_000' 2>/dev/null || \
    python3 -c 'import time; print(int(time.time() * 1_000_000_000))' 2>/dev/null || \
    date +%s%N
}

log_info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error() { echo -e "${RED}[FAIL]${NC}  $*"; }

# Extract JSON value (uses jq if available, falls back to grep/sed)
extract_json() {
    local key="$1"
    if command -v jq &>/dev/null; then
        jq -r "$key" 2>/dev/null || echo ""
    else
        # fragile but functional fallback
        grep -o "\"${key}\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" | \
            sed "s/.*\"${key}\"[[:space:]]*:[[:space:]]*\"//;s/\"//"
    fi
}

# ── Scenarios ────────────────────────────────────────────────────────────────

# Scenario 1: login — extract JWT token
do_login() {
    local start end duration response token http_code

    start=$(now_ns)
    response=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}" 2>/dev/null) || {
        log_error "Login — curl failed"
        return 1
    }
    end=$(now_ns)
    duration=$(( end - start ))

    http_code=$(echo "$response" | tail -1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" -ne 200 ]; then
        log_error "Login — HTTP ${http_code}: $(echo "$body" | head -c 120)"
        return 1
    fi

    # Extract token — try jq first, then grep fallback
    if command -v jq &>/dev/null; then
        token=$(echo "$body" | jq -r '.token // empty')
    else
        token=$(echo "$body" | grep -o '"token"[[:space:]]*:[[:space:]]*"[^"]*"' | \
                sed 's/.*"token"[[:space:]]*:[[:space:]]*"//;s/".*//')
    fi

    if [ -z "$token" ] || [ "$token" = "null" ]; then
        log_error "Login — no token in response: $(echo "$body" | head -c 120)"
        return 1
    fi

    log_ok "Login — 200 (token: ${token:0:20}...)"

    # Accumulate timing
    lock login_timing
    local t
    t=$(cat "$TIMING_LOGIN")
    echo "$(( t + duration ))" > "$TIMING_LOGIN"
    t=$(cat "$COUNT_LOGIN")
    echo "$(( t + 1 ))" > "$COUNT_LOGIN"
    unlock login_timing

    echo "$token"
    return 0
}

# Scenario 2: dashboard summary
do_dashboard() {
    local token=$1 start end duration response http_code

    start=$(now_ns)
    response=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}/dashboard/summary" \
        -H "Authorization: Bearer ${token}" 2>/dev/null) || {
        log_error "Dashboard — curl failed"
        return 1
    }
    end=$(now_ns)
    duration=$(( end - start ))

    http_code=$(echo "$response" | tail -1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" -ne 200 ]; then
        log_error "Dashboard — HTTP ${http_code}: $(echo "$body" | head -c 120)"
        return 1
    fi

    log_ok "Dashboard — ${http_code}"

    lock dashboard_timing
    local t
    t=$(cat "$TIMING_DASHBOARD")
    echo "$(( t + duration ))" > "$TIMING_DASHBOARD"
    t=$(cat "$COUNT_DASHBOARD")
    echo "$(( t + 1 ))" > "$COUNT_DASHBOARD"
    unlock dashboard_timing

    return 0
}

# Scenario 3: profit-loss report
do_report() {
    local token=$1 start end duration response http_code

    # Use current month as default date range
    local start_date end_date
    start_date=$(date +%Y-%m)-01
    end_date=$(date +%Y-%m-%d)

    start=$(now_ns)
    response=$(curl -s -w "\n%{http_code}" -X GET \
        "${BASE_URL}/reports/profit-loss?start=${start_date}&end=${end_date}" \
        -H "Authorization: Bearer ${token}" 2>/dev/null) || {
        log_error "Report PL — curl failed"
        return 1
    }
    end=$(now_ns)
    duration=$(( end - start ))

    http_code=$(echo "$response" | tail -1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" -ne 200 ]; then
        log_error "Report PL — HTTP ${http_code}: $(echo "$body" | head -c 120)"
        return 1
    fi

    log_ok "Report PL — ${http_code}"

    lock report_timing
    local t
    t=$(cat "$TIMING_REPORT")
    echo "$(( t + duration ))" > "$TIMING_REPORT"
    t=$(cat "$COUNT_REPORT")
    echo "$(( t + 1 ))" > "$COUNT_REPORT"
    unlock report_timing

    return 0
}

# ── Single iteration: login → dashboard + report (sequential per worker) ─────
run_iteration() {
    local token

    # 1) Login
    token=$(do_login) || {
        # login failed, counters already decremented? no — do_login errors
        # but we need to bump total/fail manually since do_login doesn't
        lock global
        local t f
        t=$(cat "$TOTAL_FILE"); echo "$(( t + 1 ))" > "$TOTAL_FILE"
        f=$(cat "$FAIL_FILE");  echo "$(( f + 1 ))" > "$FAIL_FILE"
        unlock global
        return 1
    }

    lock global
    local t s
    t=$(cat "$TOTAL_FILE"); echo "$(( t + 1 ))" > "$TOTAL_FILE"
    s=$(cat "$SUCCESS_FILE"); echo "$(( s + 1 ))" > "$SUCCESS_FILE"
    unlock global

    # 2) Dashboard
    if do_dashboard "$token"; then
        lock global
        t=$(cat "$TOTAL_FILE"); echo "$(( t + 1 ))" > "$TOTAL_FILE"
        s=$(cat "$SUCCESS_FILE"); echo "$(( s + 1 ))" > "$SUCCESS_FILE"
        unlock global
    else
        lock global
        t=$(cat "$TOTAL_FILE"); echo "$(( t + 1 ))" > "$TOTAL_FILE"
        f=$(cat "$FAIL_FILE");  echo "$(( f + 1 ))" > "$FAIL_FILE"
        unlock global
    fi

    # 3) Report
    if do_report "$token"; then
        lock global
        t=$(cat "$TOTAL_FILE"); echo "$(( t + 1 ))" > "$TOTAL_FILE"
        s=$(cat "$SUCCESS_FILE"); echo "$(( s + 1 ))" > "$SUCCESS_FILE"
        unlock global
    else
        lock global
        t=$(cat "$TOTAL_FILE"); echo "$(( t + 1 ))" > "$TOTAL_FILE"
        f=$(cat "$FAIL_FILE");  echo "$(( f + 1 ))" > "$FAIL_FILE"
        unlock global
    fi
}

# ── Summary ──────────────────────────────────────────────────────────────────
print_summary() {
    echo ""
    echo -e "${BOLD}══════════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}  LOAD TEST SUMMARY${NC}"
    echo -e "${BOLD}══════════════════════════════════════════════════════════${NC}"
    echo -e "  Base URL:       ${CYAN}${BASE_URL}${NC}"
    echo -e "  Concurrency:    ${CONCURRENCY}"
    echo -e "  Iterations:     ${ITERATIONS}"
    echo ""

    local total successes failures
    total=$(cat "$TOTAL_FILE")
    successes=$(cat "$SUCCESS_FILE")
    failures=$(cat "$FAIL_FILE")

    echo -e "  ${BOLD}Total requests:${NC}  ${total}"
    echo -e "  ${GREEN}Success:${NC}         ${successes}  ($(awk "BEGIN {printf \"%.1f\", ${successes}/${total}*100}" 2>/dev/null || echo "N/A")%)"
    echo -e "  ${RED}Failed:${NC}          ${failures}  ($(awk "BEGIN {printf \"%.1f\", ${failures}/${total}*100}" 2>/dev/null || echo "N/A")%)"
    echo ""

    # Per-endpoint timing
    local cl dl rl cc dc rc avg_login avg_dash avg_report
    cl=$(cat "$COUNT_LOGIN")
    dl=$(cat "$TIMING_LOGIN")
    rl=$(cat "$TIMING_REPORT")
    cc=$(cat "$COUNT_DASHBOARD")
    dc=$(cat "$TIMING_DASHBOARD")
    rc=$(cat "$COUNT_REPORT")

    avg_login="N/A"; avg_dash="N/A"; avg_report="N/A"
    [ "$cl" -gt 0 ] && avg_login=$(awk "BEGIN {printf \"%.0f\", ${dl}/${cl}/1000000}")
    [ "$cc" -gt 0 ] && avg_dash=$(awk "BEGIN {printf \"%.0f\", ${dc}/${cc}/1000000}")
    [ "$rc" -gt 0 ] && avg_report=$(awk "BEGIN {printf \"%.0f\", ${rl}/${rc}/1000000}")

    printf "  %-20s %8s  %12s\n" "Endpoint" "Requests" "Avg Time"
    printf "  %-20s %8s  %12s\n" "--------------------" "--------" "------------"
    printf "  %-20s %8d  %10s ms\n" "POST /auth/login"     "$cl" "$avg_login"
    printf "  %-20s %8d  %10s ms\n" "GET /dashboard/summary" "$cc" "$avg_dash"
    printf "  %-20s %8d  %10s ms\n" "GET /reports/profit-loss" "$rc" "$avg_report"
    echo ""
    echo -e "  ${YELLOW}Note:${NC} The API rate-limiter allows 100 req/min burst."
    echo -e "  If failures spike, you've hit the rate limit."
    echo -e "${BOLD}══════════════════════════════════════════════════════════${NC}"
    echo ""
}

# ── Main ─────────────────────────────────────────────────────────────────────
main() {
    echo ""
    echo -e "${BOLD}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}║   Singgah POS — Load Test                              ║${NC}"
    echo -e "${BOLD}╚══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    log_info "Starting load test..."
    log_info "  Base URL:    ${BASE_URL}"
    log_info "  Concurrency: ${CONCURRENCY}"
    log_info "  Iterations:  ${ITERATIONS}"
    log_info "  Credentials: ${EMAIL} / ********"
    echo ""

    # Pre-flight check
    if ! curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/auth/login" \
        -X POST -H "Content-Type: application/json" \
        -d "{\"email\":\"test\",\"password\":\"test\"}" \
        --connect-timeout 5 --max-time 10 2>/dev/null; then
        log_warn "Server at ${BASE_URL} may not be reachable. Continuing anyway..."
        echo ""
    else
        log_info "Server is reachable at ${BASE_URL}"
        echo ""
    fi

    local iter=0
    while [ "$iter" -lt "$ITERATIONS" ]; do
        local batch_start batch_end batch_duration
        batch_start=$(now_ns)

        # Fire up to CONCURRENCY parallel workers
        local pids=()
        local i=0
        while [ "$i" -lt "$CONCURRENCY" ] && [ "$iter" -lt "$ITERATIONS" ]; do
            run_iteration &
            pids+=($!)
            i=$(( i + 1 ))
            iter=$(( iter + 1 ))
        done

        # Wait for all workers in this batch
        for pid in "${pids[@]}"; do
            wait "$pid" 2>/dev/null || true
        done

        batch_end=$(now_ns)
        batch_duration=$(( (batch_end - batch_start) / 1000000 ))  # ms

        log_info "Batch complete — batch ${iter}/${ITERATIONS} (${batch_duration}ms)"
    done

    print_summary
}

main "$@"
