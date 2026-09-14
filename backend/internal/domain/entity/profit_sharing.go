package entity

import "time"

type ProfitSharingPeriod struct {
	ID            uint      `json:"id"`
	OutletID      uint      `json:"outlet_id"`
	PeriodStart   time.Time `json:"period_start"`
	PeriodEnd     time.Time `json:"period_end"`
	BasisAmount   float64   `json:"basis_amount"`
	TotalExpenses float64   `json:"total_expenses"`
	TotalCogs     float64   `json:"total_cogs"`
	NetProfit     float64   `json:"net_profit"`
	Ratio         float64   `json:"ratio"`
	KeeperAmount  float64   `json:"keeper_amount"`
	OwnerAmount   float64   `json:"owner_amount"`
	Status        string    `json:"status"`
	PerProduct    string    `json:"per_product"`
	PaymentNote   string    `json:"payment_note"`
	TaxNote       string    `json:"tax_note"`
	BasisType     string    `json:"basis_type"`
	OwnerPct      float64   `json:"owner_pct"`
	People        []ProfitSharingPerson `json:"people"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
type ProfitSharingPerson struct {
	ID             uint      `json:"id"`
	PeriodID       uint      `json:"period_id"`
	Name           string    `json:"name"`
	Role           string    `json:"role"`
	SharePct       float64   `json:"share_pct"`
	Amount         float64   `json:"amount"`
	IsOnLeave      bool      `json:"is_on_leave"`
	LeaveReduction float64   `json:"leave_reduction"`
	LeaveDays      int       `json:"leave_days"`
	LeaveDates     string    `json:"leave_dates"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type ProductSharingDetail struct {
	ProductID   uint    `json:"product_id"`
	ProductName string  `json:"product_name"`
	Revenue     float64 `json:"revenue"`
	Cogs        float64 `json:"cogs"`
	GrossMargin float64 `json:"gross_margin"`
}

type ExpenseBreakdown struct {
	Category string  `json:"category"`
	Amount   float64 `json:"amount"`
	Note     string  `json:"note"`
}

type Calculation struct {
	BasisAmount   float64               `json:"basis_amount"`
	Tax           float64               `json:"tax"`
	ServiceFee    float64               `json:"service_fee"`
	NetRevenue    float64               `json:"net_revenue"`
	TotalCogs     float64               `json:"total_cogs"`
	GrossProfit   float64               `json:"gross_profit"`
	TotalExpenses float64               `json:"total_expenses"`
	NetProfit     float64               `json:"net_profit"`
	Ratio         float64               `json:"ratio"`
	KeeperShare   float64               `json:"keeper_share"`
	OwnerShare    float64               `json:"owner_share"`
	Breakdown     []ExpenseBreakdown    `json:"breakdown"`
	PerProduct    []ProductSharingDetail `json:"per_product"`
	Status        string                `json:"status"`
	Note          string                `json:"note"`
	BasisType     string                `json:"basis_type"`
	OwnerPct      float64               `json:"owner_pct"`
	People        []ProfitSharingPerson `json:"people"`
}

type ProfitSharingPreview struct {
	Period      ProfitSharingPeriod `json:"period"`
	Calculation Calculation         `json:"calculation"`
}
