# CLAUDE.md — Singgah Coffee POS

## Project Overview
Sistem MOKA POS for Singgah Coffee — Go backend + React/Vite frontend, MariaDB database.

## Tech Stack
- **Backend**: Go 1.25, Gin framework, JWT auth
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Database**: MariaDB (localhost:3306, DB: `singgah_pos`)
- **Infra**: Local dev server (port 8080 backend, 3001 frontend), Webhosting (sosiomen.com)

## Credentials
- **DB**: `root:password@tcp(localhost:3306)/singgah_pos`
- **Admin**: `owner@singgah.coffee` / `admin`
- **JWT Secret**: `singgah-pos-super-secret-key-2024-long-enough`

## Development Workflow

### 1. Code Standards
- **Go**: `go vet ./...` must pass, strict typing
- **TypeScript**: `npx tsc --noEmit` must pass with no errors
- **Skeleton-then-Replace**: Files >80 lines must be written skeleton-first, then filled with Edit

### 2. Commit → CI → Deploy (MANDATORY RULE)
```
1. git add -A && git commit -m "feat/describe: what changed"
2. git checkout main && git merge <branch> --no-edit
3. git push origin main
4. Wait for GitHub Actions CI to pass (2 workflows: Test + Singgah POS CI)
5. If CI passes → deploy package (deploy.tar.gz)
6. If CI fails → fix, re-commit, re-push
```

### 3. CI Checks
- **Test workflow** (`test.yml`): Go tests on push/PR to `main`
- **CI workflow** (`main.yml`): Backend build + tests, Frontend npm build, Integration test
- Check results: `curl -s -H "Accept: application/vnd.github+json" "https://api.github.com/repos/emoajib/singgah-coffe/actions/runs?per_page=3"`

### 4. Deploy to Webhosting
#### Build steps:
```bash
# Backend (Linux binary)
cd backend && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o deploy/backend/singgah-backend ./cmd/server

# Frontend
cd ../web-dashboard && npm run build
```

#### Package creation:
```bash
# Creates deploy.tar.gz with:
#   - backend/singgah-backend  (Linux binary)
#   - backend/.env             (webhosting DB creds)
#   - web/                     (built frontend)
#   - start.sh                 (startup script)
#   - api-proxy.php            (PHP reverse proxy for /api and /uploads)
#   - .htaccess                (Apache rewrite rules)
#   - scripts/*.sh             (backup scripts)
mkdir -p deploy/backend deploy/web deploy/scripts
cp backend/singgah-backend deploy/backend/
cp backend/.env deploy/backend/
cp start.sh deploy/
cp api-proxy.php deploy/
cp .htaccess deploy/
cp -r web-dashboard/dist/* deploy/web/
cp scripts/*.sh deploy/scripts/
tar -czf deploy.tar.gz -C deploy .
```

#### Manual deploy on webhosting:
1. Upload `deploy.tar.gz` to `/home/sosb4282/singgah-pos/` (cPanel File Manager or SFTP)
2. SSH: `ssh sosb4282@sosiomen.com`
3. Extract: `cd /home/sosb4282/singgah-pos && tar -xzf deploy.tar.gz`
4. Backend: `chmod +x backend/singgah-backend start.sh && ./start.sh &`
5. Frontend: `rm -rf ~/public_html/* && cp -r web/* ~/public_html/ && cp .htaccess api-proxy.php ~/public_html/`
6. Verify: `curl -s http://localhost:8080/health`

#### Server env vars (start.sh):
> ⚠️ Kredensial asli TIDAK boleh di-commit. Nilai di bawah PLACEHOLDER — isi
> `backend/.env` di server (lihat `backend/.env.example` & `docs/ROTASI_KREDENSIAL.md`).
```bash
PORT=8080
DATABASE_URL="user:password@tcp(localhost:3306)/dbname?charset=utf8mb4&parseTime=True&loc=Local"
JWT_SECRET="<generate: openssl rand -hex 32>"
NODE_ENV=production
```

### 5. Testing
- Backend tests: `cd backend && go test ./... -v -count=1` or `./run_backend_tests.sh`
- Frontend typecheck: `cd web-dashboard && npx tsc --noEmit`
- API testing: All endpoints tested with Bearer JWT from login endpoint

### 6. Key Files & Conventions
- Backend routes: `backend/internal/routes/routes.go` — protected routes use `middleware.RoleMiddleware("owner")`
- Handlers: `backend/internal/delivery/handler/` — thin handlers, business logic in usecase
- Repositories: `backend/internal/repository/postgres/` — SQL implementations
- Frontend pages: `web-dashboard/src/pages/`
- Frontend hooks: `web-dashboard/src/hooks/`
- Frontend services: `web-dashboard/src/services/`
- DB migrations: SQL files in root (run manually with `mysql -u root -ppassword singgah_pos < file.sql`)
- Data seed: `import_excel_baseline.sql`, `migrate_stock_requirements.sql`, `setup_recipes.sql`

### 7. Shared Hosting Constraints (MANDATORY — architecturally enforced)

> **ALL models/agents MUST obey these rules on EVERY feature/module update.**
> These exist to prevent the `fatal error: newosproc` crash (host `ulimit -u`)
> and Apache/PHP upload failures (api-proxy.php). Do NOT regress them.

1. **DB connection pool limits are REQUIRED** — any new repository layer MUST reuse
   the pool configured in `backend/internal/database/database.go`:
   `SetMaxOpenConns(10)`, `SetMaxIdleConns(2)`, `SetConnMaxLifetime(5m)`.
   NEVER open a raw `sql.DB`/gorm connection outside the shared pool
   (per-connection go-sql-driver/mysql watcher threads crash the process on shared hosting).
2. **`start.sh` MUST keep** `GOMAXPROCS=1` and `GOMEMLIMIT=200MiB` (or lower).
   New background workers/goroutines MUST NOT add unbounded concurrency;
   use worker pools, not `go func()` per task/request.
3. **`api-proxy.php` MUST keep multipart/form-data + file POST field forwarding**
   (the `CURLOPT_POSTFIELDS` fix). Any new file-upload module MUST be tested end-to-end
   through the proxy; do NOT assume the browser talks directly to the backend.
4. **Do not add unlimited retries/polling goroutines** in handlers or usecases —
   each one can spawn OS threads on a low-`ulimit` host.
5. **Deploy checklist after ANY change**: `go vet ./...` + `go test ./...` +
   `npx tsc --noEmit`, rebuild Linux binary, `cp api-proxy.php .htaccess ~/public_html/`,
   restart via `start.sh`, verify `/health` AND a real file upload.

### 8. Local Development
```bash
# Terminal 1: Backend
cd backend && go run ./cmd/server

# Terminal 2: Frontend
cd web-dashboard && npm run dev

# Database (MariaDB)
mysql -u root -ppassword -h 127.0.0.1 singgah_pos
```

## Project Structure
```
.
├── backend/
│   ├── cmd/server/main.go          # Entry point, wire DI
│   ├── internal/
│   │   ├── delivery/handler/       # HTTP handlers (thin)
│   │   ├── repository/             # Interfaces
│   │   ├── usecase/                # Business logic
│   │   └── routes/routes.go        # Route definitions
│   ├── .env                        # Local DB credentials
│   ├── go.mod
│   └── start.sh                    # Production starter
├── web-dashboard/
│   ├── src/
│   │   ├── pages/                  # Route components
│   │   ├── hooks/                  # React hooks
│   │   ├── services/               # API clients
│   │   ├── types/                  # TypeScript interfaces
│   │   └── components/             # Reusable UI
│   └── vite.config.ts
├── deploy.tar.gz                   # Built deploy package
├── deploy.sh                       # Deploy to remote server via SSH
├── deploy-manual.sh                # Run on-server deployment
├── deploy-on-server.sh             # Clone & build on server
├── *.sql                           # Database seed/migration files
└── docs/                           # Documentation
```
