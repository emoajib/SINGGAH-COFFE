package entity

import "time"

// CashBook — Buku Kas (owner-only). Distinct from CashRegister shift sessions.
type CashBook struct {
	ID          uint      `json:"id"`
	OutletID    uint      `json:"outlet_id"`
	Date        time.Time `json:"date"`
	Method      string    `json:"method"` // Cash, QRIS, Lainnya
	Type        string    `json:"type"`   // income, expense
	Amount      float64   `json:"amount"`
	Description string    `json:"description"`
	Reference   string    `json:"reference"`
	CreatedBy   uint      `json:"created_by"`
	CreatedAt   time.Time `json:"created_at"`
}

type CashBookResponse struct {
	ID          uint      `json:"id"`
	OutletID    uint      `json:"outlet_id"`
	Date        time.Time `json:"date"`
	Method      string    `json:"method"`
	Type        string    `json:"type"`
	Amount      float64   `json:"amount"`
	Description string    `json:"description"`
	Reference   string    `json:"reference"`
	CreatedBy   uint      `json:"created_by"`
	CreatedAt   time.Time `json:"created_at"`
}

func (c *CashBook) ToResponse() CashBookResponse {
	return CashBookResponse{
		ID:          c.ID,
		OutletID:    c.OutletID,
		Date:        c.Date,
		Method:      c.Method,
		Type:        c.Type,
		Amount:      c.Amount,
		Description: c.Description,
		Reference:   c.Reference,
		CreatedBy:   c.CreatedBy,
		CreatedAt:   c.CreatedAt,
	}
}
