package usecase

import (
	"log"
	"sync"
	"time"

	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/repository"
	"singgah-pos-backend/internal/repository/postgres"

	"gorm.io/gorm"
)

type cacheEntry struct {
	data      *entity.DashboardSummary
	timestamp time.Time
}

var (
	dashboardCache map[uint]*cacheEntry
	dashboardMu    sync.RWMutex
	cacheTTL       = 30 * time.Second
	cacheCleanupOnce sync.Once
)

// Shared-hosting hardening: background goroutine yang membersihkan cache
// expired secara proaktif. Tanpa ini, dashboardCache tumbuh tanpa batas
// dan menyebabkan OOM kill di shared hosting dengan GOMEMLIMIT=256MiB.
func startDashboardCacheCleanup() {
	cacheCleanupOnce.Do(func() {
		go func() {
			ticker := time.NewTicker(60 * time.Second)
			defer ticker.Stop()
			for range ticker.C {
				dashboardMu.Lock()
				now := time.Now()
				for k, v := range dashboardCache {
					if now.Sub(v.timestamp) > cacheTTL*2 {
						delete(dashboardCache, k)
					}
				}
				dashboardMu.Unlock()
			}
		}()
	})
}

type ReportUsecase struct {
	orderRepo     repository.OrderRepository
	orderItemRepo repository.OrderItemRepository
	expenseRepo   repository.ExpenseRepository
	ingredientRepo repository.IngredientRepository
	cashBookRepo  repository.CashBookRepository
}

func NewReportUsecase(db *gorm.DB) *ReportUsecase {
	startDashboardCacheCleanup()
	return &ReportUsecase{
		orderRepo:     postgres.NewOrderRepository(db),
		orderItemRepo: postgres.NewOrderItemRepository(db),
		expenseRepo:   postgres.NewExpenseRepository(db),
		ingredientRepo: postgres.NewIngredientRepository(db),
		cashBookRepo:  postgres.NewCashBookRepository(db),
	}
}

func (uc *ReportUsecase) GetDashboardSummary(start, end string, outletID ...uint) (*entity.DashboardSummary, error) {
	key := cacheKey(hashString(start+end))

	// Fast path: return cached copy if fresh
	dashboardMu.RLock()
	if entry := dashboardCache[key]; entry != nil && time.Since(entry.timestamp) < cacheTTL {
		copy := *entry.data
		dashboardMu.RUnlock()
		return &copy, nil
	}
	dashboardMu.RUnlock()

	// Slow path: acquire write lock and double-check
	dashboardMu.Lock()
	defer dashboardMu.Unlock()

	if entry := dashboardCache[key]; entry != nil && time.Since(entry.timestamp) < cacheTTL {
		copy := *entry.data
		return &copy, nil
	}

	if start == "" {
		now := time.Now()
		start = time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location()).Format("2006-01-02 15:04:05")
	}
	if end == "" {
		now := time.Now()
		end = time.Date(now.Year(), now.Month(), now.Day(), 23, 59, 59, 0, now.Location()).Format("2006-01-02 15:04:05")
	}

	since := start
	sinceWeek := time.Now().AddDate(0, 0, -6).Format("2006-01-02 00:00:00")

	totalSales, err := uc.orderRepo.GetTotalSalesSince(since, outletID...)
	if err != nil {
		log.Printf("[WARN] dashboard: failed to fetch total sales: %v", err)
	}
	transactionsToday, _ := uc.orderRepo.CountSince(since, outletID...)
	activeOrders, _ := uc.orderRepo.CountByStatus("Pending", outletID...)
	lowStockCount, _ := uc.ingredientRepo.CountLowStock(outletID...)

	totalCogs, err := uc.orderItemRepo.GetTotalCogsSince("Completed", since, outletID...)
	if err != nil {
		log.Printf("[WARN] dashboard: failed to fetch COGS: %v", err)
	}
	totalExpenses, err := uc.expenseRepo.GetTotalSince(since, outletID...)
	if err != nil {
		log.Printf("[WARN] dashboard: failed to fetch total expenses: %v", err)
	}

	hourlyTrend, _ := uc.orderRepo.GetSumByStatusSince("Completed", since, end, "%H:00", outletID...)
	weeklyTrend, _ := uc.orderRepo.GetSumByStatusSince("Completed", sinceWeek, end, "%d %b", outletID...)
	categoryBreakdown, _ := uc.orderItemRepo.GetCategoryBreakdown(outletID...)
	topProducts, _ := uc.orderItemRepo.GetTopProducts(5, outletID...)
	productSales, _ := uc.orderItemRepo.GetProductSalesVolume(since, end, outletID...)
	totalCups := 0
	for _, ps := range productSales {
		totalCups += ps.Quantity
	}

	if hourlyTrend == nil {
		hourlyTrend = []entity.TrendPoint{}
	}
	if weeklyTrend == nil {
		weeklyTrend = []entity.TrendPoint{}
	}
	if categoryBreakdown == nil {
		categoryBreakdown = []entity.CatBreakdown{}
	}
	if topProducts == nil {
		topProducts = []entity.TopProduct{}
	}

	netProfit := totalSales - totalCogs - totalExpenses

	summary := &entity.DashboardSummary{
		TotalSales:        totalSales,
		ActiveOrders:      activeOrders,
		LowStockCount:     lowStockCount,
		TransactionsToday: transactionsToday,
		TotalCogs:         totalCogs,
		TotalExpenses:     totalExpenses,
		NetProfit:         netProfit,
		SalesTrend:        hourlyTrend,
		WeeklyTrend:       weeklyTrend,
		CategoryBreakdown: categoryBreakdown,
		TopProducts:       topProducts,
		ProductSales:      productSales,
		TotalCups:         totalCups,
	}

	if dashboardCache == nil {
		dashboardCache = make(map[uint]*cacheEntry)
	} else {
		// Evict expired entries to prevent unbounded memory growth
		now := time.Now()
		for k, v := range dashboardCache {
			if now.Sub(v.timestamp) > cacheTTL*2 {
				delete(dashboardCache, k)
			}
		}
	}
	dashboardCache[key] = &cacheEntry{
		data:      summary,
		timestamp: time.Now(),
	}
	return summary, nil
}

func hashString(s string) uint {
	h := uint(2166136261)
	for i := 0; i < len(s); i++ {
		h ^= uint(s[i])
		h *= 16777619
	}
	return h
}

// cacheKey derives the cache key from an optional outletID and date range.
func cacheKey(extra ...uint) uint {
	if len(extra) > 0 {
		return extra[0]
	}
	return 0
}

func (uc *ReportUsecase) GetSalesSummary(outletID ...uint) *entity.SalesSummaryResponse {
	now := time.Now()
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	since := startOfDay.Format("2006-01-02 15:04:05")

	totalSales, _ := uc.orderRepo.GetTotalSalesSince(since, outletID...)
	totalOrders, _ := uc.orderRepo.CountSince(since, outletID...)
	topProducts, _ := uc.orderItemRepo.GetTopProducts(5, outletID...)
	if topProducts == nil {
		topProducts = []entity.TopProduct{}
	}

	var avg float64
	if totalOrders > 0 {
		avg = totalSales / float64(totalOrders)
	}

	return &entity.SalesSummaryResponse{
		TotalSales:        totalSales,
		TotalOrders:       totalOrders,
		AverageOrderValue: avg,
		TopProducts:       topProducts,
	}
}

func (uc *ReportUsecase) GetProfitLossReport(start, end string, outletID ...uint) (*entity.ProfitLossReport, error) {
	revenue, _ := uc.orderRepo.GetTotalSalesRange(start, end, outletID...)
	cogs, _ := uc.orderItemRepo.GetTotalCogsRange(start, end, outletID...)
	expenses, _ := uc.expenseRepo.GetBreakdownRange(start, end, outletID...)
	if expenses == nil {
		expenses = []entity.ExpenseDetail{}
	}

	var totalExpenses float64
	for _, e := range expenses {
		totalExpenses += e.Amount
	}

	paymentBreakdown, _ := uc.orderRepo.GetSalesByPaymentMethod(start, end, outletID...)
	if paymentBreakdown == nil {
		paymentBreakdown = []entity.PaymentBreakdown{}
	}

	displayOrder := []string{"Cash", "QRIS"}
	bucketed := []entity.PaymentBreakdown{}
	byMethod := make(map[string]entity.PaymentBreakdown)
	var otherTotal float64
	var otherCount int64
	for _, pb := range paymentBreakdown {
		if pb.PaymentMethod == "Cash" || pb.PaymentMethod == "QRIS" {
			byMethod[pb.PaymentMethod] = pb
		} else {
			otherTotal += pb.Total
			otherCount += pb.Count
		}
	}
	for _, m := range displayOrder {
		if pb, ok := byMethod[m]; ok {
			bucketed = append(bucketed, pb)
		}
	}
	if otherCount > 0 {
		bucketed = append(bucketed, entity.PaymentBreakdown{
			PaymentMethod: "Lainnya",
			Total:         otherTotal,
			Count:         otherCount,
		})
	}
	cbIncome, cbExpense, _ := uc.cashBookRepo.GetTotalsRange(start, end, outletID...)
	grossProfit := revenue - cogs
	netProfit := grossProfit - totalExpenses

	return &entity.ProfitLossReport{
		StartDate:        start,
		EndDate:          end,
		Revenue:          revenue,
		Cogs:             cogs,
		GrossProfit:      grossProfit,
		Expenses:         expenses,
		TotalExpenses:    totalExpenses,
		NetProfit:        netProfit,
		CashBookIncome:   cbIncome,
		CashBookExpense:  cbExpense,
		PaymentBreakdown: paymentBreakdown,
	}, nil
}

// GetProductPerformance returns per-product sales volume & revenue for a date range.
func (uc *ReportUsecase) GetProductPerformance(start, end string, outletID ...uint) ([]entity.ProductSalesVolume, error) {
	if start == "" || end == "" {
		now := time.Now()
		start = now.Format("2006-01-02")
		end = now.Format("2006-01-02")
	}
	return uc.orderItemRepo.GetProductSalesVolume(start, end, outletID...)
}
