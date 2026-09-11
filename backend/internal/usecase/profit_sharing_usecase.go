package usecase

import (
	"encoding/json"
	"fmt"
	"math"
	"strings"
	"time"

	"singgah-pos-backend/internal/domain/entity"
	domainErrors "singgah-pos-backend/internal/domain/errors"
	"singgah-pos-backend/internal/models"
	"singgah-pos-backend/internal/repository"
	"singgah-pos-backend/internal/repository/postgres"

	"gorm.io/gorm"
)

// wib adalah zona waktu WIB (UTC+7) yang digunakan sebagai referensi lokal.
// loc=Local di DSN MySQL mengikuti timezone sistem server, yang di production
// kemungkinan UTC. Untuk konsistensi, semua datetime di-parse/format ke UTC
// agar cocok dengan nilai yang tersimpan di kolom TIMESTAMP MySQL (selalu UTC).
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
var wib = time.FixedZone("WIB", 7*60*60)

// alwaysExcludedFromSharing menentukan kategori pengeluaran yang SELALU
// dikecualikan dari perhitungan bagi hasil. Kategori ini mewakili biaya
// operasional inti yang menjadi tanggung jawab operasional outlet.
var alwaysExcludedFromSharing = []string{
	"Operasional", "Operational", "Marketing", "Maintenance", "Misc",
}

type ProfitSharingUsecase struct {
	db            *gorm.DB
	periodRepo    repository.ProfitSharingPeriodRepository
	orderItemRepo repository.OrderItemRepository
	expenseRepo   repository.ExpenseRepository
	cashBookRepo  repository.CashBookRepository
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

// calcResult holds the result of a shared calculation used by Preview, Finalize, and Recalculate.
type calcResult struct {
	Basis        float64
	Cogs         float64
	Expenses     float64
	GrossMargin  float64
	NetProfit    float64
	SharingBasis float64
	KeeperAmount float64
	OwnerAmount  float64
	Products     []entity.ProductSalesVolume
	PerProduct   []entity.ProductSharingDetail
	PerProductJSON string
}

// calcFinancials computes profit-sharing amounts from raw financial data.
// C1: rounds to nearest 250 IDR (integer).
// C2: clamps negative sharingBasis to 0 (no one pays when there's a loss).
func calcFinancials(basis, cogs, expenses, ratio float64, products []entity.ProductSalesVolume) calcResult {
	grossMargin := basis - cogs
	netProfit := grossMargin - expenses

	// Gunakan Gross Profit sebagai basis kalau Net Profit negatif
	sharingBasis := netProfit
	if sharingBasis < 0 {
		sharingBasis = grossMargin
	}
	// C2: Clamp — tidak ada yang bayar saat rugi
	if sharingBasis < 0 {
		sharingBasis = 0
	}

	// C1: Bulatkan ke 250 terdekat (Rupiah tidak punya pecahan kecil)
	keeperAmount := math.Round(sharingBasis*ratio/100/250) * 250
	ownerAmount := sharingBasis - keeperAmount

	perProduct := make([]entity.ProductSharingDetail, len(products))
	for i, p := range products {
		perProduct[i] = entity.ProductSharingDetail{
			ProductID:   p.ProductID,
			ProductName: p.Name,
			Revenue:     p.Revenue,
			Cogs:        p.TotalCogs,
			GrossMargin: p.Revenue - p.TotalCogs,
		}
	}
	perProductJSON, _ := json.Marshal(perProduct)

	return calcResult{
		Basis:          basis,
		Cogs:           cogs,
		Expenses:       expenses,
		GrossMargin:    grossMargin,
		NetProfit:      netProfit,
		SharingBasis:   sharingBasis,
		KeeperAmount:   keeperAmount,
		OwnerAmount:    ownerAmount,
		Products:       products,
		PerProduct:     perProduct,
		PerProductJSON: string(perProductJSON),
	}
}

// Preview calculates profit sharing for a period and persists a draft record.
// NOTE: This method writes to the database to create/update a draft period
// that can later be finalized or recalculated. The draft is overwritten on
// each call (idempotent per overlapping period). If a read-only calculation
// is needed, use the calculation logic inline without the DB write.
func (uc *ProfitSharingUsecase) Preview(start, end string, outletID uint, ratio float64) (*entity.ProfitSharingPreview, error) {
	startDate := parseDatePS(start)
	endDate := parseDatePS(end)
	if startDate.IsZero() || endDate.IsZero() {
		return nil, domainErrors.NewInvalidInputError("format tanggal mulai atau akhir tidak valid")
	}

	// Normalisasi datetime string dari frontend ke format DB yang konsisten.
	// parseDatePS meng-interpret string lokal sebagai WIB lalu formatForDB
	// mengkonversinya ke UTC untuk query BETWEEN pada kolom TIMESTAMP MySQL.
	startNorm := formatForDB(startDate)
	endNorm := formatForDB(endDate)

	basis, err := uc.periodRepo.GetTotalRevenue(startNorm, endNorm, outletID)
	if err != nil {
		return nil, err
	}
	cogs, err := uc.orderItemRepo.GetTotalCogsRange(startNorm, endNorm, outletID)
	if err != nil {
		return nil, err
	}
	expenses, err := uc.periodRepo.GetTotalExpensesExcluding(startNorm, endNorm, alwaysExcludedFromSharing, outletID)
	if err != nil {
		return nil, err
	}

	// M2: Handle error dari GetProductSalesVolume
	products, err := uc.orderItemRepo.GetProductSalesVolume(startNorm, endNorm, outletID)
	if err != nil {
		products = nil
	}

	result := calcFinancials(basis, cogs, expenses, ratio, products)

	period := entity.ProfitSharingPeriod{
		OutletID:      outletID,
		PeriodStart:   startDate, // disimpan ke DB; GORM akan gunakan loc=Local dari DSN
		PeriodEnd:     endDate,
		BasisAmount:   result.Basis,
		TotalCogs:     result.Cogs,
		TotalExpenses: result.Expenses,
		NetProfit:     result.NetProfit,
		Ratio:         ratio,
		KeeperAmount:  result.KeeperAmount,
		OwnerAmount:   result.OwnerAmount,
		Status:        "draft",
		PerProduct:    result.PerProductJSON,
		TaxNote:       "Pendapatan kotor sebelum pajak (10%) & biaya layanan (5%)",
	}

	// M3: Handle error dari FindOverlappingPeriod
	overlapping, err := uc.periodRepo.FindOverlappingPeriod(outletID, startDate, endDate, 0)
	if err != nil && overlapping == nil {
		// DB error — bukan "record not found", return error
		return nil, err
	}

	if overlapping != nil {
		period.ID = overlapping.ID
		if err := uc.periodRepo.Update(&period); err != nil {
			return nil, err
		}
	} else {
		if err := uc.periodRepo.Create(&period); err != nil {
			return nil, err
		}
	}

	return &entity.ProfitSharingPreview{
		Period: period,
		Calculation: entity.Calculation{
			BasisAmount:   result.Basis,
			TotalCogs:     result.Cogs,
			GrossProfit:   result.GrossMargin,
			TotalExpenses: result.Expenses,
			NetProfit:     result.NetProfit,
			Ratio:         ratio,
			KeeperShare:   result.KeeperAmount,
			OwnerShare:    result.OwnerAmount,
			PerProduct:    result.PerProduct,
			Status:        "draft",
			Note:          "Pendapatan kotor sebelum pajak & biaya layanan",
		},
	}, nil
}

// M1: fetchFinancialsWithTx runs the 3 financial queries inside a transaction for read consistency.
func (uc *ProfitSharingUsecase) fetchFinancialsWithTx(tx *gorm.DB, start, end string, outletID uint) (basis, cogs, expenses float64, err error) {
	txPeriodRepo := postgres.NewProfitSharingPeriodRepository(tx)
	txOrderItemRepo := postgres.NewOrderItemRepository(tx)

	basis, err = txPeriodRepo.GetTotalRevenue(start, end, outletID)
	if err != nil {
		return
	}
	cogs, err = txOrderItemRepo.GetTotalCogsRange(start, end, outletID)
	if err != nil {
		return
	}
	expenses, err = txPeriodRepo.GetTotalExpensesExcluding(start, end, alwaysExcludedFromSharing, outletID)
	return
}

func (uc *ProfitSharingUsecase) Finalize(id uint, ratio float64, outletID ...uint) error {
	if len(outletID) == 0 {
		return domainErrors.NewInvalidInputError("outlet ID required")
	}
	tx := uc.db.Begin()
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
	// Gunakan formatForDB (UTC) agar BETWEEN query cocok dengan data yang
	// disimpan MySQL sebagai TIMESTAMP (selalu UTC di server).
	start := formatForDB(period.PeriodStart)
	end := formatForDB(period.PeriodEnd)

	// M1: Jalankan query keuangan di dalam transaction untuk konsistensi baca
	basis, cogs, expenses, err := uc.fetchFinancialsWithTx(tx, start, end, outletID[0])
	if err != nil {
		tx.Rollback()
		return err
	}

	// M2: Handle error dari GetProductSalesVolume
	products, err := uc.orderItemRepo.GetProductSalesVolume(start, end, outletID[0])
	if err != nil {
		products = nil
	}

	result := calcFinancials(basis, cogs, expenses, ratio, products)

	if err := tx.Model(&models.ProfitSharingPeriod{}).Where("id = ?", period.ID).Updates(map[string]interface{}{
		"period_start":   period.PeriodStart,
		"period_end":     period.PeriodEnd,
		"basis_amount":   result.Basis,
		"total_expenses": result.Expenses,
		"total_cogs":     result.Cogs,
		"net_profit":     result.NetProfit,
		"ratio":          ratio,
		"keeper_amount":  result.KeeperAmount,
		"owner_amount":   result.OwnerAmount,
		"status":         "finalized",
		"per_product":    result.PerProductJSON,
		"payment_note":   period.PaymentNote,
		"tax_note":       "Pendapatan kotor sebelum pajak (10%) & biaya layanan (5%)",
	}).Error; err != nil {
		tx.Rollback()
		return err
	}
	return tx.Commit().Error
}

// M6: MarkAsPaid dijalankan dalam satu transaction untuk atomicitas.
func (uc *ProfitSharingUsecase) MarkAsPaid(id uint, outletID ...uint) error {
	if len(outletID) == 0 {
		return domainErrors.NewInvalidInputError("outlet ID required")
	}

	tx := uc.db.Begin()

	existing, err := uc.periodRepo.FindByID(id)
	if err != nil {
		tx.Rollback()
		return domainErrors.NewNotFoundError("periode")
	}
	if existing.OutletID != outletID[0] {
		tx.Rollback()
		return domainErrors.NewUnauthorizedError("tidak punya akses ke periode ini")
	}
	if existing.Status != "finalized" {
		tx.Rollback()
		return domainErrors.NewInvalidInputError("hanya periode finalized yang bisa ditandai sebagai dibayar")
	}

	ref := fmt.Sprintf("profit-sharing:%d", existing.ID)
	exists, _ := uc.cashBookRepo.ExistsByReference(ref, outletID...)
	if exists {
		tx.Rollback()
		return nil
	}

	existing.Status = "paid"
	if err := tx.Model(&models.ProfitSharingPeriod{}).Where("id = ?", existing.ID).Updates(map[string]interface{}{
		"status": "paid",
	}).Error; err != nil {
		tx.Rollback()
		return err
	}

	// Cash book entry dibuat dengan tanggal pembayaran, bukan tanggal periode
	if err := tx.Create(&models.CashBook{
		OutletID:    outletID[0],
		Date:        time.Now(),
		Method:      "Lainnya",
		Type:        "expense",
		Amount:      existing.KeeperAmount,
		Description: fmt.Sprintf("Bagi hasil periode %s - %s", existing.PeriodStart.Format("02 Jan 2006"), existing.PeriodEnd.Format("02 Jan 2006")),
		Reference:   ref,
	}).Error; err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit().Error
}

// M5: Recalculate dijalankan dalam transaction untuk atomicitas.
func (uc *ProfitSharingUsecase) Recalculate(id uint, ratio float64, outletID ...uint) error {
	if len(outletID) == 0 {
		return domainErrors.NewInvalidInputError("outlet ID required")
	}

	tx := uc.db.Begin()

	existing, err := uc.periodRepo.FindByID(id)
	if err != nil {
		tx.Rollback()
		return domainErrors.NewNotFoundError("periode")
	}
	if existing.OutletID != outletID[0] {
		tx.Rollback()
		return domainErrors.NewUnauthorizedError("tidak punya akses ke periode ini")
	}

	// Reverse cashbook entry jika periode sudah dibayar
	if existing.Status == "paid" {
		ref := fmt.Sprintf("profit-sharing:%d", existing.ID)
		if _, err := uc.cashBookRepo.DeleteByReference(ref, outletID...); err != nil {
			tx.Rollback()
			return err
		}
	}

	// Gunakan formatForDB (UTC) agar BETWEEN query konsisten dengan Finalize.
	start := formatForDB(existing.PeriodStart)
	end := formatForDB(existing.PeriodEnd)

	// M1: Jalankan query keuangan di dalam transaction
	basis, cogs, expenses, err := uc.fetchFinancialsWithTx(tx, start, end, outletID[0])
	if err != nil {
		tx.Rollback()
		return err
	}

	// M2: Handle error dari GetProductSalesVolume
	products, err := uc.orderItemRepo.GetProductSalesVolume(start, end, outletID[0])
	if err != nil {
		products = nil
	}

	result := calcFinancials(basis, cogs, expenses, ratio, products)

	if err := tx.Model(&models.ProfitSharingPeriod{}).Where("id = ?", existing.ID).Updates(map[string]interface{}{
		"basis_amount":   result.Basis,
		"total_cogs":     result.Cogs,
		"total_expenses": result.Expenses,
		"net_profit":     result.NetProfit,
		"ratio":          ratio,
		"keeper_amount":  result.KeeperAmount,
		"owner_amount":   result.OwnerAmount,
		"status":         "draft",
		"per_product":    result.PerProductJSON,
	}).Error; err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit().Error
}

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

	// Reverse cashbook entry jika periode sudah dibayar
	if existing.Status == "paid" {
		ref := fmt.Sprintf("profit-sharing:%d", existing.ID)
		uc.cashBookRepo.DeleteByReference(ref, outletID...)
	}
	return uc.periodRepo.Delete(id)
}

func (uc *ProfitSharingUsecase) GetAll(outletID ...uint) ([]entity.ProfitSharingPeriod, error) {
	return uc.periodRepo.FindAll(outletID...)
}

// parseDatePS mem-parse string datetime dari frontend dengan toleransi berbagai format.
// Menangani kasus URL decode di mana karakter '+' pada timezone offset berubah menjadi spasi ' '.
// H1: Date-only strings (e.g. "2026-09-10") diinterpretasi sebagai akhir hari (23:59:59 WIB).
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func parseDatePS(s string) time.Time {
	s = strings.TrimSpace(s)
	if s == "" {
		return time.Time{}
	}

	// Normalisasi URL-decoded '+' yang berubah menjadi space pada timezone offset:
	// misal "2026-08-23T16:00:00 07:00" -> "2026-08-23T16:00:00+07:00"
	// misal "2026-08-23 16:00:00 07:00" -> "2026-08-23T16:00:00+07:00"
	if idx := strings.LastIndex(s, " "); idx != -1 && idx+6 == len(s) {
		offsetPart := s[idx+1:]
		if len(offsetPart) == 5 && offsetPart[2] == ':' {
			s = s[:idx] + "+" + offsetPart
		}
	}

	formatsWithZone := []string{
		time.RFC3339,
		time.RFC3339Nano,
		"2006-01-02 15:04:05Z07:00",
		"2006-01-02 15:04Z07:00",
		"2006-01-02T15:04Z07:00",
	}
	for _, f := range formatsWithZone {
		if t, err := time.Parse(f, s); err == nil {
			return t.In(wib)
		}
	}

	formatsNoZone := []string{
		"2006-01-02 15:04:05",
		"2006-01-02 15:04",
		"2006-01-02T15:04:05",
		"2006-01-02T15:04",
		"2006-01-02",
	}
	for _, f := range formatsNoZone {
		if t, err := time.Parse(f, s); err == nil {
			result := time.Date(t.Year(), t.Month(), t.Day(), t.Hour(), t.Minute(), t.Second(), 0, wib)
			// H1: Date-only → set ke 23:59:59 WIB (akhir hari)
			if f == "2006-01-02" && result.Hour() == 0 && result.Minute() == 0 && result.Second() == 0 {
				result = time.Date(result.Year(), result.Month(), result.Day(), 23, 59, 59, 0, wib)
			}
			return result
		}
	}

	return time.Time{}
}

// formatForDB mengkonversi time.Time ke string UTC "2006-01-02 15:04:05"
// untuk digunakan dalam query BETWEEN pada kolom TIMESTAMP MySQL.
// MySQL menyimpan TIMESTAMP selalu dalam UTC, sehingga perbandingan
// harus menggunakan UTC — bukan waktu lokal server.
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func formatForDB(t time.Time) string {
	return t.UTC().Format("2006-01-02 15:04:05")
}
