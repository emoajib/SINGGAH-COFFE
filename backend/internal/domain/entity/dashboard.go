package entity

type DashboardSummary struct {
	TotalSales        float64        `json:"total_sales"`
	ActiveOrders      int64          `json:"active_orders"`
	LowStockCount     int64          `json:"low_stock_count"`
	TransactionsToday int64          `json:"transactions_today"`
	TotalCogs         float64        `json:"total_cogs"`
	TotalExpenses     float64        `json:"total_expenses"`
	NetProfit         float64        `json:"net_profit"`
	SalesTrend        []TrendPoint   `json:"sales_trend"`
	WeeklyTrend       []TrendPoint   `json:"weekly_trend"`
	CategoryBreakdown []CatBreakdown `json:"category_breakdown"`
	TopProducts       []TopProduct   `json:"top_products"`
}

type TrendPoint struct {
	Name  string  `json:"name"`
	Total float64 `json:"total"`
}

type CatBreakdown struct {
	Category string  `json:"category"`
	Total    float64 `json:"total"`
}

type TopProduct struct {
	Name     string `json:"name"`
	Category string `json:"category"`
	Sales    int    `json:"sales"`
}
