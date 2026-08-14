# Known Issues

## Database

### MySQL/MariaDB: reserved keyword `key` in queries

**Error:** `Error 1064 (42000): You have an error in your SQL syntax;... near 'key = ?'` followed by `WHERE conditions required`

**Cause:** `key` is a reserved word in MySQL/MariaDB. GORM generates `WHERE key = ?` which fails syntax. When SELECT fails, the Upsert falls through to UPDATE with empty model → error.

**Fix:** Always backtick-quote `` `key` `` in raw WHERE clauses: `Where("\`key\` = ?", val)`.

**Files:** `backend/internal/repository/postgres/setting_repo.go` (FindByKey, Upsert)

### Database driver: PostgreSQL → MySQL

**Error:** `panic: empty dsn` or `expected gorm.io/driver/mysql but imported gorm.io/driver/postgres`

**Cause:** Project uses MySQL/MariaDB on VPS (`tcp(localhost:3306)`) but code imported `gorm.io/driver/postgres`.

**Fix:** Import `gorm.io/driver/mysql` and use `mysql.Open(dsn)`.

**Context:** VPS is shared hosting `sosb4282` on "colorado" host, MySQL (MariaDB), not PostgreSQL.

## Deployment

### Static directory path on VPS

**Error:** Backend serves wrong index.html (e.g., `REST API` message instead of the dashboard)

**Cause:** Binary runs from `~/singgah-pos/` but `--static-dir=../web` resolves relative to `cwd` at process launch. With systemd or scripts that `cd`, the relative path breaks.

**Fix:** Use `--static-dir=web` when running from `~/singgah-pos/`.

### GOMAXPROCS=1 required

**Cause:** VPS (shared) has limited processes. Without `GOMAXPROCS=1`, the Go runtime spawns GOMAXPROCS threads, overloading the process limit.

**Fix:** Always run as `GOMAXPROCS=1 nohup ./main ...`

### Commit → CI → Deploy Workflow

**Mandatory workflow for all changes:**
1. `git add -A && git commit -m "feat/describe: what changed"`
2. `git checkout main && git merge <branch> --no-edit`
3. `git push origin main`
4. Wait for GitHub Actions CI (Test + Singgah POS CI) — check: `curl -s -H "Accept: application/vnd.github+json" "https://api.github.com/repos/emoajib/SINGGAH-COFFEE/actions/runs?per_page=3"`
5. If CI passes → create deploy package: `tar -czf deploy.tar.gz -C deploy .`
6. If CI fails → fix, re-commit, re-push
7. Upload `deploy.tar.gz` to `/home/sosb4282/singgah-pos/` via SFTP/cPanel → SSH → `tar -xzf deploy.tar.gz && ./start.sh &`

**Deploy package structure (`deploy/`):**
- `backend/singgah-backend` — Linux amd64 binary
- `backend/.env` — kredensial produksi (tidak di-commit; isi manual di server, lihat `backend/.env.example`)
- `web/` — built frontend (from `web-dashboard/dist/`)
- `start.sh` — reads `backend/.env`, sets hardening, execs binary
- `scripts/*.sh` — backup/sync automation
- Credentials: jangan simpan di repo. Rotasi yang bocor → lihat `docs/ROTASI_KREDENSIAL.md`

**CI workflow details:**
- `test.yml` — Go tests on push/PR to `main`
- `main.yml` — Backend build (Go 1.23), Frontend npm build, Integration test with MySQL 8 container
- Go version mismatch: local dev uses Go 1.25, CI uses Go 1.23 — build is compatible but always verify locally

## Frontend

### Google Fonts blocked by CSP

**Error:** `Refused to load the stylesheet 'https://fonts.googleapis.com/...' because it violates Content-Security-Policy directive: style-src 'self' 'unsafe-inline'`

**Cause:** CSP set in backend middleware (`main.go:114`) only allows `style-src 'self' 'unsafe-inline'` and `font-src 'self'`.

**Fix:** Add `https://fonts.googleapis.com` to `style_src` and `https://fonts.gstatic.com` to `font-src`:
```
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com
```

### Rate limit 429 on retry storm

**Error:** `429 Too Many Requests` on all `/api/*` endpoints

**Cause:** After fixing a backend bug (e.g., 500 error), the browser retries all failed requests in a burst, hitting the 100 request/min/IP rate limiter.

**Fix:** Rate limiter set to 300/min (see `backend/internal/delivery/middleware/rate_limiter.go`). Or wait 1 minute for rate limit to reset.

### PWA service worker served from outdated cache

**Error:** Old JS/CSS served after frontend rebuild, or `/sw.js` 404

**Cause:** Vite PWA plugin registers service worker that caches old assets. SW may still be registered even after SW files are deleted.

**Fix:** Delete `registerSW.js`, `manifest.webmanifest`, `sw.js`, `workbox-*.js` from `web/`. Remove `<link rel="manifest">` and `<script id="vite-plugin-pwa:register-sw">` from `index.html`.

### Frontend dev server port conflict

**Error:** Vite dev server fails to start on port 3000

**Cause:** Port 3000 is occupied by another process.

**Fix:** Frontend dev server runs on port 3001. Check `vite.config.ts` for `server.port` setting.
