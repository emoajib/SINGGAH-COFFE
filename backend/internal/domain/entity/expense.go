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
