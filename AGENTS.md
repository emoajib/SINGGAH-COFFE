# AGENTS.md — Singgah Coffee POS

MANDATORY reading for ALL AI models/agents before modifying ANY code in this repo.
For full project workflow see CLAUDE.md. This file exists so non-Claude agents obey the same rules.

## Non-Negotiable Shared Hosting Constraints

The production app runs on shared hosting (rumahweb/sosiomen.com) with a low `ulimit -u`.
Violating these rules causes the process to crash with `fatal error: newosproc`
and makes file uploads fail (api-proxy.php). These were hard-won production incidents — do NOT regress them.

1. **DB connection pool limits REQUIRED** — reuse the pool in
   `backend/internal/database/database.go`: `SetMaxOpenConns(10)`,
   `SetMaxIdleConns(2)`, `SetConnMaxLifetime(5m)`. NEVER open a raw
   `sql.DB`/gorm connection outside the shared pool (per-connection
   go-sql-driver/mysql watcher threads crash the process on shared hosting).
2. **`start.sh` MUST keep** `GOMAXPROCS=1` and `GOMEMLIMIT=200MiB` (or lower).
   New background workers MUST use worker pools, not `go func()` per task/request.
3. **`api-proxy.php` MUST keep multipart/form-data + file POST field forwarding**
   (the `CURLOPT_POSTFIELDS` fix). Any new file-upload module MUST be tested
   end-to-end through the proxy — do NOT assume the browser talks directly to the backend.
4. **No unlimited retries/polling goroutines** in handlers or usecases.
5. **Deploy checklist after ANY change**: `go vet ./...`, `go test ./...`,
   `npx tsc --noEmit`, rebuild Linux binary (`CGO_ENABLED=0 GOOS=linux GOARCH=amd64`),
   `cp api-proxy.php .htaccess ~/public_html/`, restart via `start.sh`,
   verify `/health` AND a real file upload.

## Deploy Rule

Commits land on `main` and auto-deploy via GitHub Actions. If CI fails, fix and re-push — never bypass.