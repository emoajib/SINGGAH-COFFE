package entity

import "time"

type ProfitSharingPeriod struct {
	ID            uint
	OutletID      uint
	PeriodStart   time.Time
	PeriodEnd     time.Time
	BasisAmount   float64
	TotalExpenses float64
	TotalCogs     float64
	NetProfit     float64
	Ratio         float64
	KeeperAmount  float64
	OwnerAmount   float64
	Status        string
	PerProduct    string
	PaymentNote   string
	TaxNote       string
	CreatedAt     time.Time
	UpdatedAt     time.Time
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
