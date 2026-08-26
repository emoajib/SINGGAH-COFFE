package entity

type ProfitLossReport struct {
	StartDate        string             `json:"start_date"`
	EndDate          string             `json:"end_date"`
	Revenue          float64            `json:"revenue"`
	Cogs             float64            `json:"cogs"`
	GrossProfit      float64            `json:"gross_profit"`
	Expenses         []ExpenseDetail    `json:"expenses"`
	TotalExpenses    float64            `json:"total_expenses"`
	NetProfit        float64            `json:"net_profit"`
	CashBookIncome   float64            `json:"cash_book_income"`
	CashBookExpense  float64            `json:"cash_book_expense"`
	PaymentBreakdown []PaymentBreakdown `json:"payment_breakdown"`
}

type ExpenseDetail struct {
	Category string  `json:"category"`
	Amount   float64 `json:"amount"`
}

// PaymentBreakdown splits pendapatan per metode pembayaran (Cash, QRIS, Transfer).
type PaymentBreakdown struct {
	PaymentMethod string  `json:"payment_method"`
	Total         float64 `json:"total"`
	Count         int64   `json:"count"`
}

type SalesSummaryResponse struct {
	TotalSales        float64      `json:"total_sales"`
	TotalOrders       int64        `json:"total_orders"`
	AverageOrderValue float64      `json:"average_order_value"`
	TopProducts       []TopProduct `json:"top_products"`
}
