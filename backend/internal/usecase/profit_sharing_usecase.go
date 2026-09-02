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

var alwaysExcludedFromSharing = []string{
	"Operational", "Marketing", "Maintenance", "Misc",
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
	grossMargin := basis - cogs
	netProfit := grossMargin - expenses // actual value (can be negative for display)

	// Gunakan Gross Profit sebagai basis kalau Net Profit negatif
	sharingBasis := netProfit
	if sharingBasis < 0 {
		sharingBasis = grossMargin
	}
	keeperAmount := math.Round(sharingBasis*ratio/100*100) / 100
	ownerAmount := sharingBasis - keeperAmount

	products, _ := uc.orderItemRepo.GetProductSalesVolume(startNorm, endNorm, outletID)
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

	period := entity.ProfitSharingPeriod{
		OutletID:      outletID,
		PeriodStart:   startDate, // disimpan ke DB; GORM akan gunakan loc=Local dari DSN
		PeriodEnd:     endDate,
		BasisAmount:   basis,
		TotalCogs:     cogs,
		TotalExpenses: expenses,
		NetProfit:     netProfit,
		Ratio:         ratio,
		KeeperAmount:  keeperAmount,
		OwnerAmount:   ownerAmount,
		Status:        "draft",
		PerProduct:    string(perProductJSON),
		TaxNote:       "Pendapatan kotor sebelum pajak (10%) & biaya layanan (5%)",
	}

	overlapping, _ := uc.periodRepo.FindOverlappingPeriod(outletID, startDate, endDate, 0)

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
			BasisAmount:   basis,
			TotalCogs:     cogs,
			GrossProfit:   grossMargin,
			TotalExpenses: expenses,
			NetProfit:     netProfit,
			Ratio:         ratio,
			KeeperShare:   keeperAmount,
			OwnerShare:    ownerAmount,
			PerProduct:    perProduct,
			Status:        "draft",
			Note:          "Pendapatan kotor sebelum pajak & biaya layanan",
		},
	}, nil
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
	netProfit := grossMargin - expenses // actual value (can be negative for display)

	// Gunakan Gross Profit sebagai basis kalau Net Profit negatif
	sharingBasis := netProfit
	if sharingBasis < 0 {
		sharingBasis = grossMargin
	}
	keeperAmount := math.Round(sharingBasis*ratio/100*100) / 100
	ownerAmount := sharingBasis - keeperAmount

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
	period.NetProfit = netProfit
	period.Ratio = ratio
	period.KeeperAmount = keeperAmount
	period.OwnerAmount = ownerAmount
	period.Status = "finalized"
	period.PerProduct = string(perProductJSON)
	period.TaxNote = "Pendapatan kotor sebelum pajak (10%) & biaya layanan (5%)"

	if err := tx.Model(&models.ProfitSharingPeriod{}).Where("id = ?", period.ID).Updates(map[string]interface{}{
		"period_start":   period.PeriodStart,
		"period_end":     period.PeriodEnd,
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
	}).Error; err != nil {
		tx.Rollback()
		return err
	}
	return tx.Commit().Error
}

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
	ref := fmt.Sprintf("profit-sharing:%d", existing.ID)
	exists, _ := uc.cashBookRepo.ExistsByReference(ref, outletID...)
	if exists {
		return nil
	}
	existing.Status = "paid"
	if err := uc.periodRepo.Update(existing); err != nil {
		return err
	}
	err = uc.cashBookRepo.Create(&entity.CashBook{
		OutletID:    outletID[0],
		Date:        time.Now(),
		Method:      "Lainnya",
		Type:        "expense",
		Amount:      existing.KeeperAmount,
		Description: fmt.Sprintf("Bagi hasil periode %s - %s", existing.PeriodStart.Format("02 Jan 2006"), existing.PeriodEnd.Format("02 Jan 2006")),
		Reference:   ref,
	})
	return err
}

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

	// Reverse cashbook entry jika periode sudah dibayar
	if existing.Status == "paid" {
		ref := fmt.Sprintf("profit-sharing:%d", existing.ID)
		uc.cashBookRepo.DeleteByReference(ref, outletID...)
	}
	// Gunakan formatForDB (UTC) agar BETWEEN query konsisten dengan Finalize.
	start := formatForDB(existing.PeriodStart)
	end := formatForDB(existing.PeriodEnd)

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
	netProfit := grossMargin - expenses // actual value (can be negative for display)

	// Gunakan Gross Profit sebagai basis kalau Net Profit negatif
	sharingBasis := netProfit
	if sharingBasis < 0 {
		sharingBasis = grossMargin
	}
	keeperAmount := math.Round(sharingBasis*ratio/100*100) / 100
	ownerAmount := sharingBasis - keeperAmount

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

	existing.BasisAmount = basis
	existing.TotalCogs = cogs
	existing.TotalExpenses = expenses
	existing.NetProfit = netProfit
	existing.Ratio = ratio
	existing.KeeperAmount = keeperAmount
	existing.OwnerAmount = ownerAmount
	existing.Status = "draft"
	existing.PerProduct = string(perProductJSON)

	return uc.periodRepo.Update(existing)
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
			return time.Date(t.Year(), t.Month(), t.Day(), t.Hour(), t.Minute(), t.Second(), 0, wib)
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
