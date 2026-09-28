package entity

import "time"

// CashBook — Buku Kas (owner-only). Distinct from CashRegister shift sessions.
type CashBook struct {
	ID           uint
	OutletID     uint
	Date         time.Time
	Method       string    // Cash, QRIS, Lainnya, Transfer
	Type         string    // income, expense
	SubType      string    // "" | "investor_capital" | "investor_loan" | "loan_payment"
	InvestorName string    // nama investor (opsional)
	Amount       float64
	Description  string
	Reference    string
	CreatedBy    uint
	CreatedAt    time.Time
}

type CashBookResponse struct {
	ID           uint      `json:"id"`
	OutletID     uint      `json:"outlet_id"`
	Date         time.Time `json:"date"`
	Method       string    `json:"method"`
	Type         string    `json:"type"`
	SubType      string    `json:"sub_type"`
	InvestorName string    `json:"investor_name"`
	Amount       float64   `json:"amount"`
	Description  string    `json:"description"`
	Reference    string    `json:"reference"`
	CreatedBy    uint      `json:"created_by"`
	CreatedAt    time.Time `json:"created_at"`
}

func (c *CashBook) ToResponse() CashBookResponse {
	return CashBookResponse{
		ID:           c.ID,
		OutletID:     c.OutletID,
		Date:         c.Date,
		Method:       c.Method,
		Type:         c.Type,
		SubType:      c.SubType,
		InvestorName: c.InvestorName,
		Amount:       c.Amount,
		Description:  c.Description,
		Reference:    c.Reference,
		CreatedBy:    c.CreatedBy,
		CreatedAt:    c.CreatedAt,
	}
}
