# Load Test — Singgah POS Backend API

Heavy-duty bash-based load testing script that hits the Singgah POS API with
parallel `curl` requests. No external dependencies (no k6, no Node.js, no
Python required beyond what macOS/Linux ships).

---

## Quick Start

```bash
# Make sure the backend is running first
cd backend && go run cmd/server/main.go &

# In another terminal:
cd loadtest
chmod +x load_test.sh
./load_test.sh
```

That runs the default: 5 parallel workers × 10 iterations = 50 requests across
3 endpoints (150 total hits).

---

## Test Scenarios

| # | Endpoint | Method | What It Tests |
|---|----------|--------|---------------|
| 1 | `/api/auth/login` | POST | Login with valid email/password, extract JWT token |
| 2 | `/api/dashboard/summary` | GET | Authenticated fetch of dashboard metrics |
| 3 | `/api/reports/profit-loss` | GET | Authenticated fetch of profit-loss report with date params |

Each **iteration** runs one worker through all 3 scenarios sequentially (login
→ dashboard → report). The workers run **in parallel** up to `CONCURRENCY`
workers at a time.

The login response returns `{"token": "..."}` which is extracted and reused for
the subsequent authenticated requests within that worker.

---

## Configuration

All configuration is via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `http://localhost:8080/api` | API base URL (no trailing slash) |
| `CONCURRENCY` | `5` | Number of parallel worker processes |
| `ITERATIONS` | `10` | Total iterations (each = 3 requests) |
| `EMAIL` | `owner@singgah.com` | Login email |
| `PASSWORD` | `password` | Login password |

### Examples

```bash
# Hit a staging server with 10 parallel requests, 20 iterations
BASE_URL=https://staging.singgah.com/api CONCURRENCY=10 ITERATIONS=20 ./load_test.sh

# Test with custom credentials
EMAIL=admin@example.com PASSWORD=supersecret ./load_test.sh

# Light smoke test (2 parallel, 3 iterations)
CONCURRENCY=2 ITERATIONS=3 ./load_test.sh
```

---

## Understanding the Results

The script prints:

- **Total requests**: `CONCURRENCY × ITERATIONS × 3` (3 endpoints per worker)
- **Success / Failure counts**: HTTP 200 = success, anything else = failure
- **Average response time**: per-endpoint average in milliseconds

### Sample output

```
══════════════════════════════════════════════════════════
  LOAD TEST SUMMARY
══════════════════════════════════════════════════════════
  Base URL:       http://localhost:8080/api
  Concurrency:    5
  Iterations:     10

  Total requests:  150
  Success:         150  (100.0%)
  Failed:          0    (0.0%)

  Endpoint                  Requests   Avg Time
  --------------------      --------   ------------
  POST /auth/login               50        245 ms
  GET /dashboard/summary         50        180 ms
  GET /reports/profit-loss       50        312 ms
```

---

## Rate Limiter Behaviour

The backend uses a **token-bucket rate limiter** configured at:

```
rate.NewLimiter(rate.Every(time.Minute), 100)
```

- **Burst capacity**: 100 requests (can fire 100 immediately)
- **Sustained rate**: ~1.67 req/second (100 per minute refill)

### What this means for load testing

| Concurrency | Iterations | Total Hits | Hits/min | Rate Limited? |
|------------|------------|------------|----------|---------------|
| 1 | 10 | 30 | 30 | No |
| 5 | 10 | 150 | 150 | **Yes** — burst exceeded |
| 5 | 5 | 75 | 75 | No |
| 10 | 3 | 90 | 90 | No (borderline) |
| 10 | 5 | 300 | 300 | **Yes** — heavily limited |

If you see a spike in failures with HTTP 429 (`Rate limit exceeded`), you have
hit the rate limiter. Solutions:

1. **Reduce** `CONCURRENCY` or `ITERATIONS` so total hits ≤ 80
2. **Skip the rate limiter** — temporarily comment out the rate limiter
   middleware in `backend/internal/routes/routes.go` line 32:
   ```go
   // protected.Use(middleware.APIRateLimiter())   // ← comment this line
   ```
3. **Increase the limit** — change the rate limiter config in
   `backend/internal/delivery/middleware/rate_limiter.go`:
   ```go
   rate.NewLimiter(rate.Every(time.Second), 100)   // 100 req/second
   ```
4. **Wait 1 minute** between test runs to let the token bucket refill.

---

## How It Works

1. The script starts `CONCURRENCY` background processes (`&`).
2. Each process runs one **iteration**: login → dashboard → report.
3. All responses are checked for HTTP 200.
4. Login tokens are extracted from JSON and passed to subsequent requests.
5. Timing is measured with nanosecond precision via `perl`/`python3`/`date`.
6. Results are accumulated in a temp directory with file-based locking.
7. A summary table is printed to stdout.

---

## Prerequisites

- **curl** — preinstalled on macOS and virtually all Linux distros.
- **jq** (optional) — for robust JSON parsing. Install with `brew install jq`
  or `apt install jq`. Falls back to `grep`/`sed` if absent.
- **perl** or **python3** (optional) — for nanosecond timing. Falls back to
  `date +%s%N` (Linux) or `perl` (macOS ships with perl).

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| All requests fail with `Connection refused` | Backend not running | Start the Go server |
| Mix of 200 and 429 responses | Rate limiter engaged | Reduce concurrency or increase rate limit |
| Login always returns 401 | Wrong credentials | Set `EMAIL`/`PASSWORD` env vars |
| `jq: command not found` warnings | jq not installed | `brew install jq` or ignore (fallback works) |
| `date: illegal option` on macOS | `date` format differs | The script auto-detects and falls back to perl |

---

## Extending

To add a new endpoint scenario:

1. Write a `do_yourendpoint()` function following the pattern of
   `do_dashboard()` or `do_report()`.
2. Add timing accumulator files and counter files at the top of the script.
3. Call your function from `run_iteration()`.
4. Add the results to `print_summary()`.

---

## Why Not k6?

k6 is a fantastic tool, but it's not installed on this machine and installing
it globally may not be desired. This script gives you 90% of what k6 offers
(parallelism, timing, pass/fail analysis) with zero dependencies beyond what
every developer workstation already has: bash, curl, and basic UNIX tools.
