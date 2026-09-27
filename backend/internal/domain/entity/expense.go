package entity

import "time"

// ⚠️ Vetted by SOSIOMEN - Manual Review Required by Senior Engineer/Manager
type Expense struct {
	ID            uint
	Title         string
	Amount        float64
	Category      string
	CostType      string // fixed, variable
	PaymentMethod string // Cash, QRIS, Lainnya
	Date          time.Time
	Description   string
	Notes         string
	CreatedAt     time.Time
	OutletID      uint
}

// ⚠️ Vetted by SOSIOMEN - Manual Review Required by Senior Engineer/Manager
type ExpenseResponse struct {
	ID            uint      `json:"id"`
	Title         string    `json:"title"`
	Amount        float64   `json:"amount"`
	Category      string    `json:"category"`
	CostType      string    `json:"cost_type"`
	PaymentMethod string    `json:"payment_method"`
	Date          time.Time `json:"date"`
	Description   string    `json:"description"`
	Notes         string    `json:"notes"`
	CreatedAt     time.Time `json:"created_at"`
}

func (e *Expense) ToResponse() ExpenseResponse {
	paymentMethod := e.PaymentMethod
	if paymentMethod == "" {
		paymentMethod = "Cash"
	}
	return ExpenseResponse{
		ID:            e.ID,
		Title:         e.Title,
		Amount:        e.Amount,
		Category:      e.Category,
		CostType:      e.CostType,
		PaymentMethod: paymentMethod,
		Date:          e.Date,
		Description:   e.Description,
		Notes:         e.Notes,
		CreatedAt:     e.CreatedAt,
	}
}

// ⚠️ Vetted by SOSIOMEN - Manual Review Required by Senior Engineer/Manager
type FixedCostItem struct {
	Name   string  `json:"name"`
	Amount float64 `json:"amount"`
}

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
type CategoryExpenseStat struct {
	Category   string  `json:"category"`
	Total      float64 `json:"total"`
	Percentage float64 `json:"percentage"`
	Count      int     `json:"count"`
}

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
type DailyExpenseRecap struct {
	Date           string  `json:"date"`
	TotalAmount    float64 `json:"total_amount"`
	CashAmount     float64 `json:"cash_amount"`
	NonCashAmount  float64 `json:"non_cash_amount"`
	Count          int     `json:"count"`
}

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
type ExpenseSummaryRecap struct {
	PeriodStart       string                `json:"period_start"`
	PeriodEnd         string                `json:"period_end"`
	TotalExpense      float64               `json:"total_expense"`
	CashExpense       float64               `json:"cash_expense"`
	NonCashExpense    float64               `json:"non_cash_expense"`
	FixedCostTotal    float64               `json:"fixed_cost_total"`
	VariableCostTotal float64               `json:"variable_cost_total"`
	DailyAverageBurn  float64               `json:"daily_average_burn"`
	TotalRevenue      float64               `json:"total_revenue"`
	ExpenseRatio      float64               `json:"expense_ratio"` // Rasio Beban thdp Omzet (%)
	CategoryBreakdown []CategoryExpenseStat `json:"category_breakdown"`
	TopExpenses       []ExpenseResponse     `json:"top_expenses"`
	DailyRecap        []DailyExpenseRecap   `json:"daily_recap"`
}

