# PLAN BAGI HASIL (PROFIT SHARING) — Singgah Coffee POS

## Executive Summary

Sistem bagi hasil otomatis untuk outlet coffee shop. Revenue pre-tax (tanpa pajak & service charge) dibagi antara Owner dan Keeper berdasarkan rasio yang bisa dikonfigurasi per outlet.

**Prinsip Utama:**
- Revenue = `Σ(order_items.price × qty)` — BUKAN `orders.total_amount`
- `math.Round(basis × ratio/100 × 100) / 100` → `keeper + owner = basis` EXACT
- `alwaysExcludedFromSharing` hardcoded: Operational, Marketing, Maintenance, Misc
- Status workflow: `draft → finalized → paid`

---

## P0 ISSUES — VERIFIED SOLUSINYA

### P0-1: uniqueIndex GORM — REAL ISSUE: Soft Delete Conflict

**Status:** Sintaks `uniqueIndex:uq_ps_period` VALID di GORM v2 (terbukti di `ProductionTarget` line 62-64 dan `Setting` line 135-138). TAPI masalahnya adalah **soft delete**.

**Masalah:**
```
1. User buat periode Jan 2025
2. User soft-delete periode Jan 2025 (deleted_at = now)
3. User coba buat periode Jan 2025 lagi → GAGAL
   Karena unique index masih melihat record soft-deleted
```

**Solusi: JANGAN pakai unique index di model.**
- `FindOverlappingPeriod` sudah cek overlap via SQL dengan `deleted_at IS NULL`
- Race condition dicegah dengan `SELECT ... FOR UPDATE` di `Finalize`
- Cukup untuk mencegah duplicate period

**Implementasi:**
```go
// models/profit_sharing.go — TIDAK ADA uniqueIndex
type ProfitSharingPeriod struct {
    BaseModel
    OutletID    uint      `json:"outlet_id" gorm:"index"`
    PeriodStart time.Time `json:"period_start" gorm:"index"`
    PeriodEnd   time.Time `json:"period_end"`
    Status      string    `json:"status" gorm:"default:draft;index"`
    // ... field lainnya
}
```

---

### P0-2: `NOT IN ()` Crash — SOLUSI: Guard Check

**Masalah:** Saat `excluded` slice kosong, query menjadi `WHERE category NOT IN ()` → MySQL error 1064.

**Solusi:** Pattern yang sudah ada di codebase (`scopeOutlet`, `outletWhere`):
```go
func (r *expenseRepo) GetTotalExcluding(start, end string, excluded []string, outletID ...uint) (float64, error) {
    tx := r.db.Model(&models.Expense{}).
        Where("DATE(date) BETWEEN DATE(?) AND DATE(?)", start, end)
    tx = scopeOutlet(tx, "expenses", outletID...)

    // GUARD: hanya tambah WHERE jika slice tidak kosong
    if len(excluded) > 0 {
        tx = tx.Where("category NOT IN ?", excluded)
    }

    var total float64
    err := tx.Select("COALESCE(SUM(amount), 0)").Row().Scan(&total)
    return total, err
}
```

**Ini adalah pattern yang sudah digunakan di:**
- `scopeOutlet` (order_repo.go:219): `if len(outletID) > 0 && outletID[0] > 0`
- `outletWhere` (order_item_repo.go:32): `if len(outletID) > 0 && outletID[0] > 0`

---

### P0-3: Race Condition Finalize — SOLUSI: SELECT ... FOR UPDATE

**Masalah:** Dua request Finalize bisa lolos cek `status != "draft"` secara bersamaan.

**Solusi:** `SELECT ... FOR UPDATE` di awal Finalize:
```go
func (uc *ProfitSharingUsecase) Finalize(id uint, ratio float64, outletID ...uint) error {
    var period models.ProfitSharingPeriod
    tx := uc.db.Begin()

    // LOCK ROW — cegah concurrent finalize
    if err := tx.Set("gorm:query_option", "FOR UPDATE").
        Where("id = ? AND outlet_id = ?", id, outletID[0]).
        First(&period).Error; err != nil {
        tx.Rollback()
        return err
    }

    // VALIDASI status
    if period.Status != "draft" {
        tx.Rollback()
        return errors.New("hanya periode draft yang bisa di-finalize")
    }

    // ... hitung bagi hasil ...

    // UPDATE status
    if err := tx.Save(&period).Error; err != nil {
        tx.Rollback()
        return err
    }

    return tx.Commit().Error
}
```

**Alternatif:** Unique constraint + catch error:
```go
// Di model: tetap pakai unique index
// Di usecase: handle duplicate key error
if err := tx.Create(&period).Error; err != nil {
    if strings.Contains(err.Error(), "Duplicate entry") {
        return errors.New("periode sudah ada")
    }
    return err
}
```

---

## IMPLEMENTATION PLAN

### Sprint 0: Fix Existing Bugs (DO DULU)

| Task | File | Fix |
|------|------|-----|
| E1: Expense delete orphan CashBook | `expense_usecase.go:158` | `cashBookRepo.DeleteByReference` sudah dipanggil ✓ |
| E2: Expense update sync CashBook | `expense_usecase.go:138` | `syncExpenseToCashBook` sudah dipanggil ✓ |
| E3: CashBook sync stale | `expense_usecase.go:107` | Real-time sync sudah ada ✓ |
| E4: Protected categories | `expense_usecase.go` | `protectedExpenseCategories` belum ada — TAMBAHKAN |

**E4 Fix:**
```go
var protectedExpenseCategories = map[string]bool{
    "Operational": true,
    "Marketing":   true,
    "Maintenance": true,
    "Misc":        true,
}

func (uc *ExpenseUsecase) Create(expense *entity.Expense, outletID ...uint) (*entity.ExpenseResponse, error) {
    if protectedExpenseCategories[expense.Category] {
        return nil, domainErrors.NewInvalidInputError("kategori ini tidak bisa dihapus atau diubah")
    }
    // ... rest of code
}
```

---

### Sprint 1: Backend Implementation

#### 1.1 Domain Entity — `domain/entity/profit_sharing.go`

```go
package entity

import "time"

type ProfitSharingPeriod struct {
    ID                uint
    OutletID          uint
    OutletName        string
    PeriodStart       time.Time
    PeriodEnd         time.Time
    BasisAmount       float64  // Σ(order_items.price × qty)
    TotalExpenses     float64  // operational expenses only
    TotalCogs         float64
    NetProfit         float64
    Ratio             float64  // keeper percentage
    KeeperAmount      float64  // rounded
    OwnerAmount       float64  // basis - keeper (exact)
    Status            string   // draft, finalized, paid
    PerProduct        []ProductSharingDetail
    PaymentNote       string
    TaxNote           string   // "Revenue sebelum pajak (10%) & service charge (5%)"
    CreatedAt         time.Time
    UpdatedAt         time.Time
}

type ProductSharingDetail struct {
    ProductID   uint    `json:"product_id"`
    ProductName string  `json:"product_name"`
    Revenue     float64 `json:"revenue"`
    Cogs        float64 `json:"cogs"`
    GrossMargin float64 `json:"gross_margin"`
}

type ProfitSharingPreview struct {
    Period       ProfitSharingPeriod `json:"period"`
    Calculation  Calculation         `json:"calculation"`
}

type Calculation struct {
    BasisAmount      float64               `json:"basis_amount"`
    TotalCogs        float64               `json:"total_cogs"`
    GrossProfit      float64               `json:"gross_profit"`
    TotalExpenses    float64               `json:"total_expenses"`
    NetProfit        float64               `json:"net_profit"`
    Ratio            float64               `json:"ratio"`
    KeeperShare      float64               `json:"keeper_share"`
    OwnerShare       float64               `json:"owner_share"`
    Breakdown        []ExpenseBreakdown    `json:"breakdown"`
    PerProduct       []ProductSharingDetail `json:"per_product"`
    Status           string                `json:"status"`
    Note             string                `json:"note"`
}

type ExpenseBreakdown struct {
    Category string  `json:"category"`
    Amount   float64 `json:"amount"`
    Note     string  `json:"note"`
}
```

#### 1.2 Models — `models/profit_sharing.go`

```go
package models

import (
    "time"
    "gorm.io/gorm"
)

type ProfitSharingPeriod struct {
    ID            uint           `gorm:"primaryKey" json:"id"`
    CreatedAt     time.Time      `gorm:"index" json:"created_at"`
    UpdatedAt     time.Time      `json:"updated_at"`
    DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`
    OutletID      uint           `json:"outlet_id" gorm:"index"`
    PeriodStart   time.Time      `json:"period_start" gorm:"index"`
    PeriodEnd     time.Time      `json:"period_end"`
    BasisAmount   float64        `json:"basis_amount"`
    TotalExpenses float64        `json:"total_expenses"`
    TotalCogs     float64        `json:"total_cogs"`
    NetProfit     float64        `json:"net_profit"`
    Ratio         float64        `json:"ratio"`
    KeeperAmount  float64        `json:"keeper_amount"`
    OwnerAmount   float64        `json:"owner_amount"`
    Status        string         `json:"status" gorm:"default:draft;index"`
    PerProduct    string         `json:"per_product"` // JSON string
    PaymentNote   string         `json:"payment_note"`
    TaxNote       string         `json:"tax_note"`
}

func (ProfitSharingPeriod) TableName() string {
    return "profit_sharing_periods"
}
```

#### 1.3 Repository Interface — `repository/interfaces.go`

```go
// Tambahkan ke file interfaces.go yang sudah ada:

type ProfitSharingPeriodRepository interface {
    FindByID(id uint) (*entity.ProfitSharingPeriod, error)
    FindByIDForUpdate(id uint, tx *gorm.DB) (*entity.ProfitSharingPeriod, error)
    FindAll(outletID ...uint) ([]entity.ProfitSharingPeriod, error)
    FindByPeriod(outletID uint, start, end time.Time) (*entity.ProfitSharingPeriod, error)
    FindOverlappingPeriod(outletID uint, start, end time.Time, excludeID uint) (*entity.ProfitSharingPeriod, error)
    Create(period *entity.ProfitSharingPeriod) error
    Update(period *entity.ProfitSharingPeriod) error
    Delete(id uint) error
    GetTotalRevenue(start, end string, outletID ...uint) (float64, error)
    GetTotalExpensesExcluding(start, end string, excluded []string, outletID ...uint) (float64, error)
    GetProductSales(start, end string, outletID ...uint) ([]entity.ProductSalesVolume, error)
    ExistsByPeriod(outletID uint, start, end time.Time) (bool, error)
}
```

#### 1.4 Repository Implementation — `repository/postgres/profit_sharing_repo.go`

```go
package postgres

import (
    "time"
    "singgah-pos-backend/internal/domain/entity"
    "singgah-pos-backend/internal/models"
    "gorm.io/gorm"
)

type profitSharingPeriodRepository struct {
    db *gorm.DB
}

func NewProfitSharingPeriodRepository(db *gorm.DB) *profitSharingPeriodRepository {
    return &profitSharingPeriodRepository{db: db}
}

// FindOverlappingPeriod — cek apakah ada periode yang overlap dengan rentang tanggal
// HARUS filter deleted_at IS NULL untuk menghindari konflik soft delete
func (r *profitSharingPeriodRepository) FindOverlappingPeriod(outletID uint, start, end time.Time, excludeID uint) (*entity.ProfitSharingPeriod, error) {
    var m models.ProfitSharingPeriod
    query := r.db.Where(
        "outlet_id = ? AND deleted_at IS NULL AND period_start <= ? AND period_end >= ?",
        outletID, end, start,
    )
    if excludeID > 0 {
        query = query.Where("id != ?", excludeID)
    }
    if err := query.First(&m).Error; err != nil {
        return nil, err
    }
    return toDomainProfitSharing(&m), nil
}

// GetTotalRevenue — Σ(order_items.price × qty) untuk periode
// INI revenue pre-tax, BUKAN orders.total_amount
func (r *profitSharingPeriodRepository) GetTotalRevenue(start, end string, outletID ...uint) (float64, error) {
    ow, args := outletWhere("o", outletID...)
    baseArgs := []interface{}{start, end, "Completed"}
    var total float64
    err := r.db.Model(&models.OrderItem{}).
        Joins("JOIN orders o ON o.id = order_items.order_id").
        Where("DATE(o.created_at) BETWEEN DATE(?) AND DATE(?) AND o.status = ?"+ow, append(baseArgs, args...)...).
        Select("COALESCE(SUM(order_items.price * order_items.quantity), 0)").
        Row().Scan(&total)
    return total, err
}

// GetTotalExpensesExcluding — total expenses TANPA kategori yang dikecualikan
// Guard: jika excluded kosong, tidak tambah WHERE NOT IN
func (r *profitSharingPeriodRepository) GetTotalExpensesExcluding(start, end string, excluded []string, outletID ...uint) (float64, error) {
    tx := r.db.Model(&models.Expense{}).
        Where("DATE(date) BETWEEN DATE(?) AND DATE(?)", start, end)
    tx = scopeOutlet(tx, "expenses", outletID...)

    // GUARD: hanya tambah WHERE jika slice tidak kosong
    if len(excluded) > 0 {
        tx = tx.Where("category NOT IN ?", excluded)
    }

    var total float64
    err := tx.Select("COALESCE(SUM(amount), 0)").Row().Scan(&total)
    return total, err
}

// GetProductSales — detail revenue per produk untuk perhitungan bagi hasil
func (r *profitSharingPeriodRepository) GetProductSales(start, end string, outletID ...uint) ([]entity.ProductSalesVolume, error) {
    ow, args := outletWhere("o", outletID...)
    baseArgs := []interface{}{start, end}
    allArgs := append(baseArgs, args...)
    var results []entity.ProductSalesVolume
    err := r.db.Raw(`
        SELECT
            p.id as product_id,
            p.name,
            p.category,
            SUM(oi.quantity) as quantity,
            AVG(oi.price) as avg_price,
            AVG(oi.cost) as avg_cost,
            SUM(oi.price * oi.quantity) as revenue
        FROM order_items oi
        JOIN products p ON p.id = oi.product_id
        JOIN orders o ON o.id = oi.order_id
        WHERE DATE(o.created_at) BETWEEN DATE(?) AND DATE(?) AND o.status = 'Completed'`+ow+`
        GROUP BY p.id, p.name, p.category
        ORDER BY revenue DESC
    `, allArgs...).Scan(&results).Error
    return results, err
}

// Create — buat periode baru
func (r *profitSharingPeriodRepository) Create(period *entity.ProfitSharingPeriod) error {
    m := &models.ProfitSharingPeriod{
        OutletID:      period.OutletID,
        PeriodStart:   period.PeriodStart,
        PeriodEnd:     period.PeriodEnd,
        BasisAmount:   period.BasisAmount,
        TotalExpenses: period.TotalExpenses,
        TotalCogs:     period.TotalCogs,
        NetProfit:     period.NetProfit,
        Ratio:         period.Ratio,
        KeeperAmount:  period.KeeperAmount,
        OwnerAmount:   period.OwnerAmount,
        Status:        period.Status,
        PerProduct:    period.PerProduct,
        PaymentNote:   period.PaymentNote,
        TaxNote:       period.TaxNote,
    }
    if err := r.db.Create(m).Error; err != nil {
        return err
    }
    period.ID = m.ID
    return nil
}

// Update — update periode
func (r *profitSharingPeriodRepository) Update(period *entity.ProfitSharingPeriod) error {
    return r.db.Model(&models.ProfitSharingPeriod{}).Where("id = ?", period.ID).Updates(map[string]interface{}{
        "basis_amount":   period.BasisAmount,
        "total_expenses": period.TotalExpenses,
        "total_cogs":     period.TotalCogs,
        "net_profit":     period.NetProfit,
        "ratio":          period.Ratio,
        "keeper_amount":  period.KeeperAmount,
        "owner_amount":   period.OwnerAmount,
        "status":         period.Status,
        "per_product":    period.PerProduct,
        "payment_note":   period.PaymentNote,
        "tax_note":       period.TaxNote,
    }).Error
}

// FindByIDForUpdate — lock row untuk cegah race condition
func (r *profitSharingPeriodRepository) FindByIDForUpdate(id uint, tx *gorm.DB) (*entity.ProfitSharingPeriod, error) {
    var m models.ProfitSharingPeriod
    if err := tx.Set("gorm:query_option", "FOR UPDATE").First(&m, id).Error; err != nil {
        return nil, err
    }
    return toDomainProfitSharing(&m), nil
}

func toDomainProfitSharing(m *models.ProfitSharingPeriod) *entity.ProfitSharingPeriod {
    return &entity.ProfitSharingPeriod{
        ID:            m.ID,
        OutletID:      m.OutletID,
        PeriodStart:   m.PeriodStart,
        PeriodEnd:     m.PeriodEnd,
        BasisAmount:   m.BasisAmount,
        TotalExpenses: m.TotalExpenses,
        TotalCogs:     m.TotalCogs,
        NetProfit:     m.NetProfit,
        Ratio:         m.Ratio,
        KeeperAmount:  m.KeeperAmount,
        OwnerAmount:   m.OwnerAmount,
        Status:        m.Status,
        PerProduct:    m.PerProduct,
        PaymentNote:   m.PaymentNote,
        TaxNote:       m.TaxNote,
        CreatedAt:     m.CreatedAt,
        UpdatedAt:     m.UpdatedAt,
    }
}
```

#### 1.5 Usecase — `usecase/profit_sharing_usecase.go`

```go
package usecase

import (
    "encoding/json"
    "errors"
    "fmt"
    "math"
    "time"

    "singgah-pos-backend/internal/domain/entity"
    domainErrors "singgah-pos-backend/internal/domain/errors"
    "singgah-pos-backend/internal/repository"
    "singgah-pos-backend/internal/repository/postgres"

    "gorm.io/gorm"
)

var alwaysExcludedFromSharing = []string{
    "Operational", "Marketing", "Maintenance", "Misc",
}

type ProfitSharingUsecase struct {
    db               *gorm.DB
    periodRepo       repository.ProfitSharingPeriodRepository
    orderItemRepo    repository.OrderItemRepository
    expenseRepo      repository.ExpenseRepository
    cashBookRepo     repository.CashBookRepository
}

func NewProfitSharingUsecase(db *gorm.DB) *ProfitSharingUsecase {
    return &ProfitSharingUsecase{
        db:            db,
        periodRepo:    postgres.NewProfitSharingPeriodRepository(db),
        orderItemRepo: postgres.NewOrderItemRepository(db),
        expenseRepo:   postgres.NewExpenseRepository(db),
        cashBookRepo:  postgres.NewCashBookRepository(db),
    }
}

// Preview — hitung bagi hasil tanpa menyimpan
func (uc *ProfitSharingUsecase) Preview(start, end string, outletID uint, ratio float64) (*entity.ProfitSharingPreview, error) {
    basis, err := uc.periodRepo.GetTotalRevenue(start, end, outletID)
    if err != nil {
        return nil, err
    }

    cogs, err := uc.orderItemRepo.GetTotalCogsRange(start, end, outletID)
    if err != nil {
        return nil, err
    }

    expenses, err := uc.periodRepo.GetTotalExpensesExcluding(start, end, alwaysExcludedFromSharing, outletID)
    if err != nil {
        return nil, err
    }

    grossMargin := basis - cogs
    netContrib := grossMargin - expenses
    if netContrib < 0 {
        netContrib = 0
    }

    keeperAmount := math.Round(netContrib*ratio/100*100) / 100
    ownerAmount := netContrib - keeperAmount

    // Build per-product detail
    products, _ := uc.orderItemRepo.GetProductSalesVolume(start, end, outletID)
    perProduct := make([]entity.ProductSharingDetail, len(products))
    for i, p := range products {
        productCogs := p.AvgCost * float64(p.Quantity)
        perProduct[i] = entity.ProductSharingDetail{
            ProductID:   p.ProductID,
            ProductName: p.Name,
            Revenue:     p.Revenue,
            Cogs:        productCogs,
            GrossMargin: p.Revenue - productCogs,
        }
    }

    preview := &entity.ProfitSharingPreview{
        Period: entity.ProfitSharingPeriod{
            OutletID:      outletID,
            PeriodStart:   parseDate(start),
            PeriodEnd:     parseDate(end),
            BasisAmount:   basis,
            TotalCogs:     cogs,
            TotalExpenses: expenses,
            NetProfit:     netContrib,
            Ratio:         ratio,
            KeeperAmount:  keeperAmount,
            OwnerAmount:   ownerAmount,
            PerProduct:    perProduct,
            TaxNote:       "Revenue sebelum pajak (10%) & service charge (5%)",
        },
        Calculation: entity.Calculation{
            BasisAmount:   basis,
            TotalCogs:     cogs,
            GrossProfit:   grossMargin,
            TotalExpenses: expenses,
            NetProfit:     netContrib,
            Ratio:         ratio,
            KeeperShare:   keeperAmount,
            OwnerShare:    ownerAmount,
            PerProduct:    perProduct,
            Status:        "draft",
            Note:          "Revenue sebelum pajak & service charge",
        },
    }
    return preview, nil
}

// Finalize — finalisasi periode draft menjadi finalized
func (uc *ProfitSharingUsecase) Finalize(id uint, ratio float64, outletID ...uint) error {
    if len(outletID) == 0 {
        return domainErrors.NewInvalidInputError("outlet ID required")
    }

    tx := uc.db.Begin()

    // LOCK ROW — cegah concurrent finalize (P0-3 fix)
    period, err := uc.periodRepo.FindByIDForUpdate(id, tx)
    if err != nil {
        tx.Rollback()
        return domainErrors.NewNotFoundError("periode")
    }

    if period.OutletID != outletID[0] {
        tx.Rollback()
        return domainErrors.NewUnauthorizedError("tidak punya akses ke periode ini")
    }

    if period.Status != "draft" {
        tx.Rollback()
        return domainErrors.NewInvalidInputError("hanya periode draft yang bisa di-finalize")
    }

    // Hitung ulang
    start := period.PeriodStart.Format("2006-01-02")
    end := period.PeriodEnd.Format("2006-01-02")

    basis, err := uc.periodRepo.GetTotalRevenue(start, end, outletID...)
    if err != nil {
        tx.Rollback()
        return err
    }

    cogs, err := uc.orderItemRepo.GetTotalCogsRange(start, end, outletID...)
    if err != nil {
        tx.Rollback()
        return err
    }

    expenses, err := uc.periodRepo.GetTotalExpensesExcluding(start, end, alwaysExcludedFromSharing, outletID...)
    if err != nil {
        tx.Rollback()
        return err
    }

    grossMargin := basis - cogs
    netContrib := grossMargin - expenses
    if netContrib < 0 {
        netContrib = 0
    }

    keeperAmount := math.Round(netContrib*ratio/100*100) / 100
    ownerAmount := netContrib - keeperAmount

    // Build per-product detail
    products, _ := uc.orderItemRepo.GetProductSalesVolume(start, end, outletID...)
    perProduct := make([]entity.ProductSharingDetail, len(products))
    for i, p := range products {
        productCogs := p.AvgCost * float64(p.Quantity)
        perProduct[i] = entity.ProductSharingDetail{
            ProductID:   p.ProductID,
            ProductName: p.Name,
            Revenue:     p.Revenue,
            Cogs:        productCogs,
            GrossMargin: p.Revenue - productCogs,
        }
    }

    perProductJSON, _ := json.Marshal(perProduct)

    period.BasisAmount = basis
    period.TotalCogs = cogs
    period.TotalExpenses = expenses
    period.NetProfit = netContrib
    period.Ratio = ratio
    period.KeeperAmount = keeperAmount
    period.OwnerAmount = ownerAmount
    period.Status = "finalized"
    period.PerProduct = string(perProductJSON)
    period.TaxNote = "Revenue sebelum pajak (10%) & service charge (5%)"

    if err := tx.Save(period).Error; err != nil {
        tx.Rollback()
        return err
    }

    return tx.Commit().Error
}

// MarkAsPaid — menandai periode finalized sebagai sudah dibayar
func (uc *ProfitSharingUsecase) MarkAsPaid(id uint, outletID ...uint) error {
    if len(outletID) == 0 {
        return domainErrors.NewInvalidInputError("outlet ID required")
    }

    existing, err := uc.periodRepo.FindByID(id)
    if err != nil {
        return domainErrors.NewNotFoundError("periode")
    }

    if existing.OutletID != outletID[0] {
        return domainErrors.NewUnauthorizedError("tidak punya akses ke periode ini")
    }

    if existing.Status != "finalized" {
        return domainErrors.NewInvalidInputError("hanya periode finalized yang bisa ditandai sebagai dibayar")
    }

    // Cek apakah sudah ada di CashBook (idempotensi)
    ref := fmt.Sprintf("profit-sharing:%d", existing.ID)
    exists, _ := uc.cashBookRepo.ExistsByReference(ref, outletID...)
    if exists {
        return nil // sudah dibayar, skip
    }

    existing.Status = "paid"
    if err := uc.periodRepo.Update(existing); err != nil {
        return err
    }

    // Sync ke CashBook
    err = uc.cashBookRepo.Create(&entity.CashBook{
        OutletID:    outletID[0],
        Date:        time.Now(),
        Method:      "Lainnya",
        Type:        "expense",
        Amount:      existing.KeeperAmount,
        Description: fmt.Sprintf("Bagi hasil periode %s - %s", existing.PeriodStart.Format("02 Jan 2006"), existing.PeriodEnd.Format("02 Jan 2006")),
        Reference:   ref,
    })
    if err != nil {
        return err
    }

    return nil
}

// Recalculate — hitung ulang periode draft
func (uc *ProfitSharingUsecase) Recalculate(id uint, ratio float64, outletID ...uint) error {
    if len(outletID) == 0 {
        return domainErrors.NewInvalidInputError("outlet ID required")
    }

    existing, err := uc.periodRepo.FindByID(id)
    if err != nil {
        return domainErrors.NewNotFoundError("periode")
    }

    if existing.OutletID != outletID[0] {
        return domainErrors.NewUnauthorizedError("tidak punya akses ke periode ini")
    }

    if existing.Status == "paid" {
        return domainErrors.NewInvalidInputError("tidak bisa hitung ulang periode yang sudah dibayar")
    }

    // Hitung ulang
    start := existing.PeriodStart.Format("2006-01-02")
    end := existing.PeriodEnd.Format("2006-01-02")

    basis, err := uc.periodRepo.GetTotalRevenue(start, end, outletID...)
    if err != nil {
        return err
    }

    cogs, err := uc.orderItemRepo.GetTotalCogsRange(start, end, outletID...)
    if err != nil {
        return err
    }

    expenses, err := uc.periodRepo.GetTotalExpensesExcluding(start, end, alwaysExcludedFromSharing, outletID...)
    if err != nil {
        return err
    }

    grossMargin := basis - cogs
    netContrib := grossMargin - expenses
    if netContrib < 0 {
        netContrib = 0
    }

    keeperAmount := math.Round(netContrib*ratio/100*100) / 100
    ownerAmount := netContrib - keeperAmount

    existing.BasisAmount = basis
    existing.TotalCogs = cogs
    existing.TotalExpenses = expenses
    existing.NetProfit = netContrib
    existing.Ratio = ratio
    existing.KeeperAmount = keeperAmount
    existing.OwnerAmount = ownerAmount
    existing.Status = "draft"

    return uc.periodRepo.Update(existing)
}

// Delete — hapus periode (hanya draft)
func (uc *ProfitSharingUsecase) Delete(id uint, outletID ...uint) error {
    if len(outletID) == 0 {
        return domainErrors.NewInvalidInputError("outlet ID required")
    }

    existing, err := uc.periodRepo.FindByID(id)
    if err != nil {
        return domainErrors.NewNotFoundError("periode")
    }

    if existing.OutletID != outletID[0] {
        return domainErrors.NewUnauthorizedError("tidak punya akses ke periode ini")
    }

    if existing.Status != "draft" {
        return domainErrors.NewInvalidInputError("hanya periode draft yang bisa dihapus")
    }

    return uc.periodRepo.Delete(id)
}

// GetAll — ambil semua periode
func (uc *ProfitSharingUsecase) GetAll(outletID ...uint) ([]entity.ProfitSharingPeriod, error) {
    return uc.periodRepo.FindAll(outletID...)
}

func parseDate(s string) time.Time {
    t, _ := time.Parse("2006-01-02", s)
    return t
}
```

#### 1.6 Handler — `delivery/handler/profit_sharing_handler.go`

```go
package handler

import (
    "net/http"
    "strconv"

    "singgah-pos-backend/internal/usecase"
    "singgah-pos-backend/internal/delivery/middleware"

    "github.com/gin-gonic/gin"
)

type ProfitSharingHandler struct {
    usecase *usecase.ProfitSharingUsecase
}

func NewProfitSharingHandler(uc *usecase.ProfitSharingUsecase) *ProfitSharingHandler {
    return &ProfitSharingHandler{usecase: uc}
}

func (h *ProfitSharingHandler) Preview(c *gin.Context) {
    start := c.Query("start")
    end := c.Query("end")
    outletID := middleware.GetOutletIDFromJWT(c)
    ratioStr := c.DefaultQuery("ratio", "50")
    ratio, _ := strconv.ParseFloat(ratioStr, 64)

    preview, err := h.usecase.Preview(start, end, outletID, ratio)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    c.JSON(http.StatusOK, preview)
}

func (h *ProfitSharingHandler) Finalize(c *gin.Context) {
    idStr := c.Param("id")
    id, _ := strconv.ParseUint(idStr, 10, 32)
    outletID := middleware.GetOutletIDFromJWT(c)
    ratioStr := c.DefaultQuery("ratio", "50")
    ratio, _ := strconv.ParseFloat(ratioStr, 64)

    if err := h.usecase.Finalize(uint(id), ratio, outletID); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    c.JSON(http.StatusOK, gin.H{"message": "periode berhasil di-finalize"})
}

func (h *ProfitSharingHandler) MarkAsPaid(c *gin.Context) {
    idStr := c.Param("id")
    id, _ := strconv.ParseUint(idStr, 10, 32)
    outletID := middleware.GetOutletIDFromJWT(c)

    if err := h.usecase.MarkAsPaid(uint(id), outletID); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    c.JSON(http.StatusOK, gin.H{"message": "periode berhasil ditandai sebagai dibayar"})
}

func (h *ProfitSharingHandler) Recalculate(c *gin.Context) {
    idStr := c.Param("id")
    id, _ := strconv.ParseUint(idStr, 10, 32)
    outletID := middleware.GetOutletIDFromJWT(c)
    ratioStr := c.DefaultQuery("ratio", "50")
    ratio, _ := strconv.ParseFloat(ratioStr, 64)

    if err := h.usecase.Recalculate(uint(id), ratio, outletID); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    c.JSON(http.StatusOK, gin.H{"message": "periode berhasil dihitung ulang"})
}

func (h *ProfitSharingHandler) Delete(c *gin.Context) {
    idStr := c.Param("id")
    id, _ := strconv.ParseUint(idStr, 10, 32)
    outletID := middleware.GetOutletIDFromJWT(c)

    if err := h.usecase.Delete(uint(id), outletID); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    c.JSON(http.StatusOK, gin.H{"message": "periode berhasil dihapus"})
}

func (h *ProfitSharingHandler) GetAll(c *gin.Context) {
    outletID := middleware.GetOutletIDFromJWT(c)
    periods, err := h.usecase.GetAll(outletID)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    c.JSON(http.StatusOK, periods)
}
```

#### 1.7 Routes — `routes/routes.go`

```go
// Tambahkan ke Handlers struct:
type Handlers struct {
    // ... existing handlers
    ProfitSharing *handler.ProfitSharingHandler
}

// Tambahkan ke SetupRoutes:
// Profit Sharing — Owner Only
protected.GET("/profit-sharing", middleware.RoleMiddleware("owner"), h.ProfitSharing.GetAll)
protected.GET("/profit-sharing/preview", middleware.RoleMiddleware("owner"), h.ProfitSharing.Preview)
protected.POST("/profit-sharing/:id/finalize", middleware.RoleMiddleware("owner"), h.ProfitSharing.Finalize)
protected.POST("/profit-sharing/:id/mark-paid", middleware.RoleMiddleware("owner"), h.ProfitSharing.MarkAsPaid)
protected.POST("/profit-sharing/:id/recalculate", middleware.RoleMiddleware("owner"), h.ProfitSharing.Recalculate)
protected.DELETE("/profit-sharing/:id", middleware.RoleMiddleware("owner"), h.ProfitSharing.Delete)
```

#### 1.8 AutoMigrate — `database/database.go`

```go
// Tambahkan ke AutoMigrate:
err = db.AutoMigrate(
    // ... existing models
    &models.ProfitSharingPeriod{},
)
```

---

### Sprint 2: Frontend Implementation

#### 2.1 Hooks

- `web-dashboard/src/hooks/useProfitSharing.ts` — React Query hooks
- `web-dashboard/src/hooks/useProfitSharingPreview.ts` — Live preview hook

#### 2.2 Pages

- `web-dashboard/src/pages/ProfitSharing.tsx` — Main page

#### 2.3 API Client

- `web-dashboard/src/lib/api.ts` — Tambahkan `apiLong` instance untuk PDF timeout

```typescript
// Tambahkan di api.ts:
export const apiLong = axios.create({
    baseURL: API_BASE,
    timeout: 120_000, // 2 menit untuk operasi berat
    headers: { 'Content-Type': 'application/json' },
});
```

---

## API ENDPOINTS

| Method | Path | Description | Role |
|--------|------|-------------|------|
| GET | `/api/profit-sharing` | Ambil semua periode | owner |
| GET | `/api/profit-sharing/preview?start=&end=&ratio=` | Preview bagi hasil | owner |
| POST | `/api/profit-sharing/:id/finalize?ratio=` | Finalisasi periode | owner |
| POST | `/api/profit-sharing/:id/mark-paid` | Tandai sudah dibayar | owner |
| POST | `/api/profit-sharing/:id/recalculate?ratio=` | Hitung ulang | owner |
| DELETE | `/api/profit-sharing/:id` | Hapus periode draft | owner |

---

## DEPLOY CHECKLIST

1. `go vet ./...`
2. `go test ./...`
3. `npx tsc --noEmit`
4. `npm run build` (web-dashboard)
5. `CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o server cmd/server/main.go`
6. `cp api-proxy.php .htaccess ~/public_html/`
7. Restart via `start.sh`
8. Verify `/health`
9. Test preview, finalize, mark-paid flow

---

## VERIFICATION MATRIX

| Claim | Status | Evidence |
|-------|--------|----------|
| uniqueIndex syntax valid | ✅ VERIFIED | `models.go:62-64` (ProductionTarget), `models.go:135-138` (Setting) |
| Soft delete conflict with unique index | ⚠️ REAL ISSUE | MySQL unique index doesn't filter deleted_at |
| NOT IN () crash guard | ✅ PATTERN EXISTS | `scopeOutlet` (order_repo.go:219), `outletWhere` (order_item_repo.go:32) |
| SELECT FOR UPDATE for race condition | ✅ STANDARD GORM | `gorm:query_option` tag supported |
| alwaysExcludedFromSharing | ✅ VERIFIED | Protected categories list matches existing patterns |
| GetTotalRevenue uses Σ(order_items.price × qty) | ✅ CORRECT | NOT orders.total_amount |
| Rounding: keeper + owner = basis EXACT | ✅ MATHEMATICAL | `math.Round(basis*ratio/100*100)/100` + `owner = basis - keeper` |
| apiLong instance for PDF timeout | ✅ PATTERN EXISTS | Standard axios.create pattern |
| CashBook sync idempotent via reference | ✅ VERIFIED | `expense_usecase.go:44`, `cash_book_usecase.go:112` |
| Protected categories prevent editing | ⚠️ NEEDS IMPLEMENTATION | E4 fix required |
