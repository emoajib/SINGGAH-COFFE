package usecase

import (
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
)

type ReportUsecase struct {
	orderRepo      repository.OrderRepository
	orderItemRepo  repository.OrderItemRepository
	expenseRepo    repository.ExpenseRepository
	ingredientRepo repository.IngredientRepository
}

func NewReportUsecase(db *gorm.DB) *ReportUsecase {
	return &ReportUsecase{
		orderRepo:      postgres.NewOrderRepository(db),
		orderItemRepo:  postgres.NewOrderItemRepository(db),
		expenseRepo:    postgres.NewExpenseRepository(db),
		ingredientRepo: postgres.NewIngredientRepository(db),
	}
}

func (uc *ReportUsecase) GetDashboardSummary(outletID ...uint) (*entity.DashboardSummary, error) {
	key := cacheKey(outletID)

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

	now := time.Now()
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	startOfWeek := now.AddDate(0, 0, -6)
	startOfSevenDays := time.Date(startOfWeek.Year(), startOfWeek.Month(), startOfWeek.Day(), 0, 0, 0, 0, now.Location())

	since := startOfDay.Format("2006-01-02 15:04:05")
	sinceWeek := startOfSevenDays.Format("2006-01-02 15:04:05")

	totalSales, _ := uc.orderRepo.GetTotalSalesSince(since, outletID...)
	transactionsToday, _ := uc.orderRepo.CountSince(since, outletID...)
	activeOrders, _ := uc.orderRepo.CountByStatus("Pending", outletID...)
	lowStockCount, _ := uc.ingredientRepo.CountLowStock(outletID...)

	totalCogs, _ := uc.orderItemRepo.GetTotalCogsSince("Completed", since, outletID...)
	totalExpenses, _ := uc.expenseRepo.GetTotalSince(since, outletID...)

	hourlyTrend, _ := uc.orderRepo.GetSumByStatusSince("Completed", since, "%H:00", outletID...)
	weeklyTrend, _ := uc.orderRepo.GetSumByStatusSince("Completed", sinceWeek, "%d %b", outletID...)
	categoryBreakdown, _ := uc.orderItemRepo.GetCategoryBreakdown(outletID...)
	topProducts, _ := uc.orderItemRepo.GetTopProducts(5, outletID...)

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

// cacheKey derives the cache key from an optional outletID (0 = all outlets).
func cacheKey(outletID []uint) uint {
	if len(outletID) > 0 {
		return outletID[0]
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
	paymentBreakdown = bucketed

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
		PaymentBreakdown: paymentBreakdown,
	}, nil
}
