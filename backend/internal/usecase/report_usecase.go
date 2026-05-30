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
	dashboardCache *cacheEntry
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

func (uc *ReportUsecase) GetDashboardSummary() (*entity.DashboardSummary, error) {
	// Fast path: return cached copy if fresh
	dashboardMu.RLock()
	if dashboardCache != nil && time.Since(dashboardCache.timestamp) < cacheTTL {
		copy := *dashboardCache.data
		dashboardMu.RUnlock()
		return &copy, nil
	}
	dashboardMu.RUnlock()

	// Slow path: acquire write lock and double-check
	dashboardMu.Lock()
	defer dashboardMu.Unlock()

	if dashboardCache != nil && time.Since(dashboardCache.timestamp) < cacheTTL {
		copy := *dashboardCache.data
		return &copy, nil
	}

	now := time.Now()
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	startOfWeek := now.AddDate(0, 0, -6)
	startOfSevenDays := time.Date(startOfWeek.Year(), startOfWeek.Month(), startOfWeek.Day(), 0, 0, 0, 0, now.Location())

	since := startOfDay.Format("2006-01-02 15:04:05")
	sinceWeek := startOfSevenDays.Format("2006-01-02 15:04:05")

	totalSales, _ := uc.orderRepo.GetTotalSalesSince(since)
	transactionsToday, _ := uc.orderRepo.CountSince(since)
	activeOrders, _ := uc.orderRepo.CountByStatus("Pending")
	lowStockCount, _ := uc.ingredientRepo.CountLowStock()

	totalCogs, _ := uc.orderItemRepo.GetTotalCogsByStatus("Completed")
	totalExpenses, _ := uc.expenseRepo.GetTotal()

	hourlyTrend, _ := uc.orderRepo.GetSumByStatusSince("Completed", since, "HH24:00")
	weeklyTrend, _ := uc.orderRepo.GetSumByStatusSince("Completed", sinceWeek, "DD Mon")
	categoryBreakdown, _ := uc.orderItemRepo.GetCategoryBreakdown()
	topProducts, _ := uc.orderItemRepo.GetTopProducts(5)

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

	dashboardCache = &cacheEntry{
		data:      summary,
		timestamp: time.Now(),
	}
	return summary, nil
}

func (uc *ReportUsecase) GetProfitLossReport(start, end string) (*entity.ProfitLossReport, error) {
	revenue, _ := uc.orderRepo.GetTotalSalesRange(start, end)
	cogs, _ := uc.orderItemRepo.GetTotalCogsRange(start, end)
	expenses, _ := uc.expenseRepo.GetBreakdownRange(start, end)

	var totalExpenses float64
	for _, e := range expenses {
		totalExpenses += e.Amount
	}

	grossProfit := revenue - cogs
	netProfit := grossProfit - totalExpenses

	return &entity.ProfitLossReport{
		StartDate:     start,
		EndDate:       end,
		Revenue:       revenue,
		Cogs:          cogs,
		GrossProfit:   grossProfit,
		Expenses:      expenses,
		TotalExpenses: totalExpenses,
		NetProfit:     netProfit,
	}, nil
}
