# 🤖 AGENT.MD — Singgah Coffee POS System
## Protokol Wajib AI Agent untuk Seluruh Proses Pengembangan

> **"Efficiency is the goal, but Integrity is the foundation."**

---

## 📌 IDENTITAS PROYEK

```yaml
project_name: Singgah Coffee POS System
version: 2.0.0
status: Stable / Active Development (Phase 3)
workspace: /Volumes/WORK/PROJECT PROTOTYPE/SISTEM MOKA POS SINGGAH COFFEE/

stack:
  backend:
    language: Go (Golang) 1.25
    framework: Gin v1.9.1
    orm: GORM v1.31.1
    database: PostgreSQL 15 (Dockerized)
    auth: JWT (golang-jwt/jwt v5)
    payment: Xendit SDK v3.7.0
    build_system: Bazel
    test_framework: pytest (Go equivalent: go test)

  web_dashboard:
    framework: React 18 + TypeScript 5.3
    build: Vite 5
    styling: Tailwind CSS 3.4
    state: Zustand + TanStack Query v5
    charts: Recharts 2.10
    icons: Lucide React

services:
  backend_api:  http://localhost:8080
  web_dashboard: http://localhost:3000
  database:     localhost:5432

roles: [owner, manager, cashier]
```

---

## 🔒 SECURITY GOVERNANCE (WAJIB SELALU AKTIF)

> Berlaku di **SETIAP** sesi kerja, tanpa pengecualian.

### 1. DATA SECURITY PROTOCOL
- ❌ **JANGAN PERNAH** meminta, mencetak, atau memproses data mentah sensitif:
  - JWT Secret, API Keys (Xendit, Midtrans), Password database
  - Data pribadi pelanggan atau karyawan
- ✅ Jika user mencoba memasukkan data sensitif → berikan peringatan dan tolak
- ✅ Selalu gunakan variabel environment (`backend/.env`) untuk secrets
- ✅ File `.env` TIDAK BOLEH di-commit ke Git (sudah ada di `.gitignore`)

### 2. QA MANDATE — WAJIB DI SETIAP OUTPUT KODE
Setiap kode yang dihasilkan WAJIB menyertakan:
```
// ⚠️ Vetted by SOSIOMEN - Manual Review Required by Senior Engineer/Manager
```
Dan wajib menyertakan salah satu dari:
- **Risk Assessment** — apa risiko dari kode ini
- **Technical Assumptions** — asumsi apa yang digunakan

### 3. ZERO TRUST SECURITY
- Selalu terapkan **RBAC** (Role-Based Access Control) untuk endpoint sensitif
- Role hierarchy: `owner > manager > cashier`
- Endpoint yang membutuhkan proteksi:
  - Cost/HPP data → hanya `owner` dan `manager`
  - Void order → hanya `owner` dan `manager`
  - Settings → hanya `owner`
  - Reports P&L → hanya `owner`

---

## ⚙️ 8 PERINTAH WORKFLOW WAJIB

Delapan perintah ini adalah **protokol mutlak** yang harus dijalankan sesuai konteks pekerjaan. AI Agent WAJIB mengidentifikasi perintah mana yang relevan sebelum memulai pekerjaan.

---

### 📋 PERINTAH 1 — BUILD FROM SCRATCH / FITUR BARU

**Kapan digunakan**: Saat diminta membuat fitur baru, modul baru, atau komponen baru dari awal.

**Checklist Wajib:**

#### ☐ A. Arsitektur
- Tentukan layer mana yang terdampak: Backend / Frontend / Mobile / Semua
- Gambarkan alur data: Client → Handler → UseCase → Repository → DB

#### ☐ B. Struktur File
Ikuti pola yang sudah ada:
```
backend/internal/
├── models/         → Tambah struct model baru di models.go
├── repository/     → Tambah interface + implementasi repository
├── usecase/        → Tambah business logic
├── delivery/
│   ├── handler/    → Tambah HTTP handler
│   └── request/    → Tambah request DTO
└── routes/         → Register route baru

web-dashboard/src/
├── types/          → Tambah TypeScript type sesuai model Go
├── services/       → Tambah fungsi API call
├── hooks/          → Tambah custom hook jika perlu
├── components/     → Tambah reusable component
└── pages/          → Tambah page jika diperlukan
```

#### ☐ C. Skema Database
- Tambah model di `backend/internal/models/models.go`
- GORM Auto-Migration akan menangani pembuatan tabel
- Pastikan ada index pada foreign key dan kolom yang sering di-query
- Semua model WAJIB embed `BaseModel` (bukan `gorm.Model`)

#### ☐ D. API Endpoints
Format dokumentasi endpoint WAJIB:
```
METHOD /api/[resource]/[action]
Auth: Bearer JWT
Role: [owner | manager | cashier | public]
Request: { field: type }
Response: { field: type }
Error: { code, message }
```

#### ☐ E. UI Architecture
- Komponen WAJIB memiliki: loading state, error state, empty state
- Gunakan TanStack Query untuk data fetching (bukan fetch/axios langsung di component)
- Gunakan Zustand untuk client state (auth, settings)

#### ☐ F. Kode Lengkap
- Backend: Go (Gin + GORM)
- Frontend: React + TypeScript + Tailwind
- Semua kode WAJIB ada komentar `// Vetted by SOSIOMEN - Manual Review Required`

---

### 🔍 PERINTAH 2 — REFACTOR CODEBASE

**Kapan digunakan**: Saat diminta memperbaiki, membersihkan, atau merestrukturisasi kode yang sudah ada.

**Aturan Wajib:**
- ✅ Fungsi/behavior TIDAK BOLEH berubah
- ✅ API contract (endpoint URL, request/response shape) TIDAK BOLEH berubah
- ✅ Database schema TIDAK BOLEH berubah tanpa migrasi eksplisit

**Checklist Wajib:**

#### ☐ A. Ringkasan Arsitektur
Jelaskan arsitektur yang ada sebelum refactor.

#### ☐ B. Area Masalah
Identifikasi dari daftar ini:
```
KNOWN ISSUES (per analisis 2026-05-31):
├── Settings.tsx         → 54KB — TERLALU BESAR, perlu dipecah
├── ProductManagement.tsx → 38KB — Borderline, perlu sub-components
├── Reports.tsx          → 26KB — Perlu review
├── models/ vs domain/   → Duplikasi, perlu konsolidasi
└── Tidak ada unit tests → Regresi risk tinggi
```

#### ☐ C. Strategi Refactoring
Gunakan pola Clean Architecture:
```
Settings.tsx (54KB) → Settings/
  ├── ProfileSettings.tsx      (store name, logo, address)
  ├── TaxSettings.tsx          (pajak, service charge)
  ├── PrinterSettings.tsx      (thermal printer config)
  └── IntegrationSettings.tsx  (Xendit, webhook)
```

#### ☐ D. Kode yang Sudah Diperbaiki
- Tampilkan diff yang jelas (sebelum vs sesudah)
- Pastikan tidak ada breaking changes

---

### 🐛 PERINTAH 3 — DEBUGGING ENGINEER

**Kapan digunakan**: Saat ada bug, error, atau perilaku tidak diharapkan.

**Checklist Wajib:**

#### ☐ A. Fungsionalitas Kode
Jelaskan apa yang seharusnya dilakukan kode tersebut.

#### ☐ B. Identifikasi Masalah
- Apa output actual vs output expected?
- Di layer mana bug terjadi? (Frontend / Backend / DB / Network)

#### ☐ C. Analisis Akar Masalah (Root Cause)
Gunakan metodologi **5 Whys** atau **Chain of Thought** secara internal.

#### ☐ D. Known Edge Cases di Proyek Ini
```
CRITICAL EDGE CASES:
├── Stock Deduction Race Condition
│   Problem: Concurrent orders bisa menyebabkan stock negatif
│   Fix: SELECT ... FOR UPDATE dalam database transaction
│
├── JWT Tidak Di-Revoke saat Logout
│   Problem: Token lama masih valid setelah logout
│   Fix: Implementasi token blacklist (Redis atau DB)
│
├── Xendit Webhook Duplikasi
│   Problem: Webhook bisa dikirim >1x untuk satu payment
│   Fix: ProcessedWebhook table sudah ada — cek idempotency
│
└── Float Precision untuk IDR
    Problem: float64 bisa menyebabkan selisih 1-2 rupiah
    Fix: Gunakan integer (sen) untuk kalkulasi internal
```

#### ☐ E. Kode Siap Produksi
- Sertakan error handling yang proper
- Sertakan logging yang informatif
- Tambahkan comment `// Vetted by SOSIOMEN - Manual Review Required`

---

### 🏗️ PERINTAH 4 — SYSTEM DESIGN + IMPLEMENTASI

**Kapan digunakan**: Saat merancang sistem atau fitur yang kompleks sebelum implementasi.

**Checklist Wajib:**

#### ☐ A. Arsitektur (Diagram Wajib)
```
Format minimal:
Client → [Auth Layer] → Handler → UseCase → Repository → PostgreSQL
```

#### ☐ B. Struktur Komponen
Dokumentasikan setiap komponen baru:
- **Nama komponen**
- **Tanggung jawab** (single responsibility)
- **Dependencies**

#### ☐ C. Alur Data
Trace lengkap dari trigger user sampai data tersimpan:
```
1. User action (klik tombol)
2. Frontend validation
3. HTTP Request (method, endpoint, body)
4. Auth middleware check
5. Handler validation
6. UseCase business logic
7. Repository query (SQL yang dihasilkan)
8. Response ke client
9. Frontend state update
```

#### ☐ D. Desain API
Ikuti format REST yang konsisten:
```
Koleksi:    GET  /api/resources
Satu item:  GET  /api/resources/:id
Buat:       POST /api/resources
Update:     PUT  /api/resources/:id
Hapus:      DELETE /api/resources/:id
Action:     POST /api/resources/:id/[action]
```

#### ☐ E. Skema Database
Gunakan format:
```sql
-- Vetted by SOSIOMEN - Manual Review Required by Senior Engineer/Manager
CREATE TABLE [nama_tabel] (
    id          BIGSERIAL PRIMARY KEY,
    -- fields...
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at  TIMESTAMP WITH TIME ZONE  -- soft delete
);
CREATE INDEX idx_[tabel]_[kolom] ON [tabel] ([kolom]);
```

#### ☐ F. Strategi Caching
```
Hierarchy caching proyek ini:
├── TanStack Query (Frontend)
│   └── staleTime: 30s untuk data produk/menu
│   └── staleTime: 5s untuk orders/transaksi
├── Rencana: Redis (Backend)
│   └── Laporan harian: TTL 5 menit
│   └── Settings: TTL 1 jam (invalidate saat update)
└── DB Query Optimization
    └── Gunakan Preload() untuk avoid N+1
    └── Tambah LIMIT/OFFSET untuk semua list endpoint
```

---

### ⚡ PERINTAH 5 — PERFORMANCE OPTIMIZATION

**Kapan digunakan**: Saat ada keluhan performa, loading lambat, atau memory tinggi.

**Checklist Wajib:**

#### ☐ A. Known Performance Issues
```
BACKEND:
├── N+1 Query di order list (Preload belum konsisten)
├── Tidak ada pagination di GET /api/products
├── Tidak ada pagination di GET /api/ingredients
└── Report queries scan full table tanpa date range index

FRONTEND:
├── Settings.tsx (54KB) tidak ada code splitting
├── Tidak ada React.memo pada list komponen berat
├── Tidak ada virtualisasi untuk list panjang
└── Image belum dioptimasi (WebP conversion)

```

#### ☐ B. Strategi Optimasi Backend (Go)
```go
// ⚠️ Vetted by SOSIOMEN - Manual Review Required by Senior Engineer/Manager

// BEFORE: N+1 problem
db.Find(&orders)
for _, o := range orders { db.Find(&o.Items) }

// AFTER: Eager loading + Pagination
db.Preload("OrderItems.Product").
   Preload("User").
   Where("created_at BETWEEN ? AND ?", from, to).
   Limit(pageSize).
   Offset((page - 1) * pageSize).
   Order("created_at DESC").
   Find(&orders)
```

#### ☐ C. Strategi Optimasi Frontend (React)
```tsx
// ⚠️ Vetted by SOSIOMEN - Manual Review Required by Senior Engineer/Manager

// Lazy loading untuk halaman berat
const Settings = lazy(() => import('./pages/Settings/index'));
const Reports = lazy(() => import('./pages/Reports'));

// Memoize expensive components
const ProductCard = React.memo(({ product }) => { ... });

// TanStack Query dengan stale time yang tepat
useQuery({
  queryKey: ['products'],
  queryFn: fetchProducts,
  staleTime: 30 * 1000, // 30 detik
  gcTime: 5 * 60 * 1000, // 5 menit
})
```

#### ☐ D. Output Wajib
- Sebelum/sesudah benchmark (jika bisa diukur)
- Estimasi improvement (misal: "query turun dari 50ms ke 5ms")

---

### 🏛️ PERINTAH 6 — CLEAN ARCHITECTURE

**Kapan digunakan**: Saat membangun ulang, refactor besar, atau menambah modul dengan arsitektur bersih.

**Arsitektur Wajib Proyek Ini:**

#### Backend — Go Clean Architecture
```
backend/internal/
├── domain/              ← CORE: Interface & Entity (tidak depend pada siapapun)
│   ├── entities.go      ← Business entities (bukan GORM models)
│   └── interfaces.go    ← Repository & UseCase interfaces
│
├── usecase/             ← APPLICATION: Business rules
│   └── [nama]_usecase.go
│
├── repository/          ← INFRASTRUCTURE: Data access
│   └── [nama]_repo.go   ← Implements domain interfaces
│
├── delivery/            ← INTERFACE: HTTP, gRPC, etc.
│   ├── handler/
│   ├── middleware/
│   └── request/
│
└── models/              ← GORM models (terpisah dari domain entities)
```

**Aturan Dependency:**
```
delivery → usecase → domain ← repository
         (domain tidak boleh import layer lain)
```

#### Frontend — Component Architecture
```
web-dashboard/src/
├── core/
│   ├── types/           ← Domain types (TypeScript interfaces)
│   └── constants/       ← App constants (roles, categories)
│
├── data/
│   ├── services/        ← API calls (axios wrappers)
│   └── hooks/           ← useQuery/useMutation hooks
│
├── presentation/
│   ├── components/
│   │   ├── ui/          ← Generic: Button, Input, Modal, Table
│   │   ├── layout/      ← Sidebar, Header, Layout
│   │   └── features/    ← Domain-specific: ProductCard, OrderRow
│   └── pages/           ← Smart containers (compose components)
│
└── store/               ← Zustand stores (auth, settings)
```

#### ☐ Checklist Clean Architecture
- [ ] Setiap file punya satu tanggung jawab
- [ ] Tidak ada business logic di handler/page
- [ ] Tidak ada direct DB call di handler
- [ ] TypeScript types selaras dengan Go structs
- [ ] Tidak ada `any` type di TypeScript

---

### 🤖 PERINTAH 7 — MULTI-AGENT WORKFLOW

**Kapan digunakan**: Untuk keputusan arsitektur besar, atau review fitur kompleks.

**4 Perspektif Wajib yang Harus Dipertimbangkan:**

#### 🏛️ Architect Agent
> Pertanyaan: *"Apakah desain ini skalabel? Apakah selaras dengan arsitektur yang sudah ada?"*
- Review: Apakah layer boundaries terjaga?
- Review: Apakah ada circular dependency?
- Review: Apakah bisa di-extend tanpa breaking changes?

#### ⚙️ Engineer Agent
> Pertanyaan: *"Apakah ini implementable? Berapa technical debt-nya?"*
- Review: Apakah ada library yang sudah tersedia?
- Review: Estimasi waktu implementasi
- Review: Risiko implementasi

#### 🔍 Reviewer Agent
> Pertanyaan: *"Apakah ini aman? Apakah ada bug yang jelas?"*
- Review: Security vulnerabilities
- Review: Error handling coverage
- Review: Edge cases yang belum ditangani

#### ⚡ Optimizer Agent
> Pertanyaan: *"Apakah ini efisien? Apakah bisa lebih cepat/hemat?"*
- Review: Query efficiency
- Review: Memory usage
- Review: Bundle size impact

**Format Output Multi-Agent:**
```markdown
### 🏛️ Architect: [Keputusan/Rekomendasi]
### ⚙️ Engineer: [Implementasi/Estimasi]
### 🔍 Reviewer: [Risiko/Issues]
### ⚡ Optimizer: [Optimasi yang Direkomendasikan]
### 📋 Final Decision: [Kesimpulan + Aksi]
```

---

### 🎨 PERINTAH 8 — UI COMPONENT PRODUCTION-LEVEL

**Kapan digunakan**: Saat membuat atau memperbaiki komponen UI.

**Standar Wajib Semua Komponen:**

#### ☐ A. Arsitektur Komponen
```tsx
// ⚠️ Vetted by SOSIOMEN - Manual Review Required by Senior Engineer/Manager
// Struktur komponen standar:
interface [ComponentName]Props {
  // Props yang jelas dan terdokumentasi
  data: DataType;
  isLoading?: boolean;     // Loading state
  onAction?: () => void;   // Event handlers
  className?: string;      // Extensibility
}

export const [ComponentName] = ({ data, isLoading, onAction }: [ComponentName]Props) => {
  // 1. Loading state
  if (isLoading) return <SkeletonLoader />;
  
  // 2. Empty state
  if (!data || data.length === 0) return <EmptyState message="..." />;
  
  // 3. Main render
  return (/* ... */);
};
```

#### ☐ B. States yang WAJIB Ada
```
Setiap komponen data-display WAJIB handle:
├── Loading state    → Skeleton (bukan spinner) untuk list
├── Error state      → Error message + retry button
├── Empty state      → Pesan informatif (bukan blank)
└── Success state    → Data normal
```

#### ☐ C. Aksesibilitas (WCAG 2.1)
```
WAJIB untuk semua komponen:
├── Semantic HTML (button, table, form, nav)
├── ARIA labels untuk ikon tanpa teks
├── Focus visible (tab navigation)
├── Color contrast minimum 4.5:1
└── Error messages terhubung ke input (aria-describedby)
```

#### ☐ D. Responsive Design
```
Breakpoints Tailwind yang digunakan:
├── Default (mobile-first): < 640px
├── sm:  640px  → Tablet portrait
├── md:  768px  → Tablet landscape
├── lg:  1024px → Desktop
└── xl:  1280px → Large desktop

Aturan:
├── Table → Stack menjadi cards di mobile
├── Grid 4 kolom → 2 kolom di md → 1 kolom di sm
└── Sidebar → Hidden di mobile (hamburger menu)
```

#### ☐ E. Komponen Reusable yang Perlu Dibangun
```
PRIORITAS TINGGI (belum ada):
├── <DataTable>      → Table universal dengan sort, filter, pagination
├── <ConfirmDialog>  → Modal konfirmasi (ganti browser confirm())
├── <StatusBadge>    → Badge status unified (low_stock, active, voided)
├── <PageHeader>     → Header halaman dengan title + actions
└── <SkeletonLoader> → Loading skeleton generic
```

---

## 🗺️ ROADMAP & PRIORITAS PENGEMBANGAN

### 🔴 P0 — CRITICAL (Harus diselesaikan segera)
```
1. Race Condition Fix
   File: backend/internal/usecase/order_usecase.go
   Status: ✅ SELESAI (1 Juni 2026) - Fixed using SELECT FOR UPDATE

2. Settings.tsx Refactor  
   File: web-dashboard/src/pages/Settings.tsx (Now split into sub-components)
   Status: ✅ SELESAI (1 Juni 2026) - Broken down into 8 sub-components for better maintainability.
```
3. JWT Token Revocation
   Issue: Logout tidak invalidate token
   Fix: Token blacklist di DB atau Redis
```

### 🟠 P1 — HIGH (Sprint berikutnya)
```
4. P&L Real-Time Engine
   API: GET /api/reports/pl?from=&to=
   Kalkulasi: Revenue - COGS (dari recipe) - Expenses = Net Profit

5. Redis Cache Layer
   Cache: Daily reports (TTL 5 menit), Settings (TTL 1 jam)
   Invalidate: Saat ada order baru, void, atau settings update

6. Xendit QRIS Aktif
   File: backend/internal/delivery/handler/webhook_handler.go
   Status: Sudah ada tapi belum aktif
```

### 🟡 P2 — MEDIUM (Backlog)
```
7. Unit Test Suite (Backend Go)
   Target: InventoryService, OrderUseCase, ReportUseCase
   Framework: go test

8. Product Image Upload
   API: POST /api/products/:id/image
   Storage: backend/uploads/ (sudah ada folder)

9. DataTable Component
   Gantikan semua table manual di setiap halaman
```

### 🟢 P3 — LOW (Nice to Have)
```
10. Bluetooth Printer (ESC/POS)
11. Recipe Versioning
12. Supplier Management
13. Multi-location Support
```

---

## 📐 CODING STANDARDS WAJIB

### Go (Backend)
```go
// Vetted by SOSIOMEN - Manual Review Required by Senior Engineer/Manager

// 1. Error handling: SELALU return error, jangan silent fail
func (uc *orderUseCase) CreateOrder(ctx context.Context, req CreateOrderRequest) (*Order, error) {
    // Validasi terlebih dahulu
    if len(req.Items) == 0 {
        return nil, errors.New("order must have at least one item")
    }
    // ... implementasi
}

// 2. Repository pattern: Selalu gunakan interface
type OrderRepository interface {
    Create(ctx context.Context, order *models.Order) error
    FindByID(ctx context.Context, id uint) (*models.Order, error)
}

// 3. Context propagation: Selalu pass context
func (r *orderRepo) FindByID(ctx context.Context, id uint) (*models.Order, error) {
    var order models.Order
    return &order, r.db.WithContext(ctx).
        Preload("OrderItems.Product").
        First(&order, id).Error
}

// 4. HTTP Response format: Konsisten
func respondSuccess(c *gin.Context, data interface{}) {
    c.JSON(http.StatusOK, gin.H{"success": true, "data": data})
}
func respondError(c *gin.Context, status int, message string) {
    c.JSON(status, gin.H{"success": false, "error": message})
}
```

### TypeScript (Frontend)
```typescript
// ⚠️ Vetted by SOSIOMEN - Manual Review Required by Senior Engineer/Manager

// 1. Type safety: TIDAK BOLEH ada 'any'
// SALAH:  const data: any = await fetchProducts()
// BENAR:  const data: Product[] = await fetchProducts()

// 2. API calls: Selalu di services/, bukan di component
// services/productService.ts
export const fetchProducts = async (): Promise<Product[]> => {
  const { data } = await api.get<{ data: Product[] }>('/api/products');
  return data.data;
};

// 3. Custom hooks: Wrap TanStack Query
// hooks/useProducts.ts
export const useProducts = () => useQuery({
  queryKey: ['products'],
  queryFn: fetchProducts,
  staleTime: 30_000,
});

// 4. Error boundaries: Setiap route wajib ada error boundary
// 5. Loading states: Skeleton, bukan spinner untuk list
```

---

## 🚦 CHECKLIST SEBELUM COMMIT

Jalankan checklist ini sebelum setiap pekerjaan selesai:

```markdown
## Pre-Commit Checklist

### Security
- [ ] Tidak ada secret/credentials di kode
- [ ] RBAC diterapkan untuk endpoint baru
- [ ] Input validation ada di backend (bukan hanya frontend)

### Code Quality  
- [ ] Tidak ada `any` type di TypeScript
- [ ] Error handling tersedia di semua path
- [ ] Comment "Vetted by SOSIOMEN" ada di kode yang dihasilkan AI

### Architecture
- [ ] Tidak ada business logic di handler/page component
- [ ] Repository interface digunakan (bukan direct DB di usecase)
- [ ] Komponen baru: ada loading + error + empty state

### Database
- [ ] Tidak ada raw SQL tanpa parameterized query (SQL injection prevention)
- [ ] Index sudah ditambahkan untuk kolom yang di-query
- [ ] Transaction digunakan untuk operasi multi-step

### Testing
- [ ] Endpoint baru sudah ditest manual via Postman/curl
- [ ] Edge cases sudah dipertimbangkan

### Documentation
- [ ] README diupdate jika ada endpoint baru
- [ ] IMPLEMENTATION_SUMMARY diupdate
```

---

## 📊 ARSITEKTUR DATABASE LENGKAP

```sql
-- Vetted by SOSIOMEN - Manual Review Required by Senior Engineer/Manager
-- Schema As-Built (Auto-migrated via GORM)

users           → id, name, email, password(hashed), role, created_at
products        → id, name, category, price, cost, stock, sku, image_url
ingredients     → id, name, unit, current_stock, min_stock, cost_per_unit
recipe_items    → id, product_id(FK), ingredient_id(FK), quantity
orders          → id, order_number(unique), total, payment_method, status, user_id
order_items     → id, order_id(FK), product_id(FK), quantity, price, cost
stock_mutations → id, ingredient_id(FK), type(IN/OUT/ADJ), quantity, reference_id
purchase_orders → id, po_number(unique), supplier, status, total_cost
expenses        → id, title, amount, category, date, description
settings        → id, key(unique), value, setting_group
webhooks        → id, webhook_id(unique), status  ← Idempotency guard

Indexes Wajib:
- orders.created_at (untuk date-range queries laporan)
- order_items.order_id (untuk JOIN)
- stock_mutations.ingredient_id (untuk stock history)
- ingredients.current_stock (untuk low-stock alert)
```

---

## 🔗 FILE REFERENSI PENTING

| File | Tujuan |
|------|--------|
| [backend/internal/models/models.go](./backend/internal/models/models.go) | Semua GORM models |
| [backend/internal/routes/](./backend/internal/routes/) | Route registration |
| [web-dashboard/src/App.tsx](./web-dashboard/src/App.tsx) | Route frontend |
| [web-dashboard/src/services/](./web-dashboard/src/services/) | API call layer |
| [docker-compose.yml](./docker-compose.yml) | Service orchestration |
| [backend/.env](./backend/.env) | **SECRET** — jangan commit! |
| [PROJECT_STATUS.md](./PROJECT_STATUS.md) | Status terkini |
| [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) | Detail implementasi |

---

## ⚠️ RISK ASSESSMENT — SISTEM AKTIF

```
RISIKO TINGGI:
├── Race condition stock deduction (concurrent orders)
│   Probabilitas: Medium | Dampak: Data corruption
│   Status: BELUM DIPERBAIKI ← Prioritas P0
│
└── JWT tidak di-revoke
    Probabilitas: Low | Dampak: Unauthorized access
    Status: BELUM DIPERBAIKI ← Prioritas P1

RISIKO MEDIUM:
├── Settings.tsx 54KB — crash risk saat modifikasi
├── Tidak ada unit test — regresi tidak terdeteksi otomatis
└── Xendit webhook belum aktif — payment integration belum production-ready

RISIKO RENDAH:
├── Float64 untuk kalkulasi IDR (kemungkinan selisih Rp 1-2)
└── Rate limiting diterapkan untuk semua endpoint API (100 requests/menit per IP) - Masalah DoS teratasi
```

---

*AGENT.md ini adalah konstitusi pengembangan Singgah Coffee POS System.*  
*Setiap AI Agent yang bekerja pada proyek ini WAJIB membaca dan mematuhi seluruh isi dokumen ini.*  
*Diperbarui: 2026-05-31 | Versi: 1.0.0*

---

**⚠️ Vetted by SOSIOMEN - Manual Review Required by Senior Engineer/Manager**
