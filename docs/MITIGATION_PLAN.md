# Mitigation Plan — Backend localhost crash & UI data kosong

Tanggal: 2026-10-29
Status: Draft (siap dieksekusi bertahap)

## Tujuan
Mencegah dua masalah yang terjadi:
1. Backend localhost sering mati sendiri (MariaDB 12.2.x crash + DSN `localhost`).
2. UI menampilkan data kosong padahal API 200 (cache/service worker lama).

## Ruang Lingkup
- Lokal (macOS dev): MariaDB, DSN, proses backend.
- Frontend (PWA/cache).
- Produksi (shared hosting): deploy workflow, DB stabil, monitoring.

## Prinsip Keamanan
- Jangan hapus DB/data tanpa backup.
- Jangan deploy ke produksi sebelum CI hijau.
- Setiap perubahan diverifikasi: `go vet`, `go test`, `npx tsc --noEmit`, `npm run build`.
- Rollback selalu tersedia via backup `update-webhosting.sh`.

## Fase 1 — Stabilkan Database Lokal (Prioritas Tinggi)
### Langkah
1. Backup DB lokal:
   ```bash
   mysqldump -u root -ppassword --databases singgah_pos --single-transaction --routines --triggers > ~/singgah_pos_backup.sql
   ```
2. Stop MariaDB 12.2:
   ```bash
   brew services stop mariadb
   ```
3. Install & jalankan MariaDB 11.4 LTS:
   ```bash
   brew install mariadb@11.4
   brew services start mariadb@11.4
   ```
4. Buat DB + import:
   ```bash
   mysql -u root -ppassword -e "CREATE DATABASE IF NOT EXISTS singgah_pos;"
   mysql -u root -ppassword < ~/singgah_pos_backup.sql
   ```
5. Pastikan DSN lokal memakai `127.0.0.1`:
   ```
   DATABASE_URL="root:password@tcp(127.0.0.1:3306)/singgah_pos?charset=utf8mb4&parseTime=True&loc=Local"
   ```
6. Jalankan backend dan verifikasi:
   ```bash
   cd backend && go run ./cmd/server
   curl -s http://127.0.0.1:8080/health
   ```

### Verifikasi
- `SELECT VERSION();` → 11.4.x (bukan 12.2.x).
- Tidak ada `signal 11` / `crash recovery` di log MariaDB.
- Backend tidak exit saat startup.

## Fase 2 — Hardening Kode (Sudah Diterapkan)
Perubahan yang sudah masuk repo:
- `backend/internal/config/config.go`: default DSN `127.0.0.1`.
- `backend/internal/database/database.go`: retry koneksi DB, seed non-fatal, deteksi versi DB 12.2 (warning).
- `backend/cmd/server/main.go`: recover di goroutine token cleanup.
- `backend/internal/delivery/middleware/rate_limiter.go`: recover di cleanup loop.
- `known-issues.md` + `CLAUDE.md`: dokumentasi masalah & DSN.
- `docs/MITIGATION_PLAN.md`: plan ini.

### Verifikasi
- `go vet ./...` + `go test ./...` lulus.
- `npx tsc --noEmit` + `npm run build` (web-dashboard) lulus.

## Fase 3 — Mitigasi Cache / Service Worker (UI data kosong)
### Langkah Pengguna
1. Hard refresh: `Ctrl+F5` / `Cmd+Shift+R`.
2. Jika masih kosong: DevTools → Application → Service Workers → Unregister.
3. DevTools → Application → Storage → Clear site data → reload.
4. Uji di jendela Incognito untuk memastikan bukan cache.

### Langkah Dev (opsional, jika berulang)
- Nonaktifkan PWA service worker di `vite.config.ts`, atau
- Tambahkan version check yang memaksa reload saat build baru.
- Hapus `sw.js`/`workbox-*.js` dari `web/` saat deploy (lihat known-issues).

### Verifikasi
- Network tab: `/api/dashboard/summary` → 200 dengan data.
- UI menampilkan data setelah clear cache.

## Fase 4 — Disiplin Deploy Produksi (Shared Hosting)
### Workflow Wajib
1. `go vet ./...` + `go test ./...` + `npx tsc --noEmit` + `npm run build`.
2. `git commit` → `git push origin main`.
3. Tunggu GitHub Actions hijau.
4. Jalankan `bash update-webhosting.sh` di server.
5. Verifikasi `/health` + 1 request real (login + dashboard).

### Guardrail
- Jangan deploy sebelum CI hijau.
- Jangan ubah DB versi produksi tanpa uji (saat ini 11.4.13, stabil).
- Patuhi batasan shared hosting:
  - Pool DB: `MaxOpenConns(10)`, `MaxIdleConns(2)`, `ConnMaxLifetime(5m)`.
  - `GOMAXPROCS=1`, `GOMEMLIMIT=200MiB`.
  - Tidak ada polling goroutine tanpa batas.

## Fase 5 — Monitoring & Rollback
### Monitoring
- Cek `curl -s http://localhost:8080/health` setelah deploy.
- Cek log backend: `tail -n 50 ~/singgah-pos/backend/backend.log`.
- Cek versi DB: `SELECT VERSION();`.

### Rollback
- Gunakan backup dari `update-webhosting.sh`: `/home/sosb4282/backups/<timestamp>/`.
- Restore DB dari backup `.sql.gz` jika diperlukan.
- Restart backend via `start.sh`.

## RACI (singkat)
- Dev: Fase 1-3, kode, CI.
- Ops (server): Fase 4-5, deploy, monitoring.

## Kriteria Selesai
- Localhost: backend stabil 24 jam tanpa crash.
- Produksi: health OK, data tampil normal, tidak ada crash log.
- Dokumentasi & plan tersimpan di repo (`docs/MITIGATION_PLAN.md`, `known-issues.md`).
