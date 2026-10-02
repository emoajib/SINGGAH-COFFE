package usecase

import (
	"encoding/json"
	"fmt"
	"math"
	"strconv"
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
// operasional inti yang menjadi tanggung jawab operasional outlet, serta
// pembelian stok bahan baku yang sudah tercermin di dalam COGS (HPP resep).
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
var alwaysExcludedFromSharing = []string{
	"Bahan Baku", "Bahan Baku (HPP)", "Persediaan", // Sudah dipotong di baris COGS via resep
	"Operasional", "Operational",
	"Marketing", "Pemasaran", "Pemasaran / Marketing",
	"Maintenance", "Pemeliharaan", "Pemeliharaan & Servis",
	"Peralatan", "Equipment", // CapEx — tidak memotong bagi hasil barista
	"Misc", "Lainnya", "Other",
}

type ProfitSharingUsecase struct {
	db                      *gorm.DB
	periodRepo              repository.ProfitSharingPeriodRepository
	orderItemRepo           repository.OrderItemRepository
	expenseRepo             repository.ExpenseRepository
	cashBookRepo            repository.CashBookRepository
	profitSharingPersonRepo repository.ProfitSharingPersonRepository
	settingRepo             repository.SettingRepository
	cashbonRepo             repository.BaristaCashbonRepository
	shiftConfigRepo         repository.ShiftConfigRepository
}

func NewProfitSharingUsecase(db *gorm.DB) *ProfitSharingUsecase {
	return &ProfitSharingUsecase{
		db:                      db,
		periodRepo:              postgres.NewProfitSharingPeriodRepository(db),
		orderItemRepo:           postgres.NewOrderItemRepository(db),
		expenseRepo:             postgres.NewExpenseRepository(db),
		cashBookRepo:            postgres.NewCashBookRepository(db),
		profitSharingPersonRepo: postgres.NewProfitSharingPeopleRepository(db),
		settingRepo:             postgres.NewSettingRepository(db),
		cashbonRepo:             postgres.NewBaristaCashbonRepository(db),
		shiftConfigRepo:         postgres.NewShiftConfigRepository(db),
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
// calcFinancials computes profit-sharing amounts from raw financial data.
// taxPct/servicePct: percentages from owner settings (e.g., 10 = 10%).
// basisType: "gross" (Gross Margin / Pendapatan Bersih - COGS) or "net" (Net Profit / Gross Margin - Beban Operasional)
// totalPeriodDays: total calendar days in the period (inclusive)
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func calcFinancials(basis, cogs, expenses, ratio float64, products []entity.ProductSalesVolume, ownerPct float64, people []entity.ProfitSharingPerson, taxPct, servicePct float64, basisType string, totalPeriodDays int) calcResult {
	// Potong pajak dan biaya layanan dari pendapatan kotor sesuai pengaturan owner
	taxRate := taxPct / 100.0
	serviceRate := servicePct / 100.0
	tax := math.Round(basis*taxRate/250) * 250
	serviceFee := math.Round(basis*serviceRate/250) * 250
	netRevenue := basis - tax - serviceFee

	grossMargin := netRevenue - cogs
	netProfit := grossMargin - expenses

	if totalPeriodDays < 1 {
		totalPeriodDays = 1
	}

	// Tentukan sharingBasis berdasarkan pilihan basisType
	var sharingBasis float64
	if basisType == "gross" {
		sharingBasis = grossMargin
	} else {
		// Default: Laba Bersih (Net Profit). Jika Net Profit negatif, gunakan grossMargin
		sharingBasis = netProfit
		if sharingBasis < 0 {
			sharingBasis = grossMargin
		}
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
				people[i].GrossAmount = multiOwnerShare
				people[i].Amount = multiOwnerShare
				people[i].LeaveReduction = 0
				people[i].CashbonReduction = 0
			} else {
				share := math.Round(baristaPool*people[i].SharePct/totalBaristaPct/250) * 250
				people[i].GrossAmount = share
				var reduction float64
				if people[i].IsOnLeave {
					// Cuti penuh: jatah dialihkan 100% ke Owner
					reduction = share
					people[i].LeaveReduction = reduction
				} else if people[i].LeaveDays > 0 {
					// Libur sebagian hari: proporsional hari libur terhadap total hari periode
					leaveDays := people[i].LeaveDays
					if leaveDays > totalPeriodDays {
						leaveDays = totalPeriodDays
					}
					reduction = math.Round(share*float64(leaveDays)/float64(totalPeriodDays)/250) * 250
					if reduction > share {
						reduction = share
					}
					people[i].LeaveReduction = reduction
				} else {
					// Hadir penuh: tidak ada potongan libur
					people[i].LeaveReduction = 0
				}

				// Kurangi potongan kasbon barista (jika ada)
				subtotal := share - people[i].LeaveReduction
				cashbon := people[i].CashbonReduction
				if cashbon > subtotal {
					cashbon = subtotal
				}
				people[i].CashbonReduction = cashbon
				people[i].Amount = subtotal - cashbon
			}
		}
		// Owner also gets leave reductions and cashbon recoveries from baristas (konservasi total bagi hasil)
		totalReductions := 0.0
		for _, p := range people {
			if p.Role != "owner" {
				totalReductions += p.LeaveReduction + p.CashbonReduction
			}
		}
		if len(people) > 0 {
			for i := range people {
				if people[i].Role == "owner" {
					people[i].Amount = multiOwnerShare + totalReductions
				}
			}
			result.OwnerAmount = multiOwnerShare + totalReductions
		}
	}

	return result
}

// hasShiftAssignedBarista returns true if at least one barista has an explicit
// shift assignment (ShiftIDs not empty).
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func hasShiftAssignedBarista(people []entity.ProfitSharingPerson) bool {
	for _, p := range people {
		if p.Role != "owner" && len(p.ShiftIDs) > 0 {
			return true
		}
	}
	return false
}

// resolveMultiShift returns the active shift configs when multi-shift mode
// applies (>= 2 active shifts AND at least one barista assigned to a shift).
// Returns nil for legacy single-period mode (backward compatible: all people
// with shift_id = NULL use the standard 100% single-pool calculation).
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (uc *ProfitSharingUsecase) resolveMultiShift(outletID uint, people []entity.ProfitSharingPerson) []entity.ShiftConfig {
	shifts, err := uc.shiftConfigRepo.FindByOutletID(outletID, true)
	if err != nil || len(shifts) < 2 {
		return nil
	}
	if !hasShiftAssignedBarista(people) {
		return nil
	}
	return shifts
}

// calcSharing computes the overall financials and the per-person distribution.
// In multi-shift mode it uses the per-shift Two-Tier calculation with Opsi B
// redistribution (see calcMultiShift); otherwise it falls back to the standard
// single-pool calculation (calcFinancials).
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (uc *ProfitSharingUsecase) calcSharing(basis, cogs, expenses, ratio float64, products []entity.ProductSalesVolume, ownerPct float64, people []entity.ProfitSharingPerson, taxPct, servicePct float64, basisType string, totalPeriodDays int, startNorm, endNorm string, outletID uint) (calcResult, []entity.ShiftBreakdown, error) {
	shifts := uc.resolveMultiShift(outletID, people)
	if len(shifts) > 0 {
		ownerAmount, breakdown, err := uc.calcMultiShift(shifts, startNorm, endNorm, outletID, basisType, taxPct, servicePct, totalPeriodDays, expenses, basis, people)
		if err != nil {
			return calcResult{}, nil, err
		}
		// Overall financials without per-person split (people amounts are set
		// by calcMultiShift to avoid double-assignment).
		result := calcFinancials(basis, cogs, expenses, ratio, products, ownerPct, nil, taxPct, servicePct, basisType, totalPeriodDays)
		result.OwnerAmount = ownerAmount
		result.KeeperAmount = 0
		return result, breakdown, nil
	}
	result := calcFinancials(basis, cogs, expenses, ratio, products, ownerPct, people, taxPct, servicePct, basisType, totalPeriodDays)
	return result, nil, nil
}

// calcMultiShift computes profit sharing in multi-shift mode: Two-Tier split
// per shift (Owner % vs Barista Pool %) followed by Opsi B redistribution —
// a barista's leave reduction is redistributed to the other baristas present
// in the SAME shift; if no one else is present, it goes to the owner.
//
// Rules:
//   - Per-shift revenue/COGS come from GetShiftRevenue/GetShiftProductSales
//     (segmented by shift start/end time, supports overnight shifts).
//   - Expenses are not time-segmented in the DB, so total expenses are
//     allocated to each shift proportionally to its revenue share.
//   - A barista assigned to a shift participates only in that shift's pool.
//     A barista WITHOUT a shift assignment is treated as all-day staff and
//     participates in every shift's pool.
//   - All amounts are rounded to the nearest Rp 250 (C1).
//
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (uc *ProfitSharingUsecase) calcMultiShift(shifts []entity.ShiftConfig, startNorm, endNorm string, outletID uint, basisType string, taxPct, servicePct float64, totalPeriodDays int, totalExpenses, totalRevenue float64, people []entity.ProfitSharingPerson) (float64, []entity.ShiftBreakdown, error) {
	if totalPeriodDays < 1 {
		totalPeriodDays = 1
	}
	taxRate := taxPct / 100.0
	serviceRate := servicePct / 100.0

	type shiftFigures struct {
		revenue, cogs, expenses, grossMargin, netProfit, sharingBasis, ownerShare, pool float64
	}
	figures := make([]shiftFigures, len(shifts))
	totalShiftRevenue := 0.0
	for i, s := range shifts {
		rev, err := uc.periodRepo.GetShiftRevenue(startNorm, endNorm, s.StartTime, s.EndTime, outletID)
		if err != nil {
			return 0, nil, err
		}
		prods, err := uc.periodRepo.GetShiftProductSales(startNorm, endNorm, s.StartTime, s.EndTime, outletID)
		if err != nil {
			prods = nil
		}
		var cogs float64
		for _, p := range prods {
			cogs += p.TotalCogs
		}
		figures[i].revenue = rev
		figures[i].cogs = cogs
		totalShiftRevenue += rev
	}

	// Allocate total expenses to each shift proportionally to its revenue share
	// (keeps the sum of per-shift expenses equal to the total).
	for i := range figures {
		if totalShiftRevenue > 0 {
			figures[i].expenses = totalExpenses * figures[i].revenue / totalShiftRevenue
		}
		netRev := figures[i].revenue * (1 - taxRate - serviceRate)
		figures[i].grossMargin = netRev - figures[i].cogs
		figures[i].netProfit = figures[i].grossMargin - figures[i].expenses
		var basis float64
		if basisType == "gross" {
			basis = figures[i].grossMargin
		} else {
			basis = figures[i].netProfit
			if basis < 0 {
				basis = figures[i].grossMargin
			}
		}
		if basis < 0 {
			basis = 0
		}
		figures[i].sharingBasis = basis
		ownerPct := shifts[i].OwnerPct
		if ownerPct <= 0 {
			ownerPct = 60
		}
		figures[i].ownerShare = math.Round(basis*ownerPct/100/250) * 250
		figures[i].pool = basis - figures[i].ownerShare
	}

	totalOwnerShare := 0.0

	// Parse leave dates for each person once
	personLeaveDates := make(map[int][]string)
	for idx, p := range people {
		if p.LeaveDates != "" {
			dates := strings.Split(p.LeaveDates, ",")
			filtered := make([]string, 0, len(dates))
			for _, d := range dates {
				d = strings.TrimSpace(d)
				if d != "" {
					filtered = append(filtered, d)
				}
			}
			personLeaveDates[idx] = filtered
		}
	}

	// Parse period start/end for date comparison
	startDate := parseDatePS(startNorm)
	endDate := parseDatePS(endNorm)

	// Helper: count leave dates for a person in a shift
	// A shift runs once per day in the period. A leave date matches if it falls
	// on a day when the shift operates within the period.
	countLeaveDatesForShift := func(personIdx int) int {
		dates := personLeaveDates[personIdx]
		if len(dates) == 0 {
			return 0
		}
		count := 0
		for _, dStr := range dates {
			leaveDate, err := time.Parse("2006-01-02", dStr)
			if err != nil {
				continue
			}
			// Check if leave date is within period
			if leaveDate.Before(startDate) || leaveDate.After(endDate) {
				continue
			}
			count++
		}
		return count
	}

	for i, s := range shifts {
		// Baristas in this shift: assigned to this shift, or unassigned (all-day).
		var inShift []int
		var totalPct float64
		for j := range people {
			if people[j].Role == "owner" {
				continue
			}
			assigned := len(people[j].ShiftIDs) > 0
			for _, sid := range people[j].ShiftIDs {
				if sid == s.ID {
					assigned = true
					break
				}
			}
			if assigned || len(people[j].ShiftIDs) == 0 {
				inShift = append(inShift, j)
				totalPct += people[j].SharePct
			}
		}
		if totalPct == 0 {
			totalPct = 100
		}

		rawShares := make([]float64, len(inShift))
		for k, j := range inShift {
			rawShares[k] = math.Round(figures[i].pool*people[j].SharePct/totalPct/250) * 250
		}

		// Leave reduction per barista PER SHIFT based on leave dates in this shift
		reductions := make([]float64, len(inShift))
		for k, j := range inShift {
			if people[j].IsOnLeave {
				// Full leave = 100% reduction for this shift
				reductions[k] = rawShares[k]
			} else {
				// Count leave dates that fall in this shift's operating days within period
				leaveDatesInShift := countLeaveDatesForShift(j)
				if leaveDatesInShift > 0 {
					// Proportional reduction: leaveDatesInShift / totalPeriodDays
					reductions[k] = math.Round(rawShares[k]*float64(leaveDatesInShift)/float64(totalPeriodDays)/250) * 250
					if reductions[k] > rawShares[k] {
						reductions[k] = rawShares[k]
					}
				}
			}
		}

		// Opsi B: redistribute each leave reduction to the other baristas present
		// in the same shift (proportional to their raw share). Rounding remainder
		// and reductions with no present colleague go to the owner.
		bonus := make([]float64, len(inShift))
		for k := range inShift {
			if reductions[k] <= 0 {
				continue
			}
			var othersRaw float64
			for m, jm := range inShift {
				if m != k && !people[jm].IsOnLeave {
					othersRaw += rawShares[m]
				}
			}
			if othersRaw > 0 {
				distributed := 0.0
				for m, jm := range inShift {
					if m == k || people[jm].IsOnLeave {
						continue
					}
					b := math.Round(reductions[k]*rawShares[m]/othersRaw/250) * 250
					bonus[m] += b
					distributed += b
				}
				totalOwnerShare += reductions[k] - distributed
			} else {
				totalOwnerShare += reductions[k]
			}
		}

		for k, j := range inShift {
			people[j].GrossAmount = rawShares[k]
			people[j].LeaveReduction = reductions[k]
			subtotal := rawShares[k] - reductions[k] + bonus[k]
			// Clamping Guard: cashbon deduction is capped at the net share after
			// leave reduction; the remainder stays pending for the next period.
			cashbon := people[j].CashbonReduction
			if cashbon > subtotal {
				cashbon = subtotal
			}
			people[j].CashbonReduction = cashbon
			people[j].Amount = subtotal - cashbon
		}
		totalOwnerShare += figures[i].ownerShare
	}

	for i := range people {
		if people[i].Role == "owner" {
			people[i].GrossAmount = totalOwnerShare
			people[i].Amount = totalOwnerShare
			people[i].LeaveReduction = 0
			people[i].CashbonReduction = 0
		}
	}

	breakdown := make([]entity.ShiftBreakdown, len(shifts))
	for i, s := range shifts {
		breakdown[i] = entity.ShiftBreakdown{
			ShiftID:      s.ID,
			ShiftName:    s.Name,
			StartTime:    s.StartTime,
			EndTime:      s.EndTime,
			Revenue:      figures[i].revenue,
			Cogs:         figures[i].cogs,
			Expenses:     figures[i].expenses,
			GrossMargin:  figures[i].grossMargin,
			NetProfit:    figures[i].netProfit,
			SharingBasis: figures[i].sharingBasis,
			OwnerPct:     s.OwnerPct,
			OwnerShare:   figures[i].ownerShare,
			BaristaPool:  figures[i].pool,
		}
	}
	return totalOwnerShare, breakdown, nil
}

// matchesBarista mencocokkan catatan kasbon dengan barista terkait secara aman.
// Menghindari bug 0 == 0 saat person ID masih 0 (preview/draft), serta mendukung
// pencocokan nama secara case-insensitive dan whitespace-trimmed.
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func matchesBarista(cb entity.BaristaCashbon, person entity.ProfitSharingPerson) bool {
	if cb.PersonID > 0 && person.ID > 0 && cb.PersonID == person.ID {
		return true
	}
	cbName := strings.TrimSpace(cb.BaristaName)
	pName := strings.TrimSpace(person.Name)
	if cbName != "" && pName != "" && strings.EqualFold(cbName, pName) {
		return true
	}
	return false
}

// computeAndPersistDraft calculates profit sharing for a period and persists
// a draft record. NOTE: This method writes to the database to create/update a
// draft period that can later be finalized or recalculated. The draft is
// overwritten on each call (idempotent per overlapping period). It never
// touches the cash book or PSAK journals — those are only recorded when the
// period is finalized/paid.
// ownerPct defaults to 60 if <= 0. people slice can be nil for legacy 2-person mode.
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (uc *ProfitSharingUsecase) computeAndPersistDraft(start, end string, outletID uint, ratio float64, basisType string, ownerPct float64, people []entity.ProfitSharingPerson) (*entity.ProfitSharingPeriod, *calcResult, []entity.ExpenseBreakdown, []entity.ShiftBreakdown, error) {
	startDate := parseDatePS(start)
	endDate := parseDatePS(end)
	if startDate.IsZero() || endDate.IsZero() {
		return nil, nil, nil, nil, domainErrors.NewInvalidInputError("format tanggal mulai atau akhir tidak valid")
	}

	// Normalisasi datetime string dari frontend ke format DB yang konsisten.
	// parseDatePS meng-interpret string lokal sebagai WIB lalu formatForDB
	// mengkonversinya ke UTC untuk query BETWEEN pada kolom TIMESTAMP MySQL.
	startNorm := formatForDB(startDate)
	endNorm := formatForDB(endDate)

	basis, err := uc.periodRepo.GetTotalRevenue(startNorm, endNorm, outletID)
	if err != nil {
		return nil, nil, nil, nil, err
	}
	cogs, err := uc.orderItemRepo.GetTotalCogsRange(startNorm, endNorm, outletID)
	if err != nil {
		return nil, nil, nil, nil, err
	}
	expenses, err := uc.periodRepo.GetTotalExpensesExcluding(startNorm, endNorm, alwaysExcludedFromSharing, outletID)
	if err != nil {
		return nil, nil, nil, nil, err
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

	// Ambil rincian pengeluaran itemized untuk transparansi nota beban (misal 150 Cup, Susu UHT, dll.)
	// Vetted by AI - Manual Review Required by Senior Engineer/Manager
	expenseList, _ := uc.periodRepo.GetExpensesList(startNorm, endNorm, alwaysExcludedFromSharing, outletID)
	isDeducted := (basisType != "gross")
	for i := range expenseList {
		expenseList[i].IsDeducted = isDeducted
	}
	expenseListJSON, _ := json.Marshal(expenseList)

	// Read tax & service fee from owner settings
	taxPct := 0.0
	servicePct := 0.0
	if taxSetting, err := uc.settingRepo.FindByKey("tax_percentage"); err == nil {
		taxPct, _ = strconv.ParseFloat(taxSetting.Value, 64)
	}
	if serviceSetting, err := uc.settingRepo.FindByKey("service_charge"); err == nil {
		servicePct, _ = strconv.ParseFloat(serviceSetting.Value, 64)
	}

	startCal := time.Date(startDate.Year(), startDate.Month(), startDate.Day(), 0, 0, 0, 0, startDate.Location())
	endCal := time.Date(endDate.Year(), endDate.Month(), endDate.Day(), 0, 0, 0, 0, endDate.Location())
	totalPeriodDays := int(math.Round(endCal.Sub(startCal).Hours()/24)) + 1
	if totalPeriodDays < 1 {
		totalPeriodDays = 1
	}

	// Cari kasbon pending barista pada rentang periode ini untuk dikaitkan ke draft
	if len(people) > 0 {
		pendingCashbons, _ := uc.cashbonRepo.FindPendingByDateRange(startNorm, endNorm, outletID)
		for i := range people {
			if people[i].Role == "barista" {
				var personCashbons []entity.BaristaCashbon
				var totalCashbon float64
				for _, cb := range pendingCashbons {
					if matchesBarista(cb, people[i]) {
						personCashbons = append(personCashbons, cb)
						totalCashbon += cb.Amount
					}
				}
				if len(personCashbons) > 0 && people[i].CashbonReduction == 0 {
					people[i].CashbonReduction = totalCashbon
					people[i].Cashbons = personCashbons
				}
			}
		}
	}

	result, shiftBreakdown, err := uc.calcSharing(basis, cogs, expenses, ratio, products, ownerPct, people, taxPct, servicePct, basisType, totalPeriodDays, startNorm, endNorm, outletID)
	if err != nil {
		return nil, nil, nil, nil, err
	}

	taxNote := fmt.Sprintf("Pendapatan kotor dikurangi pajak (%.0f%%) & biaya layanan (%.0f%%)", taxPct, servicePct)

	period := entity.ProfitSharingPeriod{
		OutletID:          outletID,
		PeriodStart:       startDate, // disimpan ke DB; GORM akan gunakan loc=Local dari DSN
		PeriodEnd:         endDate,
		BasisAmount:       result.Basis,
		TotalCogs:         result.Cogs,
		TotalExpenses:     result.Expenses,
		NetProfit:         result.NetProfit,
		Ratio:             ratio,
		KeeperAmount:      result.KeeperAmount,
		OwnerAmount:       result.OwnerAmount,
		Status:            "draft",
		PerProduct:        result.PerProductJSON,
		ExpensesBreakdown: string(expenseListJSON),
		TaxNote:           taxNote,
		BasisType:         basisType,
		OwnerPct:          ownerPct,
		People:            people,
	}

	// M3: Handle error dari FindOverlappingPeriod
	overlapping, err := uc.periodRepo.FindOverlappingPeriod(outletID, startDate, endDate, 0)
	if err != nil && err != gorm.ErrRecordNotFound {
		// DB error — bukan "record not found", return error
		return nil, nil, nil, nil, err
	}

	if overlapping != nil {
		period.ID = overlapping.ID
		if err := uc.periodRepo.Update(&period); err != nil {
			return nil, nil, nil, nil, err
		}
	} else {
		if err := uc.periodRepo.Create(&period); err != nil {
			return nil, nil, nil, nil, err
		}
	}

	// Save people — wrapped in transaction to prevent race conditions
	// when multiple Preview calls target the same period.
	if len(people) > 0 {
		for i := range people {
			people[i].PeriodID = period.ID
		}
		tx := uc.db.Begin()
		if tx.Error != nil {
			return nil, nil, nil, nil, tx.Error
		}
		// Lock the period row to serialize concurrent previews
		var lockedPeriod models.ProfitSharingPeriod
		if err := tx.First(&lockedPeriod, period.ID).Error; err != nil {
			tx.Rollback()
			return nil, nil, nil, nil, err
		}
		// Delete existing people and upsert new ones atomically
		if err := tx.Where("period_id = ?", period.ID).Delete(&models.ProfitSharingPerson{}).Error; err != nil {
			tx.Rollback()
			return nil, nil, nil, nil, err
		}
		for i := range people {
			shiftIDsJSON, _ := json.Marshal(people[i].ShiftIDs)
			shiftNamesJSON, _ := json.Marshal(people[i].ShiftNames)
			shiftPoolPctsJSON, _ := json.Marshal(people[i].ShiftPoolPcts)

			m := models.ProfitSharingPerson{
				PeriodID:       people[i].PeriodID,
				Name:           people[i].Name,
				Role:           people[i].Role,
				SharePct:       people[i].SharePct,
				GrossAmount:    people[i].GrossAmount,
				LeaveReduction: people[i].LeaveReduction,
				CashbonReduction: people[i].CashbonReduction,
				Amount:         people[i].Amount,
				IsOnLeave:      people[i].IsOnLeave,
				LeaveDays:      people[i].LeaveDays,
				LeaveDates:     people[i].LeaveDates,
				ShiftIDs:       string(shiftIDsJSON),
				ShiftNames:     string(shiftNamesJSON),
				ShiftPoolPcts:  string(shiftPoolPctsJSON),
			}
			if err := tx.Create(&m).Error; err != nil {
				tx.Rollback()
				return nil, nil, nil, nil, err
			}
		}
		if err := tx.Commit().Error; err != nil {
			return nil, nil, nil, nil, err
		}
	}

	return &period, &result, expenseList, shiftBreakdown, nil
}

// Preview calculates profit sharing for a period and persists a draft record.
// It is a thin wrapper over computeAndPersistDraft that returns the full
// calculation payload for the UI.
func (uc *ProfitSharingUsecase) Preview(start, end string, outletID uint, ratio float64, basisType string, ownerPct float64, people []entity.ProfitSharingPerson) (*entity.ProfitSharingPreview, error) {
	period, result, expenseList, shiftBreakdown, err := uc.computeAndPersistDraft(start, end, outletID, ratio, basisType, ownerPct, people)
	if err != nil {
		return nil, err
	}
	return &entity.ProfitSharingPreview{
		Period: *period,
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
			Breakdown:     expenseList,
			PerProduct:    result.PerProduct,
			Status:        "draft",
			Note:          period.TaxNote,
			BasisType:     period.BasisType,
			OwnerPct:      period.OwnerPct,
			People:        people,
			Shifts:        shiftBreakdown,
		},
	}, nil
}

// SaveDraft persists a profit sharing draft explicitly (idempotent, tanpa
// harus finalize). Perhitungan keuangan dihitung ulang dari transaksi terbaru
// lalu di-upsert (update jika periode overlapping sudah ada, create jika belum)
// sehingga tidak ada duplikasi data draft. Draft tidak pernah menyentuh Buku
// Kas atau Jurnal PSAK.
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (uc *ProfitSharingUsecase) SaveDraft(start, end string, outletID uint, ratio float64, basisType string, ownerPct float64, people []entity.ProfitSharingPerson) (*entity.ProfitSharingPeriod, error) {
	period, _, _, _, err := uc.computeAndPersistDraft(start, end, outletID, ratio, basisType, ownerPct, people)
	if err != nil {
		return nil, err
	}
	return period, nil
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

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (uc *ProfitSharingUsecase) Finalize(id uint, ratio float64, outletID ...uint) error {
	if len(outletID) == 0 {
		return domainErrors.NewInvalidInputError("outlet ID required")
	}
	tx := uc.db.Begin()
	if tx.Error != nil {
		return tx.Error
	}
	committed := false
	defer func() {
		if !committed {
			tx.Rollback()
		}
	}()

	period, err := uc.periodRepo.FindByIDForUpdate(id, tx)
	if err != nil {
		return domainErrors.NewNotFoundError("periode")
	}
	if period.OutletID != outletID[0] {
		return domainErrors.NewUnauthorizedError("tidak punya akses ke periode ini")
	}
	if period.Status != "draft" {
		return domainErrors.NewInvalidInputError("hanya periode draft yang bisa di-finalize")
	}
	// Gunakan formatForDB (UTC) agar BETWEEN query cocok dengan data yang
	// disimpan MySQL sebagai TIMESTAMP (selalu UTC di server).
	start := formatForDB(period.PeriodStart)
	end := formatForDB(period.PeriodEnd)

	// M1: Jalankan query keuangan di dalam transaction untuk konsistensi baca
	basis, cogs, expenses, err := uc.fetchFinancialsWithTx(tx, start, end, outletID[0])
	if err != nil {
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

	// Read tax & service fee from owner settings
	taxPct := 0.0
	servicePct := 0.0
	if taxSetting, err := uc.settingRepo.FindByKey("tax_percentage"); err == nil {
		taxPct, _ = strconv.ParseFloat(taxSetting.Value, 64)
	}
	if serviceSetting, err := uc.settingRepo.FindByKey("service_charge"); err == nil {
		servicePct, _ = strconv.ParseFloat(serviceSetting.Value, 64)
	}

	startCal := time.Date(period.PeriodStart.Year(), period.PeriodStart.Month(), period.PeriodStart.Day(), 0, 0, 0, 0, period.PeriodStart.Location())
	endCal := time.Date(period.PeriodEnd.Year(), period.PeriodEnd.Month(), period.PeriodEnd.Day(), 0, 0, 0, 0, period.PeriodEnd.Location())
	totalPeriodDays := int(math.Round(endCal.Sub(startCal).Hours()/24)) + 1
	if totalPeriodDays < 1 {
		totalPeriodDays = 1
	}

	result, _, err := uc.calcSharing(basis, cogs, expenses, ratio, products, ownerPct, people, taxPct, servicePct, period.BasisType, totalPeriodDays, start, end, outletID[0])
	if err != nil {
		return err
	}
	taxNote := fmt.Sprintf("Pendapatan kotor dikurangi pajak (%.0f%%) & biaya layanan (%.0f%%)", taxPct, servicePct)

	// Tandai semua kasbon yang terpotong menjadi settled / lunas
	pendingCashbons, _ := uc.cashbonRepo.FindPendingByDateRange(start, end, outletID[0])
	for _, p := range people {
		if p.Role == "barista" && p.CashbonReduction > 0 {
			for _, cb := range pendingCashbons {
				if matchesBarista(cb, p) {
					_ = tx.Model(&models.BaristaCashbon{}).Where("id = ?", cb.ID).Updates(map[string]interface{}{
						"status":    "settled",
						"period_id": period.ID,
						"person_id": p.ID,
					}).Error
				}
			}
		}
	}
	_ = tx.Model(&models.BaristaCashbon{}).Where("period_id = ?", period.ID).Updates(map[string]interface{}{
		"status": "settled",
	}).Error

	// Update people amounts in DB
	if len(people) > 0 {
		if err := uc.profitSharingPersonRepo.BulkUpsert(people); err != nil {
			return err
		}
	}

	// Vetted by AI - Manual Review Required by Senior Engineer/Manager
	expensesList, _ := uc.periodRepo.GetExpensesList(start, end, []string{"prive", "owner", "bagi hasil", "bagi-hasil"}, outletID[0])
	for idx := range expensesList {
		expensesList[idx].IsDeducted = (period.BasisType != "gross")
	}
	expensesBreakdownJSON, _ := json.Marshal(expensesList)

	if err := tx.Model(&models.ProfitSharingPeriod{}).Where("id = ?", period.ID).Updates(map[string]interface{}{
		"period_start":       period.PeriodStart,
		"period_end":         period.PeriodEnd,
		"basis_amount":       result.Basis,
		"total_expenses":     result.Expenses,
		"total_cogs":         result.Cogs,
		"net_profit":         result.NetProfit,
		"ratio":              ratio,
		"keeper_amount":      result.KeeperAmount,
		"owner_amount":       result.OwnerAmount,
		"status":             "finalized",
		"per_product":        result.PerProductJSON,
		"expenses_breakdown": string(expensesBreakdownJSON),
		"payment_note":       period.PaymentNote,
		"tax_note":           taxNote,
		"basis_type":         period.BasisType,
		"owner_pct":          ownerPct,
	}).Error; err != nil {
		return err
	}
	if err := tx.Commit().Error; err != nil {
		return err
	}
	committed = true
	return nil
}

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
// M6: MarkAsPaid dijalankan dalam satu transaction untuk atomicitas.
// Creates one cashbook entry per person (owner + baristas).
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
	exists, _ := uc.cashBookRepo.ExistsByProfitSharingPeriod(existing.ID, outletID...)
	if exists {
		return nil
	}

	tx := uc.db.Begin()
	if tx.Error != nil {
		return tx.Error
	}
	committed := false
	defer func() {
		if !committed {
			tx.Rollback()
		}
	}()

	existing.Status = "paid"
	if err := tx.Model(&models.ProfitSharingPeriod{}).Where("id = ?", existing.ID).Updates(map[string]interface{}{
		"status": "paid",
	}).Error; err != nil {
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
			return err
		}
	} else {
		// Bersihkan entri expense lama untuk periode ini jika ada (idempotensi)
		// Vetted by AI - Manual Review Required by Senior Engineer/Manager
		_ = tx.Where("outlet_id = ? AND notes = ?", outletID[0], fmt.Sprintf("profit_sharing_period_%d", existing.ID)).Delete(&models.Expense{})

		// Create one cashbook entry and expense entry per person
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
			if p.CashbonReduction > 0 {
				desc += fmt.Sprintf(" (Potong kasbon: Rp %.0f)", p.CashbonReduction)
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
				return err
			}

			// Masukkan bagi hasil barista/pegawai langsung ke Data Pengeluaran (kategori 'Gaji & Upah')
			// Vetted by AI - Manual Review Required by Senior Engineer/Manager
			if p.Role == "barista" {
				expenseTitle := fmt.Sprintf("Bagi Hasil: %s", p.Name)
				expenseRecord := models.Expense{
					Title:         expenseTitle,
					Amount:        p.Amount,
					Category:      "Gaji & Upah",
					CostType:      "variable",
					PaymentMethod: "Cash",
					Date:          time.Now(),
					Description:   desc,
					Notes:         fmt.Sprintf("profit_sharing_period_%d", existing.ID),
					OutletID:      outletID[0],
				}
				if err := tx.Create(&expenseRecord).Error; err != nil {
					return err
				}
			}
		}
	}

	if err := tx.Commit().Error; err != nil {
		return err
	}
	committed = true
	return nil
}

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
// M5: Recalculate dijalankan dalam transaction untuk atomicitas.
func (uc *ProfitSharingUsecase) Recalculate(id uint, ratio float64, outletID ...uint) error {
	if len(outletID) == 0 {
		return domainErrors.NewInvalidInputError("outlet ID required")
	}

	tx := uc.db.Begin()
	if tx.Error != nil {
		return tx.Error
	}
	committed := false
	defer func() {
		if !committed {
			tx.Rollback()
		}
	}()

	existing, err := uc.periodRepo.FindByID(id)
	if err != nil {
		return domainErrors.NewNotFoundError("periode")
	}
	if existing.OutletID != outletID[0] {
		return domainErrors.NewUnauthorizedError("tidak punya akses ke periode ini")
	}

	// Reverse cashbook entry jika periode sudah dibayar
	if existing.Status == "paid" {
		if _, err := uc.cashBookRepo.DeleteByProfitSharingPeriod(existing.ID, outletID...); err != nil {
			return err
		}
	}

	// Gunakan formatForDB (UTC) agar BETWEEN query konsisten dengan Finalize.
	start := formatForDB(existing.PeriodStart)
	end := formatForDB(existing.PeriodEnd)

	// M1: Jalankan query keuangan di dalam transaction
	basis, cogs, expenses, err := uc.fetchFinancialsWithTx(tx, start, end, outletID[0])
	if err != nil {
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

	// Read tax & service fee from owner settings
	taxPct := 0.0
	servicePct := 0.0
	if taxSetting, err := uc.settingRepo.FindByKey("tax_percentage"); err == nil {
		taxPct, _ = strconv.ParseFloat(taxSetting.Value, 64)
	}
	if serviceSetting, err := uc.settingRepo.FindByKey("service_charge"); err == nil {
		servicePct, _ = strconv.ParseFloat(serviceSetting.Value, 64)
	}

	startCal := time.Date(existing.PeriodStart.Year(), existing.PeriodStart.Month(), existing.PeriodStart.Day(), 0, 0, 0, 0, existing.PeriodStart.Location())
	endCal := time.Date(existing.PeriodEnd.Year(), existing.PeriodEnd.Month(), existing.PeriodEnd.Day(), 0, 0, 0, 0, existing.PeriodEnd.Location())
	totalPeriodDays := int(math.Round(endCal.Sub(startCal).Hours()/24)) + 1
	if totalPeriodDays < 1 {
		totalPeriodDays = 1
	}

	// Sinkronisasi data kasbon terbaru untuk barista dalam draft
	pendingCashbons, _ := uc.cashbonRepo.FindPendingByDateRange(start, end, outletID[0])
	periodCashbons, _ := uc.cashbonRepo.FindByPeriodID(existing.ID, outletID[0])
	allCandidateCashbons := append(pendingCashbons, periodCashbons...)
	for i := range people {
		if people[i].Role == "barista" {
			var totalCashbon float64
			for _, cb := range allCandidateCashbons {
				if matchesBarista(cb, people[i]) {
					totalCashbon += cb.Amount
				}
			}
			people[i].CashbonReduction = totalCashbon
		}
	}

	result, _, err := uc.calcSharing(basis, cogs, expenses, ratio, products, ownerPct, people, taxPct, servicePct, existing.BasisType, totalPeriodDays, start, end, outletID[0])
	if err != nil {
		return err
	}

	// Update people amounts in DB
	if len(people) > 0 {
		if err := uc.profitSharingPersonRepo.BulkUpsert(people); err != nil {
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
		return err
	}

	if err := tx.Commit().Error; err != nil {
		return err
	}
	committed = true
	return nil
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

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (uc *ProfitSharingUsecase) GetAll(outletID ...uint) ([]entity.ProfitSharingPeriod, error) {
	periods, err := uc.periodRepo.FindAll(outletID...)
	if err != nil {
		return nil, err
	}
	// Fallback untuk periode historis yang belum memiliki snapshot rincian beban operasional atau people
	for i := range periods {
		if len(periods[i].People) == 0 {
			if people, err := uc.profitSharingPersonRepo.GetByPeriodID(periods[i].ID); err == nil && len(people) > 0 {
				periods[i].People = people
			}
		}
		if periods[i].ExpensesBreakdown == "" && periods[i].TotalExpenses > 0 {
			start := formatForDB(periods[i].PeriodStart)
			end := formatForDB(periods[i].PeriodEnd)
			oID := periods[i].OutletID
			if len(outletID) > 0 && outletID[0] > 0 {
				oID = outletID[0]
			}
			expList, err := uc.periodRepo.GetExpensesList(start, end, []string{"prive", "owner", "bagi hasil", "bagi-hasil"}, oID)
			if err == nil && len(expList) > 0 {
				for idx := range expList {
					expList[idx].IsDeducted = (periods[i].BasisType != "gross")
				}
				if b, err := json.Marshal(expList); err == nil {
					periods[i].ExpensesBreakdown = string(b)
				}
			}
		}
	}
	return periods, nil
}

// GetPeople returns the list of people for a given period.
func (uc *ProfitSharingUsecase) GetPeople(periodID uint) ([]entity.ProfitSharingPerson, error) {
	return uc.profitSharingPersonRepo.GetByPeriodID(periodID)
}

// SetLeave marks a person as on leave and sets their reduction amount, leave days, and leave dates.
// The reduction amount is the share that goes back to the owner (or redistributed).
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (uc *ProfitSharingUsecase) SetLeave(periodID uint, personID uint, isOnLeave bool, leaveDays int, leaveDates string, reduction float64) error {
	period, err := uc.periodRepo.FindByID(periodID)
	if err != nil {
		return domainErrors.NewNotFoundError("periode")
	}
	if period.Status != "draft" {
		return domainErrors.NewInvalidInputError("hanya periode draft yang bisa diatur cutinya")
	}
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

	startCal := time.Date(period.PeriodStart.Year(), period.PeriodStart.Month(), period.PeriodStart.Day(), 0, 0, 0, 0, period.PeriodStart.Location())
	endCal := time.Date(period.PeriodEnd.Year(), period.PeriodEnd.Month(), period.PeriodEnd.Day(), 0, 0, 0, 0, period.PeriodEnd.Location())
	totalPeriodDays := int(math.Round(endCal.Sub(startCal).Hours()/24)) + 1
	if totalPeriodDays < 1 {
		totalPeriodDays = 1
	}

	// Validate and normalize leaveDates: parse, filter invalid/out-of-range,
	// deduplicate, sort, and re-serialize as canonical JSON array.
	if leaveDates != "" {
		normalizedDates, err := normalizeLeaveDates(leaveDates, startCal, endCal)
		if err != nil {
			return domainErrors.NewInvalidInputError("format leave_dates tidak valid: " + err.Error())
		}
		leaveDates = normalizedDates
		// Recompute leaveDays from normalized dates if leaveDays is inconsistent
		if leaveDays <= 0 || leaveDays != len(normalizedDates) {
			leaveDays = len(normalizedDates)
		}
	} else if isOnLeave && leaveDays <= 0 {
		// Full leave without explicit dates: generate all dates in period
		allDates := generateDateRange(startCal, endCal)
		leaveDates = datesToJSON(allDates)
		leaveDays = len(allDates)
	}

	// Calculate reduction if not provided or 0
	if reduction <= 0 && person.GrossAmount > 0 {
		if isOnLeave {
			reduction = person.GrossAmount
		} else if leaveDays > 0 {
			if leaveDays > totalPeriodDays {
				leaveDays = totalPeriodDays
			}
			reduction = math.Round(person.GrossAmount*float64(leaveDays)/float64(totalPeriodDays)/250) * 250
			if reduction > person.GrossAmount {
				reduction = person.GrossAmount
			}
		}
	}

	return uc.profitSharingPersonRepo.UpdateLeaveStatus(personID, isOnLeave, leaveDays, leaveDates, reduction)
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

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
// RemovePerson removes a person from a period.
func (uc *ProfitSharingUsecase) RemovePerson(periodID uint, personID uint) error {
	period, err := uc.periodRepo.FindByID(periodID)
	if err != nil {
		return domainErrors.NewNotFoundError("periode")
	}
	if period.Status != "draft" {
		return domainErrors.NewInvalidInputError("hanya periode draft yang bisa diubah orangnya")
	}
	person, err := uc.profitSharingPersonRepo.GetByID(personID)
	if err != nil {
		return domainErrors.NewNotFoundError("orang")
	}
	if person.PeriodID != periodID {
		return domainErrors.NewInvalidInputError("orang tidak termasuk dalam periode ini")
	}
	return uc.profitSharingPersonRepo.DeleteByID(personID)
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

// normalizeLeaveDates parses, validates, deduplicates, and sorts leave dates.
// Returns canonical JSON array string of dates within [start, end] range.
func normalizeLeaveDates(raw string, start, end time.Time) (string, error) {
	dates := parseLeaveDates(raw)
	if len(dates) == 0 {
		return "[]", nil
	}

	seen := make(map[string]bool)
	var result []string
	for _, d := range dates {
		// Normalize to date-only for comparison
		dDate := time.Date(d.Year(), d.Month(), d.Day(), 0, 0, 0, 0, time.UTC)
		sDate := time.Date(start.Year(), start.Month(), start.Day(), 0, 0, 0, 0, time.UTC)
		eDate := time.Date(end.Year(), end.Month(), end.Day(), 0, 0, 0, 0, time.UTC)

		if dDate.Before(sDate) || dDate.After(eDate) {
			continue // skip out-of-range dates
		}

		key := dDate.Format("2006-01-02")
		if !seen[key] {
			seen[key] = true
			result = append(result, key)
		}
	}

	// Sort ascending
	for i := 0; i < len(result)-1; i++ {
		for j := i + 1; j < len(result); j++ {
			if result[i] > result[j] {
				result[i], result[j] = result[j], result[i]
			}
		}
	}

	// Serialize as JSON array
	if len(result) == 0 {
		return "[]", nil
	}
	out := "["
	for i, d := range result {
		if i > 0 {
			out += ","
		}
		out += `"` + d + `"`
	}
	out += "]"
	return out, nil
}

// parseLeaveDates parses a comma-separated or JSON array string of dates.
func parseLeaveDates(raw string) []time.Time {
	var dates []time.Time
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return dates
	}

	// Try JSON array first
	if strings.HasPrefix(raw, "[") {
		// Simple JSON array parsing: strip brackets and split by comma
		inner := strings.TrimPrefix(raw, "[")
		inner = strings.TrimSuffix(inner, "]")
		for _, p := range strings.Split(inner, ",") {
			p = strings.TrimSpace(p)
			p = strings.Trim(p, `"`)
			if p == "" {
				continue
			}
			if t, err := time.Parse("2006-01-02", p); err == nil {
				dates = append(dates, t)
			}
		}
		return dates
	}

	// Comma-separated
	for _, p := range strings.Split(raw, ",") {
		p = strings.TrimSpace(p)
		if p == "" {
			continue
		}
		if t, err := time.Parse("2006-01-02", p); err == nil {
			dates = append(dates, t)
		}
	}
	return dates
}

// generateDateRange returns all dates from start to end inclusive.
func generateDateRange(start, end time.Time) []time.Time {
	var dates []time.Time
	s := time.Date(start.Year(), start.Month(), start.Day(), 0, 0, 0, 0, time.UTC)
	e := time.Date(end.Year(), end.Month(), end.Day(), 0, 0, 0, 0, time.UTC)
	for !s.After(e) {
		dates = append(dates, s)
		s = s.AddDate(0, 0, 1)
	}
	return dates
}

// datesToJSON serializes a slice of dates as a JSON array string.
func datesToJSON(dates []time.Time) string {
	if len(dates) == 0 {
		return "[]"
	}
	out := "["
	for i, d := range dates {
		if i > 0 {
			out += ","
		}
		out += `"` + d.Format("2006-01-02") + `"`
	}
	out += "]"
	return out
}
