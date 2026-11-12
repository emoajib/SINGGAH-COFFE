# Plan Sprint Infra — Singgah Coffee POS (untuk semua model AI)

Dokumen ini berisi sisa pekerjaan infra/feature besar yang **belum dikerjakan**.
Setiap model AI yang melanjutkan wajib membaca dokumen ini sebelum memodifikasi kode.

## Konteks Wajib (baca dulu)
- AGENTS.md (shared hosting constraints, deploy rule)
- CLAUDE.md (workflow)
- known-issues.md (bug historis)
- AUDIT_REPORT.md (temuan A1–A13)
- PLAN_BACKLOG.md (backlog)

## Constraint Kritis (jangan dilanggar)
1. DB pool: SetMaxOpenConns(10), SetMaxIdleConns(2), SetConnMaxLifetime(5m). Jangan buka raw sql.DB/gorm di luar pool.
2. start.sh: GOMAXPROCS=1, GOMEMLIMIT=200MiB. Worker pool, bukan go func per request.
3. api-proxy.php: multipart/form-data + file POST field forwarding.
4. Test gate: go vet ./..., go test ./..., npx tsc --noEmit, npm run build.
5. Deploy: commit → push main → CI hijau → update-webhosting.sh → verify /health + upload.

---

## Sprint A — DB-01 Full (Versioned Migration, Expand/Contract)

### Tujuan
Skema evolusi terkontrol, zero-downtime, rollback per versi.

### Fase A1 — Expand (backward compat)
- Tambah kolom baru nullable/default via migrasi up.
- Kode lama tetap jalan (kolom nullable).
- Dual-write: tulis ke kolom lama & baru.
- Mitigasi: feature flag.

### Fase A2 — Migrate Data (backfill)
- Script backfill idempoten (bisa diulang).
- Mitigasi: batch kecil, transaksi, log progress, rollback snapshot.

### Fase A3 — Contract (cleanup)
- Hapus kolom lama setelah semua versi kode baru stabil.
- Mitigasi: jangan hapus sebelum semua consumer updated; keep backup.

### Tooling
- Simpan migrasi di `backend/migrations/*.sql`.
- CLI `cmd/migrate` (up/down).
- Runner opt-in via RUN_MIGRATIONS=1 (sudah ada scaffold).

### File yang akan disentuh
- backend/internal/database/database.go (runner)
- backend/migrations/*.sql (baru)
- backend/cmd/migrate/main.go (baru)

### Test
- Migrasi up/down di SQLite/MySQL test container.
- Verifikasi kolom baru nullable & default.

### Risiko
- Shared hosting timeout pada ALTER besar → jalankan manual via SSH.

---

## Sprint B — OPS-OFFLINE-01 Full (IndexedDB-primary, Conflict Resolution, UI Feedback)

### Tujuan
Sync offline on reconnect untuk owner/manager/cashier.

### Fase B1 — Storage (IndexedDB-primary)
- IndexedDB sebagai source of truth, localStorage fallback.
- Refactor queue ke async; in-memory cache untuk sync count().
- Migrasi data localStorage → IndexedDB saat pertama kali.
- Mitigasi: fallback localStorage jika IndexedDB gagal.

### Fase B2 — Conflict Resolution
- Server 4xx (selain 409) → dead-letter + notifikasi; tidak retry.
- 5xx/network → retry backoff (sudah ada).
- Idempotency key per mutasi (sudah ada untuk order).
- Mitigasi: server menolak duplikat (no-op); client hapus dari antrean.

### Fase B3 — UI Feedback
- Banner offline, badge count, toast hasil sync, tombol manual.
- Mitigasi: tidak blokir operasi utama; graceful degradation.

### File yang akan disentuh
- web-dashboard/src/services/offlineQueue.ts (refactor async)
- web-dashboard/src/components/layout/Header.tsx (badge)
- web-dashboard/src/pages/PosTerminal.tsx (banner, auto-flush)

### Test
- tsc --noEmit, npm run build.
- Staging test dengan simulasi offline.

### Risiko
- Rate limiter 300/min → batch flush dengan delay.
- Shared hosting: sequential flush (no goroutine).

---

## Urutan Eksekusi
1. Sprint A (DB-01) — Fase A1 → A2 → A3
2. Sprint B (OPS-OFFLINE-01) — Fase B1 → B2 → B3

## Aturan
- Jangan commit jika test gate gagal.
- Jangan deploy sebelum CI hijau.
- Shared hosting: GOMAXPROCS=1, pool max 10, no go func per request.
- Setiap sprint: commit terpisah, CI hijau, deploy.

## Status
- Sprint A: ⏳ Belum
- Sprint B: ⏳ Belum (skeleton + retry/dead-letter + IndexedDB mirror sudah ada)