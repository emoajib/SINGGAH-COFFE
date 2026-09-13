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
	db                       *gorm.DB
	periodRepo               repository.ProfitSharingPeriodRepository
	orderItemRepo            repository.OrderItemRepository
	expenseRepo              repository.ExpenseRepository
	cashBookRepo             repository.CashBookRepository
	profitSharingPersonRepo  repository.ProfitSharingPersonRepository
}

func NewProfitSharingUsecase(db *gorm.DB) *ProfitSharingUsecase {
	return &ProfitSharingUsecase{
		db:                      db,
		periodRepo:              postgres.NewProfitSharingPeriodRepository(db),
		orderItemRepo:           postgres.NewOrderItemRepository(db),
		expenseRepo:             postgres.NewExpenseRepository(db),
		cashBookRepo:            postgres.NewCashBookRepository(db),
		profitSharingPersonRepo: postgres.NewProfitSharingPeopleRepository(db),
	}
}

// calcResult holds the result of a shared calculation used by Preview, Finalize, and Recalculate.
type calcResult struct {
	Basis          float64
	Tax            float64
	ServiceFee     float64
	NetRevenue     float64
	Cogs           float64
	Expenses       float64
	GrossMargin    float64
	NetProfit      float64
	SharingBasis   float64
	KeeperAmount   float64
	OwnerAmount    float64
	Products       []entity.ProductSalesVolume
	PerProduct     []entity.ProductSharingDetail
	PerProductJSON string
}

// calcFinancials computes profit-sharing amounts from raw financial data.
// C1: rounds to nearest 250 IDR (integer).
// C2: clamps negative sharingBasis to 0 (no one pays when there's a loss).
// ownerPct: owner percentage (default 60). Owner gets ownerPct% of sharingBasis.
// If people provided, remaining pool is split among baristas by their sharePct.
// OwnerPct cannot be 0 for the function to work, defaults to 60.
// Formula: Pendapatan Kotor - Pajak(10%) - Biaya Layanan(5%) = Pendapatan Bersih
// Pendapatan Bersih - COGS = Laba Kotor - Pengeluaran = Laba Bersih = Sharing Basis
func calcFinancials(basis, cogs, expenses, ratio float64, products []entity.ProductSalesVolume, ownerPct float64, people []entity.ProfitSharingPerson) calcResult {
	// Potong pajak 10% dan biaya layanan 5% dari pendapatan kotor
	tax := math.Round(basis*0.10/250) * 250
	serviceFee := math.Round(basis*0.05/250) * 250
	netRevenue := basis - tax - serviceFee

	grossMargin := netRevenue - cogs
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

	result := calcResult{
		Basis:          basis,
		Tax:            tax,
		ServiceFee:     serviceFee,
		NetRevenue:     netRevenue,
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

	// Multi-person split: owner gets ownerPct% of sharingBasis, baristas split remaining pool
	if ownerPct > 0 && len(people) > 0 {
		multiOwnerShare := math.Round(sharingBasis*ownerPct/100/250) * 250
		baristaPool := sharingBasis - multiOwnerShare
		result.OwnerAmount = multiOwnerShare
		result.KeeperAmount = 0 // overridden per-person below

		// Calculate each person's share from barista pool
		totalBaristaPct := 0.0
		for _, p := range people {
			if p.Role != "owner" {
				totalBaristaPct += p.SharePct
			}
		}
		if totalBaristaPct == 0 {
			totalBaristaPct = 100
		}
		for i := range people {
			if people[i].Role == "owner" {
				people[i].Amount = multiOwnerShare
			} else {
				share := math.Round(baristaPool*people[i].SharePct/totalBaristaPct/250) * 250
				// If on leave, their share goes back to owner
				if people[i].IsOnLeave {
					people[i].LeaveReduction = share
					people[i].Amount = 0
				} else {
					people[i].Amount = share
					people[i].LeaveReduction = 0
				}
			}
		}
		// Owner also gets leave reductions from baristas
		totalReductions := 0.0
		for _, p := range people {
			totalReductions += p.LeaveReduction
		}
		if len(people) > 0 {
			for i := range people {
				if people[i].Role == "owner" {
					people[i].Amount += totalReductions
				}
			}
		}
	}

	return result
}

// Preview calculates profit sharing for a period and persists a draft record.
// NOTE: This method writes to the database to create/update a draft period
// that can later be finalized or recalculated. The draft is overwritten on
// each call (idempotent per overlapping period). If a read-only calculation
// is needed, use the calculation logic inline without the DB write.
// ownerPct defaults to 60 if <= 0. people slice can be nil for legacy 2-person mode.
func (uc *ProfitSharingUsecase) Preview(start, end string, outletID uint, ratio float64, basisType string, ownerPct float64, people []entity.ProfitSharingPerson) (*entity.ProfitSharingPreview, error) {
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

	// Defaults
	if basisType == "" {
		basisType = "net"
	}
	if ownerPct <= 0 {
		ownerPct = 60
	}

	result := calcFinancials(basis, cogs, expenses, ratio, products, ownerPct, people)

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
		TaxNote:       "Pendapatan kotor dikurangi pajak (10%) & biaya layanan (5%)",
		BasisType:     basisType,
		OwnerPct:      ownerPct,
		People:        people,
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

	// Save people
	if len(people) > 0 {
		for i := range people {
			people[i].PeriodID = period.ID
		}
		if err := uc.profitSharingPersonRepo.DeleteByPeriodID(period.ID); err != nil {
			return nil, err
		}
		if err := uc.profitSharingPersonRepo.BulkUpsert(people); err != nil {
			return nil, err
		}
	}

	return &entity.ProfitSharingPreview{
		Period: period,
		Calculation: entity.Calculation{
			BasisAmount:   result.Basis,
			Tax:           result.Tax,
			ServiceFee:    result.ServiceFee,
			NetRevenue:    result.NetRevenue,
			TotalCogs:     result.Cogs,
			GrossProfit:   result.GrossMargin,
			TotalExpenses: result.Expenses,
			NetProfit:     result.NetProfit,
			Ratio:         ratio,
			KeeperShare:   result.KeeperAmount,
			OwnerShare:    result.OwnerAmount,
			PerProduct:    result.PerProduct,
			Status:        "draft",
			Note:          "Pendapatan kotor dikurangi pajak (10%) & biaya layanan (5%)",
			BasisType:     basisType,
			OwnerPct:      ownerPct,
			People:        people,
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

	// Load people for this period
	people, _ := uc.profitSharingPersonRepo.GetByPeriodID(period.ID)

	ownerPct := period.OwnerPct
	if ownerPct <= 0 {
		ownerPct = 60
	}

	result := calcFinancials(basis, cogs, expenses, ratio, products, ownerPct, people)

	// Update people amounts in DB
	if len(people) > 0 {
		if err := uc.profitSharingPersonRepo.BulkUpsert(people); err != nil {
			tx.Rollback()
			return err
		}
	}

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
		"basis_type":     period.BasisType,
		"owner_pct":      ownerPct,
	}).Error; err != nil {
		tx.Rollback()
		return err
	}
	return tx.Commit().Error
}

// M6: MarkAsPaid dijalankan dalam satu transaction untuk atomicitas.
// Creates one cashbook entry per person (owner + baristas).
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
	exists, _ := uc.cashBookRepo.ExistsByProfitSharingPeriod(existing.ID, outletID...)
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

	// Load people for this period
	people, _ := uc.profitSharingPersonRepo.GetByPeriodID(existing.ID)

	// If no people saved, create legacy single entry
	if len(people) == 0 {
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
	} else {
		// Create one cashbook entry per person
		for _, p := range people {
			if p.Amount <= 0 {
				continue
			}
			roleLabel := "Pemilik"
			if p.Role == "barista" {
				roleLabel = p.Name
			}
			desc := fmt.Sprintf("Bagi hasil %s periode %s - %s", roleLabel, existing.PeriodStart.Format("02 Jan 2006"), existing.PeriodEnd.Format("02 Jan 2006"))
			if p.IsOnLeave {
				desc += fmt.Sprintf(" (Cuti, pengurangan Rp %.0f)", p.LeaveReduction)
			}
			if err := tx.Create(&models.CashBook{
				OutletID:    outletID[0],
				Date:        time.Now(),
				Method:      "Lainnya",
				Type:        "expense",
				Amount:      p.Amount,
				Description: desc,
				Reference:   ref,
			}).Error; err != nil {
				tx.Rollback()
				return err
			}
		}
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
		if _, err := uc.cashBookRepo.DeleteByProfitSharingPeriod(existing.ID, outletID...); err != nil {
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

	// Load people for this period
	people, _ := uc.profitSharingPersonRepo.GetByPeriodID(existing.ID)

	ownerPct := existing.OwnerPct
	if ownerPct <= 0 {
		ownerPct = 60
	}

	result := calcFinancials(basis, cogs, expenses, ratio, products, ownerPct, people)

	// Update people amounts in DB
	if len(people) > 0 {
		if err := uc.profitSharingPersonRepo.BulkUpsert(people); err != nil {
			tx.Rollback()
			return err
		}
	}

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
		"basis_type":     existing.BasisType,
		"owner_pct":      ownerPct,
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
		uc.cashBookRepo.DeleteByProfitSharingPeriod(existing.ID, outletID...)
	}

	// Delete people
	uc.profitSharingPersonRepo.DeleteByPeriodID(existing.ID)

	return uc.periodRepo.Delete(id)
}

func (uc *ProfitSharingUsecase) GetAll(outletID ...uint) ([]entity.ProfitSharingPeriod, error) {
	return uc.periodRepo.FindAll(outletID...)
}

// GetPeople returns the list of people for a given period.
func (uc *ProfitSharingUsecase) GetPeople(periodID uint) ([]entity.ProfitSharingPerson, error) {
	return uc.profitSharingPersonRepo.GetByPeriodID(periodID)
}

// SetLeave marks a person as on leave and sets their reduction amount.
// The reduction amount is the share that goes back to the owner.
func (uc *ProfitSharingUsecase) SetLeave(periodID uint, personID uint, isOnLeave bool, reduction float64) error {
	person, err := uc.profitSharingPersonRepo.GetByID(personID)
	if err != nil {
		return domainErrors.NewNotFoundError("orang")
	}
	if person.PeriodID != periodID {
		return domainErrors.NewInvalidInputError("orang tidak termasuk dalam periode ini")
	}
	if person.Role == "owner" {
		return domainErrors.NewInvalidInputError("pemilik tidak bisa ditandai cuti")
	}
	return uc.profitSharingPersonRepo.UpdateLeaveStatus(personID, isOnLeave, reduction)
}

// AddPerson adds a new person to a period.
func (uc *ProfitSharingUsecase) AddPerson(periodID uint, person entity.ProfitSharingPerson) error {
	period, err := uc.periodRepo.FindByID(periodID)
	if err != nil {
		return domainErrors.NewNotFoundError("periode")
	}
	if period.Status != "draft" {
		return domainErrors.NewInvalidInputError("hanya periode draft yang bisa diubah orangnya")
	}
	person.PeriodID = periodID
	return uc.profitSharingPersonRepo.BulkUpsert([]entity.ProfitSharingPerson{person})
}

// RemovePerson removes a person from a period.
func (uc *ProfitSharingUsecase) RemovePerson(periodID uint, personID uint) error {
	period, err := uc.periodRepo.FindByID(periodID)
	if err != nil {
		return domainErrors.NewNotFoundError("periode")
	}
	if period.Status != "draft" {
		return domainErrors.NewInvalidInputError("hanya periode draft yang bisa diubah orangnya")
	}
	return uc.profitSharingPersonRepo.DeleteByPeriodID(periodID)
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
	return t.Format("2006-01-02")
}
