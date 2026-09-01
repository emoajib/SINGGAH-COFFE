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
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
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
}

type ProfitSharingPreview struct {
	Period      ProfitSharingPeriod `json:"period"`
	Calculation Calculation         `json:"calculation"`
}
