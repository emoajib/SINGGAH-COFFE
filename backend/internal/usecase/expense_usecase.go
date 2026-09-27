package usecase

import (
	"fmt"
	"math"
	"sort"
	"strings"
	"time"

	"singgah-pos-backend/internal/domain/entity"
	domainErrors "singgah-pos-backend/internal/domain/errors"
	"singgah-pos-backend/internal/models"
	"singgah-pos-backend/internal/repository"
	"singgah-pos-backend/internal/repository/postgres"

	"gorm.io/gorm"
)

// ExpenseUsecase mengelola logika bisnis pengeluaran.
// Setiap operasi CRUD expense secara otomatis disinkronkan ke Buku Kas
// menggunakan pola idempoten reference "expense:{id}" yang sama dengan Order.
// ⚠️ Vetted by AI - Manual Review Required by Senior Engineer/Manager
type ExpenseUsecase struct {
	db          *gorm.DB
	expenseRepo repository.ExpenseRepository
}

func NewExpenseUsecase(db *gorm.DB) *ExpenseUsecase {
	return &ExpenseUsecase{
		db:          db,
		expenseRepo: postgres.NewExpenseRepository(db),
	}
}

// expenseRef menghasilkan reference key idempoten untuk entry Buku Kas.
func expenseRef(expenseID uint) string {
	return fmt.Sprintf("expense:%d", expenseID)
}

// syncExpenseToCashBook menyesuaikan entry Buku Kas dengan nilai terkini expense.
// Hapus entry lama lalu buat baru — upsert logis. Best-effort: error diabaikan.
func syncExpenseToCashBook(cashBookRepo repository.CashBookRepository, expense *entity.Expense) {
	if expense.ID == 0 || expense.Amount <= 0 {
		return
	}
	ref := expenseRef(expense.ID)
	date := expense.Date
	if date.IsZero() {
		date = time.Now()
	}
	method := expense.PaymentMethod
	if method == "" {
		method = "Cash"
	}
	_, _ = cashBookRepo.DeleteByReference(ref, expense.OutletID)
	_ = cashBookRepo.Create(&entity.CashBook{
		OutletID:    expense.OutletID,
		Date:        date,
		Method:      method,
		Type:        "expense",
		Amount:      expense.Amount,
		Description: "Pengeluaran: " + expense.Title,
		Reference:   ref,
	})
}

func (uc *ExpenseUsecase) GetAll(outletID ...uint) ([]entity.ExpenseResponse, error) {
	expenses, err := uc.expenseRepo.FindAll(outletID...)
	if err != nil {
		return nil, err
	}
	resp := make([]entity.ExpenseResponse, len(expenses))
	for i, e := range expenses {
		resp[i] = e.ToResponse()
	}
	return resp, nil
}

func (uc *ExpenseUsecase) GetAllFiltered(start, end, category string, outletID ...uint) ([]entity.ExpenseResponse, error) {
	expenses, err := uc.expenseRepo.FindAllRange(start, end, category, outletID...)
	if err != nil {
		return nil, err
	}
	resp := make([]entity.ExpenseResponse, len(expenses))
	for i, e := range expenses {
		r := e.ToResponse()
		r.Category = NormalizeCategory(r.Category)
		resp[i] = r
	}
	return resp, nil
}

// Create menyimpan expense dan langsung sync ke Buku Kas secara real-time.
// GAP 1 FIX: sebelumnya tidak ada sync ke Buku Kas sama sekali.
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (uc *ExpenseUsecase) Create(expense *entity.Expense, outletID ...uint) (*entity.ExpenseResponse, error) {
	if expense.Date.IsZero() {
		expense.Date = time.Now()
	}
	if expense.PaymentMethod == "" {
		expense.PaymentMethod = "Cash"
	}
	expense.Category = NormalizeCategory(expense.Category)
	if len(outletID) > 0 {
		expense.OutletID = outletID[0]
	}

	var resp entity.ExpenseResponse
	err := uc.db.Transaction(func(tx *gorm.DB) error {
		expenseRepo := postgres.NewExpenseRepository(tx)
		cashBookRepo := postgres.NewCashBookRepository(tx)

		if err := expenseRepo.Create(expense); err != nil {
			return err
		}
		// Sync real-time ke Buku Kas
		syncExpenseToCashBook(cashBookRepo, expense)
		// PSAK: Create outbox event for journal entry
		outboxRepo := postgres.NewOutboxRepository(tx)
		if err := outboxRepo.Create(&entity.EventOutbox{
			EventType:     "expense.created",
			ReferenceType: "expense",
			ReferenceID:   expense.ID,
			Payload: mustMarshal(map[string]interface{}{
				"id":             expense.ID,
				"amount":         expense.Amount,
				"category":       expense.Category,
				"payment_method": expense.PaymentMethod,
				"outlet_id":      expense.OutletID,
				"date":           expense.Date.Format("2006-01-02"),
				"title":          expense.Title,
			}),
			Status: "pending",
		}); err != nil {
			return err
		}
		resp = expense.ToResponse()
		return nil
	})
	if err != nil {
		return nil, err
	}
	return &resp, nil
}

// Update memperbarui expense dan menyegarkan entry Buku Kas.
// GAP 3 FIX: sebelumnya edit expense tidak mengupdate Buku Kas → data stale.
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (uc *ExpenseUsecase) Update(id uint, expense *entity.Expense) (*entity.ExpenseResponse, error) {
	existing, err := uc.expenseRepo.FindByID(id)
	if err != nil {
		return nil, domainErrors.NewNotFoundError("expense not found")
	}

	existing.Title = expense.Title
	existing.Amount = expense.Amount
	existing.Category = NormalizeCategory(expense.Category)
	existing.CostType = expense.CostType
	if expense.PaymentMethod != "" {
		existing.PaymentMethod = expense.PaymentMethod
	}
	if !expense.Date.IsZero() {
		existing.Date = expense.Date
	}
	existing.Description = expense.Description
	existing.Notes = expense.Notes

	var resp entity.ExpenseResponse
	err = uc.db.Transaction(func(tx *gorm.DB) error {
		expenseRepo := postgres.NewExpenseRepository(tx)
		cashBookRepo := postgres.NewCashBookRepository(tx)

		if err := expenseRepo.Update(existing); err != nil {
			return err
		}
		// Sync update ke Buku Kas
		syncExpenseToCashBook(cashBookRepo, existing)
		// PSAK: Create outbox event for journal update
		outboxRepo := postgres.NewOutboxRepository(tx)
		if err := outboxRepo.Create(&entity.EventOutbox{
			EventType:     "expense.updated",
			ReferenceType: "expense",
			ReferenceID:   existing.ID,
			Payload: mustMarshal(map[string]interface{}{
				"id":             existing.ID,
				"amount":         existing.Amount,
				"category":       existing.Category,
				"payment_method": existing.PaymentMethod,
				"outlet_id":      existing.OutletID,
				"date":           existing.Date.Format("2006-01-02"),
				"title":          existing.Title,
			}),
			Status: "pending",
		}); err != nil {
			return err
		}
		resp = existing.ToResponse()
		return nil
	})
	if err != nil {
		return nil, err
	}
	return &resp, nil
}

// ⚠️ Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (uc *ExpenseUsecase) UpdateCostType(id uint, costType string) error {
	existing, err := uc.expenseRepo.FindByID(id)
	if err != nil {
		return domainErrors.NewNotFoundError("expense not found")
	}
	existing.CostType = costType
	return uc.expenseRepo.Update(existing)
}

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
// Delete menghapus expense dan membersihkan entry Buku Kas terkait.
// GAP 2 FIX: sebelumnya hapus expense meninggalkan orphan entry di Buku Kas.
func (uc *ExpenseUsecase) Delete(id uint) error {
	existing, err := uc.expenseRepo.FindByID(id)
	if err != nil {
		return domainErrors.NewNotFoundError("expense not found")
	}
	return uc.db.Transaction(func(tx *gorm.DB) error {
		expenseRepo := postgres.NewExpenseRepository(tx)
		cashBookRepo := postgres.NewCashBookRepository(tx)

		// Hapus entry Buku Kas terlebih dahulu dengan scope outletID yang aman
		_, _ = cashBookRepo.DeleteByReference(expenseRef(id), existing.OutletID)
		// PSAK: Create outbox event for journal reversal
		outboxRepo := postgres.NewOutboxRepository(tx)
		if err := outboxRepo.Create(&entity.EventOutbox{
			EventType:     "expense.deleted",
			ReferenceType: "expense",
			ReferenceID:   id,
			Payload:       mustMarshal(map[string]interface{}{"id": id, "outlet_id": existing.OutletID, "title": existing.Title}),
			Status:        "pending",
		}); err != nil {
			return err
		}
		return expenseRepo.Delete(id)
	})
}

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (uc *ExpenseUsecase) GetExpenseSummaryRecap(start, end string, outletID uint) (*entity.ExpenseSummaryRecap, error) {
	expenses, err := uc.expenseRepo.FindAllRange(start, end, "", outletID)
	if err != nil {
		return nil, err
	}

	var totalExpense, cashExpense, nonCashExpense, fixedTotal, variableTotal float64
	catMap := make(map[string]*entity.CategoryExpenseStat)
	dailyMap := make(map[string]*entity.DailyExpenseRecap)
	responses := make([]entity.ExpenseResponse, len(expenses))

	for i, exp := range expenses {
		resp := exp.ToResponse()
		responses[i] = resp

		amt := exp.Amount
		totalExpense += amt

		if resp.PaymentMethod == "Cash" {
			cashExpense += amt
		} else {
			nonCashExpense += amt
		}

		if exp.CostType == "fixed" {
			fixedTotal += amt
		} else {
			variableTotal += amt
		}

		// Kategori
		cat := NormalizeCategory(exp.Category)
		if _, exists := catMap[cat]; !exists {
			catMap[cat] = &entity.CategoryExpenseStat{
				Category: cat,
				Items:    []entity.ExpenseResponse{},
			}
		}
		catMap[cat].Total += amt
		catMap[cat].Count++
		catMap[cat].Items = append(catMap[cat].Items, resp)

		// Harian
		dateKey := exp.Date.Format("2006-01-02")
		if _, exists := dailyMap[dateKey]; !exists {
			dailyMap[dateKey] = &entity.DailyExpenseRecap{Date: dateKey}
		}
		dailyMap[dateKey].TotalAmount += amt
		dailyMap[dateKey].Count++
		if resp.PaymentMethod == "Cash" {
			dailyMap[dateKey].CashAmount += amt
		} else {
			dailyMap[dateKey].NonCashAmount += amt
		}
	}

	// Persentase kategori dan urutkan items dalam tiap kategori
	var catStats []entity.CategoryExpenseStat
	for _, stat := range catMap {
		if totalExpense > 0 {
			stat.Percentage = math.Round((stat.Total/totalExpense)*1000) / 10
		}
		// Urutkan rincian item pengeluaran: tanggal terbaru & ID terbesar
		sort.Slice(stat.Items, func(i, j int) bool {
			if stat.Items[i].Date.Equal(stat.Items[j].Date) {
				return stat.Items[i].ID > stat.Items[j].ID
			}
			return stat.Items[i].Date.After(stat.Items[j].Date)
		})
		catStats = append(catStats, *stat)
	}
	sort.Slice(catStats, func(i, j int) bool {
		return catStats[i].Total > catStats[j].Total
	})

	// Rekap harian urut tanggal
	var dailyStats []entity.DailyExpenseRecap
	for _, d := range dailyMap {
		dailyStats = append(dailyStats, *d)
	}
	sort.Slice(dailyStats, func(i, j int) bool {
		return dailyStats[i].Date < dailyStats[j].Date
	})

	// Top 5 pengeluaran terbesar
	sort.Slice(responses, func(i, j int) bool {
		return responses[i].Amount > responses[j].Amount
	})
	topLimit := 5
	if len(responses) < topLimit {
		topLimit = len(responses)
	}
	topExpenses := responses[:topLimit]

	// Hitung total revenue untuk rasio beban
	var totalRevenue float64
	orderTx := uc.db.Model(&models.Order{}).Where("status = ?", "completed")
	if outletID > 0 {
		orderTx = orderTx.Where("outlet_id = ?", outletID)
	}
	if start != "" {
		orderTx = orderTx.Where("DATE(created_at) >= DATE(?)", start)
	}
	if end != "" {
		orderTx = orderTx.Where("DATE(created_at) <= DATE(?)", end)
	}
	_ = orderTx.Select("COALESCE(SUM(total_amount), 0)").Row().Scan(&totalRevenue)

	var expenseRatio float64
	if totalRevenue > 0 {
		expenseRatio = math.Round((totalExpense/totalRevenue)*1000) / 10
	}

	days := len(dailyStats)
	if days == 0 {
		days = 1
	}
	dailyBurn := math.Round(totalExpense / float64(days))

	return &entity.ExpenseSummaryRecap{
		PeriodStart:       start,
		PeriodEnd:         end,
		TotalExpense:      totalExpense,
		CashExpense:       cashExpense,
		NonCashExpense:    nonCashExpense,
		FixedCostTotal:    fixedTotal,
		VariableCostTotal: variableTotal,
		DailyAverageBurn:  dailyBurn,
		TotalRevenue:      totalRevenue,
		ExpenseRatio:      expenseRatio,
		CategoryBreakdown: catStats,
		TopExpenses:       topExpenses,
		DailyRecap:        dailyStats,
	}, nil
}

// NormalizeCategory menyelaraskan nama kategori ke 6 standar baku:
// 1. Operasional
// 2. Bahan Baku (HPP)
// 3. Gaji & Upah
// 4. Pemeliharaan & Servis
// 5. Pemasaran / Marketing
// 6. Lainnya
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func NormalizeCategory(cat string) string {
	clean := strings.ToLower(strings.TrimSpace(cat))
	switch clean {
	case "operational", "operasional", "biaya tetap", "fixed", "beban operasional", "operasional rutin":
		return "Operasional"
	case "bahan baku", "bahan baku (hpp)", "hpp", "cogs", "raw material":
		return "Bahan Baku (HPP)"
	case "salary", "gaji", "gaji & upah", "upah", "honor", "bagi hasil":
		return "Gaji & Upah"
	case "maintenance", "pemeliharaan", "pemeliharaan & servis", "servis", "perawatan":
		return "Pemeliharaan & Servis"
	case "marketing", "pemasaran", "pemasaran / marketing", "promosi", "iklan":
		return "Pemasaran / Marketing"
	case "other", "lainnya", "misc", "":
		return "Lainnya"
	default:
		return "Lainnya"
	}
}

