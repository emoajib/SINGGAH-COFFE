# AUDIT REPORT — Sistem Moka POS Singgah Coffee

Tanggal: 4 Agustus 2026
Scope: Backend (Go/Gin/GORM), Frontend (React+TS+Vite), Database, Kesesuaian UI per role.
Status: Temuan terverifikasi baris-per-baris (file:line). Perbaikan bernomor **FIXED** sudah diterapkan.

---

## 1. Ringkasan Eksekutif

Audit full-stack (backend, frontend, database) menemukan **1 bug fungsional kritis**, **2 celah keamanan fail-open**, **1 defect arsitektur multi-outlet** (fitur outlet nyaris mati seluruhnya), serta beberapa ketidaksinkronan gate role dan inkompatibilitas SQL/database. Perbaikan bernomor sudah diterapkan (lihat Bagian 5); sisanya membutuhkan keputusan desain/deployment.

Ringkasan cepat:
- **Kritis**: Ganti password di UI **selalu gagal** (405/404) — frontend pakai `PUT`, backend route-nya `POST`.
- **Kritis**: OutletID **tidak pernah dipersist/dibaca** di repo user → seluruh fitur multi-outlet tidak berfungsi end-to-end; `X-Outlet-ID` tidak pernah dikirim frontend.
- **Tinggi**: Cek blacklist token & cek callback-token webhook **fail-open** (mengabaikan error → permisif).
- **Sedang**: Cache dashboard bersifat global (bocor antar-outlet); tombol void terlihat untuk cashier padahal backend owner+manager.
- **Sedang**: Kontradiksi driver DB (GORM MySQL) vs DSN (PostgreSQL) + query PG-only di satu repo dan backtick MySQL-only di repo lain.

---

## 2. Matriks Role → Endpoint (Backend)

Semua route terekam di `backend/internal/routes/routes.go:50-108`. Semua route (kecuali public) melewati `APIRateLimiter()` + `AuthMiddleware(db)`.

| Metode & Path | Handler | Role diizinkan (backend) |
|---|---|---|
| `POST /api/auth/login` | Auth.Login | **Public** |
| `POST /api/webhooks/xendit` | Webhook.HandleXenditWebhook | **Public** |
| `GET /api/health` | — | **Public** |
| `PUT /api/auth/profile` | Auth.UpdateProfile | **owner** |
| `POST /api/auth/change-password` | Auth.ChangePassword | **owner** |
| `POST /api/auth/logout` | Auth.Logout | semua (terauth) |
| `GET/POST /api/users`, `PUT/DELETE /api/users/:id` | Auth.* | **owner** |
| `GET /api/products` | Product.GetProducts | semua (terauth) |
| `POST/PUT/DELETE /api/products...`, `upload-image` | Product.* | **owner, manager** |
| `GET/POST /api/orders` | Order.* | semua (terauth) |
| `POST /api/orders/:id/void` | Order.VoidOrder | **owner, manager** |
| `GET /api/ingredients`, `GET /inventory/low-stock`, `GET /ingredients/:id/history` | Inventory.* | semua (terauth) |
| `POST/PUT/DELETE /api/ingredients`, `POST /inventory/mutation` | Inventory.* | **owner, manager** |
| `GET /api/dashboard/summary`, `/reports/profit-loss`, `/reports/sales-summary`, export CSV/PDF | Report.* | semua (terauth) |
| `GET /api/integrations/logs` | Webhook.GetWebhookLogs | semua (terauth) |
| `GET /api/settings` | Settings.GetSettings | semua (terauth) |
| `POST /api/settings`, `POST /api/settings/upload-logo` | Settings.* | **owner** |
| `GET/POST/PUT/DELETE /api/expenses`, `PUT /expenses/:id/cost-type` | Expense.* | GET semua; POST/PUT **owner, manager**; cost-type & DELETE **owner** |
| `GET /api/reports/bep` | BEP.GetBEP | **owner** |
| `GET/POST/PUT/DELETE /api/outlets...` | Outlet.* | **owner** |

Catatan: tidak ada halaman/UI outlet di frontend — modul outlet hanya ada di backend (owner).

---

## 3. Daftar Temuan & Prioritas

| # | Temuan | Severity | Status |
|---|---|---|---|
| A1 | Ganti password UI gagal: frontend `PUT` vs backend `POST` | Kritis | **FIXED** |
| A2 | OutletID tidak dipetakan di `user_repo` + `Register` tanpa outlet_id → multi-outlet mati | Kritis | **FIXED** (parsial, lihat catatan) |
| A3 | Cek blacklist token fail-open pada error repo | Tinggi | **FIXED** |
| A4 | Cek callback-token webhook fail-open (dilewati jika setting kosong/error) | Tinggi | **FIXED** |
| A5 | Cache dashboard global 30s tanpa key outlet → bocor antar-outlet | Sedang | **FIXED** |
| A6 | Tombol void tampil untuk cashier (UI) padahal backend owner+manager | Sedang | **FIXED** |
| A7 | `cleanup_dummy_test_data.sql` merujuk kolom tak ada (`orders.customer_email`, `orders.notes`) | Sedang | **FIXED** |
| A8 | Kontradiksi driver DB (MySQL) vs DSN (PostgreSQL) + query PG-only/MySQL-only | Tinggi (runtime) | **FIXED** — diseragamkan ke MySQL di semua lingkungan |
| A9 | `api.ts` tidak pernah kirim header `X-Outlet-ID`; tidak ada UI switch outlet | Sedang | Terbuka |
| A10 | Gate role frontend lebih longgar untuk beberapa menu (reports, integration, sales) | Rendah | Terbuka (UI lebih ketat = aman) |
| A11 | `InventoryUsecase.GetByID` tanpa outlet scoping → potensi baca lintas-outlet | Rendah | Terbuka |
| A12 | `SettingRepository.FindAll` global (tanpa outlet scoping) | Rendah | Terbuka (by design, branding) |
| A13 | Register binding `role oneof=owner...` — siapapun yang login bisa daftar role owner? | Perlu cek | Terbuka (route `/users` owner-gated, lihat catatan) |

---

## 4. Detail Temuan

### A1 — Ganti password UI selalu gagal (405/404)

Frontend `useChangePassword` memanggil `api.put('/auth/change-password', data)` (`web-dashboard/src/hooks/useAuth.ts:44`), tetapi backend mendaftarkan route `protected.POST("/auth/change-password", ...)` (`backend/internal/routes/routes.go:51`). Gin tidak punya fallback method → selalu 405. Fitur ganti password dari halaman Settings/Profile **tidak pernah bisa dipakai**.

**Perbaikan**: Ubah panggilan frontend menjadi `api.post(...)`. (Metode `PUT` tidak umum untuk ubah-password; konsisten dengan route backend yang sudah `POST`.)

### A2 — Multi-outlet dead code: OutletID tidak pernah dipersist/dibaca

- `backend/internal/repository/postgres/user_repo.go:73-90` — `toDomainUser` dan `toModelUser` **tidak** memetakan `OutletID`. Entity `entity.User.OutletID` selalu 0.
- `Register(name, email, pwd, role string)` (`auth_usecase.go:63`) tidak menerima outlet_id.
- `UpdateUser(id, name, email, role, pwd string)` (`auth_usecase.go:96`) tidak menerima outlet_id.
- `models.User.OutletID` (`models.go:31`, `gorm:"default:0"`) eksis di DB tapi tidak pernah ditulis melalui repo.
- Akibat: user baru selalu OutletID=0 (semua outlet), scope outlet tidak berfungsi, `X-Outlet-ID` header override owner tidak pernah terpakai dari UI (`api.ts` hanya kirim `Authorization`).
- `scopeOutlet` (`order_repo.go:183-188`) hanya memfilter jika `outletID[0] > 0` — dengan OutletID 0 semua data lintas-outlet terlihat.

**Perbaikan (parsial)**: Petakan `OutletID` di `toDomainUser`/`toModelUser`, tambahkan `outlet_id` pada `RegisterRequest`/`UpdateUserRequest`, dan teruskan ke usecase sehingga owner dapat menetapkan outlet saat membuat/mengedit user. Catatan: masih belum ada UI untuk memilih outlet (lihat A9).

### A3 — Blacklist token fail-open

`auth_middleware.go:34-43`: jika `IsTokenBlacklisted` mengembalikan error, kode **mengabaikan error dan melanjutkan** (komentar "assume token is valid"). Pada kegagalan DB, token yang sudah di-logout tetap diterima.

**Perbaikan**: Fail-closed — bila repo error, tolak permintaan dengan 500.

### A4 — Webhook callback-token fail-open

`webhook_usecase.go:48-53`: cek token hanya dilakukan jika `err == nil && expectedToken != nil && callbackToken != ""`. Jika setting `xendit_callback_token` belum dibuat **atau** header `X-Callback-Token` kosong, cek dilewati seluruhnya → webhook Xendit bisa dipalsukan tanpa token.

**Perbaikan**: Fail-closed — jika callback token header kosong → 401; jika setting tidak ditemukan → 500 (server miskonfigurasi); bandingkan token dengan ketat.

### A5 — Cache dashboard global (cross-outlet leak)

`report_usecase.go:19-23, 97-100`: `dashboardCache` adalah variabel package tunggal (`cacheTTL=30s`). Data dashboard outlet A bisa terkirim ke outlet B dalam jendela 30 detik karena tidak di-key oleh `outletID`.

**Perbaikan**: Simpan cache per-outlet (map keyed oleh outletID efektif, termasuk 0=all).

### A6 — Tombol void terlihat untuk cashier

`web-dashboard/src/pages/Sales.tsx:135-144`: tombol void ditampilkan tanpa cek role, tetapi backend `POST /orders/:id/void` = owner+manager. Cashier akan melihat tombol lalu mendapat 403.

**Perbaikan**: Gate tombol void dengan `user?.role === 'owner' || user?.role === 'manager'`.

### A7 — SQL dummy merujuk kolom yang tidak ada

`cleanup_dummy_test_data.sql:10`: `DELETE FROM orders WHERE customer_email = ... OR notes LIKE ...` — `orders` (models.go:78-91) tidak punya kolom `customer_email` maupun `notes`. Script gagal dijalankan di PostgreSQL.

**Perbaikan**: Hapus klausa yang merujuk kolom tak ada; ganti kriteria pakai kolom yang valid (`order_number`).

### A8 — Kontradiksi database driver vs DSN

- `database.go` membuka koneksi GORM dengan dialector **MySQL**, tapi DSN (`config.go:32`, `backend/.env`, `docker-compose.yml`) adalah **PostgreSQL** (`postgres:15-alpine`).
- `order_repo.go` memakai sintaks PG-only: `TO_CHAR(..., 'HH24:00')`, `DATE_TRUNC` (baris 106-127).
- `setting_repo.go:54,67` memakai backtick `` `key` `` (MySQL-only).
- Komit `3f93e7b` mengganti ke MySQL; `known-issues.md` menyebut VPS MariaDB.
- Tidak bisa diverifikasi runtime (server mati). **Perlu satu keputusan: produksi memakai PG atau MySQL/MariaDB?** Lalu selaraskan driver, DSN, dan query.

### A9 — Tidak ada mekanisme switch outlet di UI

Backend mendukung owner override via `X-Outlet-ID` (`auth_middleware.go:49-57`), tapi `api.ts` tidak pernah mengirim header itu dan tidak ada komponen pemilih outlet. Fitur multi-outlet tidak bisa dioperasikan dari UI meskipun backend siap.

### A10 — Gate role frontend vs backend

- `Sidebar.tsx`: `reports` = [owner], `integration` = [owner]; backend mengizinkan semua role terautentikasi → UI lebih ketat (arah aman).
- `sales` = [owner, manager]; void gate diperbaiki (A6).
- `DashboardHome`/`Reports` memanggil `/dashboard/summary`, `/reports/*` yang backend-nya semua role — konsisten dengan kebutuhan cashier di dashboard.

### A11 — Inventory GetByID tanpa scope outlet

`inventory_usecase.go` `GetByID(id)` tidak menerima outletID → pemanggilan by ID tidak memverifikasi kepemilikan outlet.

### A12 — Setting global

`setting_repo.go` `FindAll` tanpa filter outlet — cocok untuk branding global, berisiko bila ada setting per-outlet di masa depan.

### A13 — Register & role owner

`POST /api/users` (Register) hanya dapat diakses role **owner** (`routes.go:56`), jadi non-owner tidak bisa membuat akun owner. Aman. Namun `RegisterRequest.Role` masih mengizinkan pembuatan `owner` oleh owner lain — sesuai konfigurasi staf (valid secara desain).

---

## 5. Perbaikan yang Diterapkan

Perbaikan berikut sudah diterapkan pada sesi ini (lihat diffs di git):

| # | File | Perubahan |
|---|---|---|
| A1 | `web-dashboard/src/hooks/useAuth.ts` | `api.put` → `api.post` untuk `/auth/change-password` |
| A2 | `backend/internal/repository/postgres/user_repo.go` | `toDomainUser`/`toModelUser` memetakan `OutletID`; `Update` menulis `outlet_id` |
| A2 | `backend/internal/delivery/request/request.go` | `RegisterRequest.OutletID`, `UpdateUserRequest.OutletID` |
| A2 | `backend/internal/usecase/auth_usecase.go` | `Register(... outletID)`, `UpdateUser(... outletID)` meneruskan outlet |
| A2 | `backend/internal/delivery/handler/auth_handler.go` | teruskan `req.OutletID` |
| A3 | `backend/internal/delivery/middleware/auth_middleware.go` | blacklist check fail-closed (tolak 500 pada error) |
| A4 | `backend/internal/usecase/webhook_usecase.go` | callback-token check fail-closed |
| A5 | `backend/internal/usecase/report_usecase.go` | cache dashboard di-key per outlet |
| A6 | `web-dashboard/src/pages/Sales.tsx` | tombol void hanya untuk owner/manager |
| A7 | `cleanup_dummy_test_data.sql` | hapus referensi kolom tak ada |
| A8 | `backend/internal/config/config.go`, `backend/.env`, `server-start.sh` | DSN → MySQL (`root:password@tcp(localhost:3306)/singgah_pos?charset=utf8mb4&parseTime=True&loc=Local`) |
| A8 | `docker-compose.yml`, `docker-compose.prod.yml`, `.github/workflows/main.yml` | image DB → `mysql:8`; service CI → MySQL; health-check `mysqladmin ping` |
| A8 | `backend/internal/repository/postgres/order_repo.go` | `DATE_FORMAT(...)`/`DATE(...)` gantikan `TO_CHAR`/`DATE_TRUNC`; arg format trend |
| A8 | `backend/internal/usecase/report_usecase.go` | format string MySQL (`%H:00`, `%d %b`) |
| A8 | `backend/go.mod` | `gorm.io/driver/postgres` dihapus (`go mod tidy`) |
| A8 | `README.md`, `PROJECT_STATUS.md`, `AGENT.md`, `STARTUP_GUIDE.md`, `start_everything.sh`, `start_all_services.sh`, `.env.example` | referensi DB → MySQL |

Verifikasi: `go build ./...` + `go vet ./...` + `go test ./...` di `backend/` lulus, dan `npx tsc --noEmit` di `web-dashboard/` lulus (0 error). Query raw trend & daily-sales divalidasi langsung terhadap MariaDB lokal (hasil agregasi & ordering benar).

---

## 6. Rekomendasi Lanjutan

### Perlu keputusan segera (A8)
1. ~~Pilih satu database produksi: **PostgreSQL** (DSN aktif) atau **MySQL/MariaDB** (driver GORM aktif).~~ **Diputuskan: MySQL 8** (dipakai VPS/webhosting & kompatibel dengan localhost MariaDB). Semua DSN, docker-compose, query, dan CI sudah diseragamkan ke MySQL. Lihat catatan verifikasi di bawah.
2. ~~Sesuaikan: dialector di `database.go`, DSN di `config.go`/`.env`/`docker-compose.yml`, dan query di `order_repo.go` (PG-only) vs `setting_repo.go` (backtick MySQL).~~ **Selesai** — backtick di `setting_repo.go` dipertahankan karena `key` adalah reserved word MySQL.
3. ~~Konsistenkan `server-start.sh` dengan keputusan tersebut.~~ **Selesai** — `server-start.sh` kini deprecated (meneruskan ke `backend/.env` + hardening GOMAXPROCS/GOMEMLIMIT). Script start resmi: `backend/start.sh`.

### Disarankan (A9, A11, A12)
4. Tambah halaman/komponen manajemen outlet + switch outlet di UI; kirim `X-Outlet-ID` dari `api.ts` saat owner memilih outlet.
5. Scope `InventoryUsecase.GetByID` dengan outletID (terima variadic, filter di repo).
6. Tentukan kebijakan setting: global branding (tetap) atau per-outlet (tambah filter `outlet_id`).

### Proses
7. Setelah keputusan DB, jalankan backend & migrasi, lalu smoke-test: login → CRUD produk → buat order → void → ganti password → webhook.
8. Hapus file `cleanup_dummy_test_data.sql`/`insert_dummy_test_data.sql` dari git bila tidak lagi dibutuhkan (kolom `orders` sudah dicek).

### Catatan verifikasi
9. Backend belum bisa dijalankan (port 8080 mati) — verifikasi dilakukan via `go build` statis, bukan smoke-test live.
10. Crash "orders.filter is not a function" sudah diperbaiki di sesi sebelumnya (`useOrders.ts` + `vite.config.ts`) — jangan di-rollback.
