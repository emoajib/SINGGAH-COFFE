package entity

type ProfitLossReport struct {
	StartDate      string           `json:"start_date"`
	EndDate        string           `json:"end_date"`
	Revenue        float64          `json:"revenue"`
	Cogs           float64          `json:"cogs"`
	GrossProfit    float64          `json:"gross_profit"`
	Expenses       []ExpenseDetail  `json:"expenses"`
	TotalExpenses  float64          `json:"total_expenses"`
	NetProfit      float64          `json:"net_profit"`
}

type ExpenseDetail struct {
	Category string  `json:"category"`
	Amount   float64 `json:"amount"`
}

type SalesSummaryResponse struct {
	TotalSales        float64      `json:"total_sales"`
	TotalOrders       int64        `json:"total_orders"`
	AverageOrderValue float64      `json:"average_order_value"`
	TopProducts       []TopProduct `json:"top_products"`
}
