# Bug Registry — Singgah Coffee POS

Sumber kebenaran tunggal untuk bug/temuan. Setiap bug wajib punya ID sebelum diperbaiki.
Konvensi ID: `Axx` (audit awal), `BUG-xxx` (baru), atau ID backlog (`SEC-xx`, `DB-xx`, …).

**Aturan:**
1. Bug baru → tambah baris dengan status `Open` sebelum coding.
2. Setiap fix wajib mengisi `Fix commit` dan `Test regresi`.
3. Reviewer menolak PR yang memperbaiki bug tanpa entri registry.
4. Status: `Open`, `Fixed`, `Verified`, `By design`, `Won't fix`.

Last synced commit: (isi manual per rilis)

---

## Audit Awal (A1–A13)

| ID | Severity | Gejala / Temuan | Root cause (file:line) | Fix commit | Test regresi | Guardrail | Status |
|---|---|---|---|---|---|---|---|
| A1 | Kritis | Ganti password UI selalu gagal (405/404) | `web-dashboard/src/hooks/useAuth.ts:44` (PUT vs POST) | AUDIT_REPORT sesi | `useAuth` | tsc/build | Fixed |
| A2 | Kritis | OutletID tidak dipersist/dibaca di user repo → multi-outlet mati | `backend/internal/repository/postgres/user_repo.go:73-90` | `1d2ac18` + `6597da3` | auth usecase tests | go test | Fixed (parsial → A9) |
| A3 | Tinggi | Blacklist token fail-open pada error repo | `backend/internal/delivery/middleware/auth_middleware.go:34-43` | AUDIT_REPORT sesi | middleware tests | go test | Fixed |
| A4 | Tinggi | Webhook callback-token fail-open | `backend/internal/usecase/webhook_usecase.go:48-53` | AUDIT_REPORT sesi | webhook tests | go test | Fixed |
| A5 | Sedang | Cache dashboard global → bocor antar-outlet | `backend/internal/usecase/report_usecase.go:19-23,97-100` | AUDIT_REPORT sesi | report tests | go test | Fixed |
| A6 | Sedang | Tombol void tampil untuk cashier | `web-dashboard/src/pages/Sales.tsx:135-144` | AUDIT_REPORT sesi | tsc/build | role gate | Fixed |
| A7 | Sedang | SQL dummy merujuk kolom tak ada | `cleanup_dummy_test_data.sql:10` | AUDIT_REPORT sesi | manual SQL | — | Fixed |
| A8 | Tinggi (runtime) | Driver DB MySQL vs DSN PostgreSQL + query PG-only/MySQL-only | `backend/internal/database/database.go`, `order_repo.go`, `setting_repo.go` | AUDIT_REPORT sesi | go build/test | CI integration | Fixed (MySQL) |
| A9 | Sedang | Tidak ada switch outlet di UI / header X-Outlet-ID | `web-dashboard/src/services/api.ts` | `6597da3` | tsc/build | — | Fixed |
| A10 | Rendah | Gate role frontend vs backend | `Sidebar.tsx`, routes | by design | — | — | By design |
| A11 | Rendah | Inventory GetByID tanpa scope outlet | `inventory_usecase.go` | `6597da3` | inventory tests | go test | Fixed |
| A12 | Rendah | Setting global (tanpa outlet scoping) | `setting_repo.go` FindAll | by design | — | — | By design |
| A13 | Perlu cek | Register role owner | `routes.go:56` | by design | — | — | By design |

## Bug Historis (known-issues.md)

| ID | Severity | Gejala | Root cause | Fix commit | Test regresi | Guardrail | Status |
|---|---|---|---|---|---|---|---|
| KI-01 | Tinggi | `Error 1064 ... near 'key = ?'` | `key` reserved word MySQL | AUDIT_REPORT sesi | setting tests | go test | Fixed |
| KI-02 | Kritis | `panic: empty dsn` / driver mismatch | Import driver postgres | AUDIT_REPORT sesi | go build | CI | Fixed (A8) |
| KI-03 | Tinggi | Backend serve index.html salah | Relative static dir | ops runbook | manual | deploy checklist | Fixed (ops) |
| KI-04 | Kritis | `fatal error: newosproc` | GOMAXPROCS / raw DB conn | constraint guard | check-constraints | CI guard | Mitigated |
| KI-05 | Sedang | 429 retry storm | Rate limiter terlalu rendah | AUDIT_REPORT sesi | rate limiter test | — | Fixed |
| KI-06 | Sedang | PWA service worker cache lama | SW cache | ops runbook | manual | deploy checklist | Mitigated |
| KI-07 | Sedang | Vite port conflict | Port 3000 dipakai | config | manual | — | Mitigated |
| KI-08 | Tinggi | MariaDB 12.2.x crash | Bug server + DSN localhost | MITIGATION_PLAN | manual | docs | Mitigated |

## Backlog Selesai (referensi)

| ID | Deskripsi singkat | Status |
|---|---|---|
| SEC-01 | Hapus default admin password | Fixed |
| FIN-01 | Exclude raw material dari BEP cost | Fixed (`c34fd39`) |
| FIN-02 | Propagate P&L query errors | Fixed (`ccefb5c`) |
| OPS-01 | Safe dotenv parsing backup script | Fixed (`c6e3219`) |
| DB-01 | Disable AutoMigrate default | Fixed (`4c2d201`) |
| QR-02 | Reject feedback token invalid | Fixed (`fb4436f`) |
| QR-03 | Body size limit + rate limiter | Fixed (`96afc0d`) |
| QR-05 | ETag menu | Fixed (`36538d1`) |
| QR-07 | Scope feedback reply by outlet | Fixed (`104d709`) |
| QR-08 | Truncate feedback by rune | Fixed (`238478f`) |
| B1–B4, C1–C4, D1–D3, E1–E2, G1–G2 | Outlet scoping, idempotency, cash book atomic, backup safety | Fixed (lihat git log) |

## Bug Baru (template)

| ID | Severity | Gejala | Root cause | Fix commit | Test regresi | Guardrail | Status |
|---|---|---|---|---|---|---|---|
| BUG-001 | — | (contoh) | (file:line) | (sha) | (test) | (guard) | Open |

---

## Aturan Penamaan ID Baru
- Gunakan `BUG-xxx` (nomor urut) untuk bug baru yang tidak masuk audit/backlog.
- Sertakan ID di commit message: `fix(BUG-001): ...`.
- Update tabel di atas pada commit yang sama dengan fix.