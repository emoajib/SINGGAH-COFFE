package entity

import "time"

type CashRegister struct {
	ID            uint
	UserID        uint
	CashierName   string
	OutletID      uint
	OpeningAmount float64
	Notes         string
	OpenedAt      time.Time
	ClosedAt      *time.Time
	ClosingAmount *float64
	Status        string // open, closed
}

type CashRegisterResponse struct {
	ID            uint      `json:"id"`
	UserID        uint      `json:"user_id"`
	CashierName   string    `json:"cashier_name"`
	OutletID      uint      `json:"outlet_id"`
	OutletName    string    `json:"outlet_name"`
	OpeningAmount float64   `json:"opening_amount"`
	Notes         string    `json:"notes"`
	OpenedAt      time.Time `json:"opened_at"`
	ClosedAt      *time.Time `json:"closed_at"`
	ClosingAmount *float64  `json:"closing_amount"`
	Status        string    `json:"status"`
}

func (c *CashRegister) ToResponse() CashRegisterResponse {
	return CashRegisterResponse{
		ID:            c.ID,
		UserID:        c.UserID,
		CashierName:   c.CashierName,
		OutletID:      c.OutletID,
		OpeningAmount: c.OpeningAmount,
		Notes:         c.Notes,
		OpenedAt:      c.OpenedAt,
		ClosedAt:      c.ClosedAt,
		ClosingAmount: c.ClosingAmount,
		Status:        c.Status,
	}
}