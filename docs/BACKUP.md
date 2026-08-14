# 📋 Backup & Sync Checklist — Singgah Coffee POS

> **Last verified:** Deploy `717a7ef` (security hardening) | 2026-08-10

---

## 🔧 Environment Overview

| Layer | Webhosting (Production) | Local (Development) |
|-------|------------------------|---------------------|
| **Database** | MySQL/MariaDB @ `localhost:3306` | Docker MySQL @ `localhost:3307` |
| **DB Name** | `sosb4282_singgah_pos` | `singgah_pos` |
| **DB User** | `sosb4282_singgah_pos` | `root` |
| **DB Pass** | `********` (dari `backend/.env`) | `password` |
| **Uploads** | `~/singgah-pos/backend/uploads/` | `./backend/uploads/` |
| **Frontend** | `~/public_html/` (SvelteKit build) | `./web-dashboard/` (Vite dev) |
| **Backend** | `~/singgah-pos/backend/singgah-backend` | Docker container `singgah_api` |

---

## ✅ Pre-Flight Checklist (Before Backup)

- [ ] Backend sedang berjalan (`ps aux | grep singgah-backend`)
- [ ] Health check 200 (`curl -s http://localhost:8080/health`)
- [ ] Database accessible (`mysql -u <db_user> -p<db_pass> -e "SELECT 1"` — nilai dari `backend/.env`)
- [ ] Uploads folder ada (`ls ~/singgah-pos/backend/uploads/products/`)
- [ ] Disk space cukup (`df -h ~/backups`)

---

## 🔄 Routine: Backup di Webhosting

```bash
# 1. SSH ke server
ssh -p 992 sosb4282@colorado.sosomedia.net

# 2. Jalankan backup
bash ~/singgah-pos/scripts/backup-webhosting.sh

# 3. Verifikasi
ls -lh ~/backups/db_*.sql.gz ~/backups/uploads_*.tar.gz
```

**Frequency:** Daily backup (cron), Weekly rotation

---

## 🔄 Routine: Backup di Localhost

```bash
# 1. Pastikan Docker running
sudo docker compose up -d

# 2. Jalankan backup local
bash scripts/backup-local.sh

# 3. Verifikasi
ls -lh backups/db_local_*.sql.gz backups/uploads_local_*.tar.gz
```

**Frequency:** On major changes (product uploads, inventory adjustments)

---

## 🔁 Sync Between Webhosting & Localhost

### Pull production → local (restore production data to dev)

```bash
export DEPLOY_HOST="sosb4282@colorado.sosomedia.net"
export DEPLOY_PORT="992"
export DEPLOY_PASS="your_webhosting_password"

bash scripts/sync-data.sh --pull

# Restore DB to local Docker MySQL
gunzip -c backups/db_20240101_120000.sql.gz | \
  docker exec -i singgah_mysql mysql -u root -ppassword singgah_pos

# Restore uploads
rm -rf ./backend/uploads/* && \
  mkdir -p ./backend/uploads && \
  tar xzf backups/uploads_20240101_120000.tar.gz -C ./backend/uploads
```

### Push local → production (upload dev data to prod)

```bash
bash scripts/sync-data.sh --push

# On server:
cd ~/singgah-pos
gunzip -c ~/backups/db_local_20240101_120000.sql.gz | \
  mysql -u <db_user> -p<db_pass> sosb4282_singgah_pos
```

### Check sync status

```bash
bash scripts/sync-data.sh --status
```

---

## 🧪 Verification Checklist (After Restore)

### Database Integrity
- [ ] `SELECT COUNT(*) FROM products;` → record count matches expectation
- [ ] `SELECT COUNT(*) FROM outlets;` → outlets present
- [ ] `SELECT COUNT(*) FROM transactions;` → transactions present
- [ ] Users masih bisa login: `curl -s -X POST http://localhost:8080/api/auth/login -H "Content-Type: application/json" -d '{"username":"owner","password":"admin123"}'`

### Storage Integrity
- [ ] Product images accessible: `curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/uploads/products/...`
- [ ] Logo accessible: `curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/uploads/logo/logo.png`

### Full System Test
- [ ] Health check: `curl -s http://localhost:8080/health` → `{"status":"ok"}`
- [ ] API endpoints return 401 without auth (RBAC working)
- [ ] Login flow works end-to-end
- [ ] Static frontend loads (`https://sosiomen.com/`)

---

## 📦 Backup File Structure

```
~/backups/          (webhosting)
├── db_YYYYMMDD_HHMMSS.sql.gz     ← database dump
├── uploads_YYYYMMDD_HHMMSS.tar.gz ← uploads (products, logos)
└── (auto-rotated, keeps last 5)

./backups/          (local)
├── db_local_YYYYMMDD_HHMMSS.sql.gz
└── uploads_local_YYYYMMDD_HHMMSS.tar.gz
```

---

## ⚠️ Emergency: Rollback Procedure

If backup restore corrupts production:

```bash
# 1. Stop backend
kill $(pgrep singgah-backend)

# 2. Restore from pre-restore backup
gunzip -c ~/backups/db_YYYYMMDD_HHMMSS_pre_restore.sql.gz | \
  mysql -u <db_user> -p<db_pass> sosb4282_singgah_pos

# 3. Restore uploads (if needed)
tar xzf ~/backups/uploads_YYYYMMDD_HHMMSS_pre_restore.tar.gz -C ~/singgah-pos/backend/

# 4. Restart backend
cd ~/singgah-pos/backend && nohup bash start.sh > ../logs/backend.log 2>&1 &
```
