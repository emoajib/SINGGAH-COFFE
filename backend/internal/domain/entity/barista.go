package entity

import "time"

// Barista represents domain entity for coffee shop barista.
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
type Barista struct {
	ID              uint      `json:"id"`
	OutletID        uint      `json:"outlet_id"`
	Name            string    `json:"name"`
	Phone           string    `json:"phone"`
	DefaultSharePct float64   `json:"default_share_pct"`
	BankAccount     string    `json:"bank_account"`
	Status          string    `json:"status"` // active, inactive
	Notes           string    `json:"notes"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}
