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
