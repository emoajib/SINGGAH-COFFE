package handlers

import (
	"net/http"
	"singgah-pos-backend/internal/models"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type ReportHandler struct {
	DB *gorm.DB
}

func NewReportHandler(db *gorm.DB) *ReportHandler {
	return &ReportHandler{DB: db}
}

func (h *ReportHandler) GetDashboardSummary(c *gin.Context) {
	var totalSales float64
	var activeOrders int64
	var lowStockCount int64
	var transactionsToday int64

	now := time.Now()
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	sevenDaysAgo := now.AddDate(0, 0, -6)
	startOfSevenDays := time.Date(sevenDaysAgo.Year(), sevenDaysAgo.Month(), sevenDaysAgo.Day(), 0, 0, 0, 0, now.Location())

	// 1. Total Sales Today
	h.DB.Model(&models.Order{}).
		Where("created_at >= ? AND status = ?", startOfDay, "Completed").
		Select("COALESCE(SUM(total_amount), 0)").
		Row().Scan(&totalSales)

	// 2. Transactions Today
	h.DB.Model(&models.Order{}).
		Where("created_at >= ?", startOfDay).
		Count(&transactionsToday)

	// 3. Active Orders
	h.DB.Model(&models.Order{}).
		Where("status = ?", "Pending").
		Count(&activeOrders)

	// 4. Low Stock Ingredients
	h.DB.Model(&models.Ingredient{}).
		Where("current_stock <= min_stock").
		Count(&lowStockCount)

	// 5. Financial Summary
	var totalCogs float64
	var totalExpenses float64

	h.DB.Model(&models.OrderItem{}).
		Joins("JOIN orders ON orders.id = order_items.order_id").
		Where("orders.status = ?", "Completed").
		Select("COALESCE(SUM(order_items.cost * order_items.quantity), 0)").
		Row().Scan(&totalCogs)

	h.DB.Model(&models.Expense{}).
		Select("COALESCE(SUM(amount), 0)").
		Row().Scan(&totalExpenses)

	netProfit := totalSales - totalCogs - totalExpenses

	// 6. Hourly Trend (Today)
	type TrendPoint struct {
		Name  string  `json:"name"`
		Total float64 `json:"total"`
	}
	hourlyTrend := []TrendPoint{}
	h.DB.Raw(`
		SELECT TO_CHAR(created_at, 'HH24:00') as name, SUM(total_amount) as total 
		FROM orders 
		WHERE created_at >= ? AND status = 'Completed'
		GROUP BY TO_CHAR(created_at, 'HH24:00')
		ORDER BY name ASC
	`, startOfDay).Scan(&hourlyTrend)

	// 7. Weekly Trend (Calculated daily for last 7 days)
	weeklyTrend := []TrendPoint{}
	h.DB.Raw(`
		SELECT TO_CHAR(created_at, 'DD Mon') as name, SUM(total_amount) as total 
		FROM orders 
		WHERE created_at >= ? AND status = 'Completed'
		GROUP BY TO_CHAR(created_at, 'DD Mon'), DATE_TRUNC('day', created_at)
		ORDER BY DATE_TRUNC('day', created_at) ASC
	`, startOfSevenDays).Scan(&weeklyTrend)

	// 8. Category Breakdown
	type CatBreakdown struct {
		Category string  `json:"category"`
		Total    float64 `json:"total"`
	}
	breakdown := []CatBreakdown{}
	h.DB.Raw(`
		SELECT p.category, SUM(oi.price * oi.quantity) as total
		FROM order_items oi
		JOIN products p ON p.id = oi.product_id
		JOIN orders o ON o.id = oi.order_id
		WHERE o.status = 'Completed'
		GROUP BY p.category
	`).Scan(&breakdown)

	// 9. Top Selling Items
	type TopProduct struct {
		Name     string `json:"name"`
		Category string `json:"category"`
		Sales    int    `json:"sales"`
	}
	topProducts := []TopProduct{}
	h.DB.Raw(`
		SELECT p.name, p.category, SUM(oi.quantity) as sales
		FROM order_items oi
		JOIN products p ON p.id = oi.product_id
		JOIN orders o ON o.id = oi.order_id
		WHERE o.status = 'Completed'
		GROUP BY p.name, p.category
		ORDER BY sales DESC
		LIMIT 5
	`).Scan(&topProducts)

	c.JSON(http.StatusOK, gin.H{
		"total_sales":        totalSales,
		"active_orders":      activeOrders,
		"low_stock_count":    lowStockCount,
		"transactions_today": transactionsToday,
		"total_cogs":         totalCogs,
		"total_expenses":     totalExpenses,
		"net_profit":         netProfit,
		"sales_trend":        hourlyTrend,
		"weekly_trend":       weeklyTrend,
		"category_breakdown": breakdown,
		"top_products":       topProducts,
	})
}
