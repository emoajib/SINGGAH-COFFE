package models

import (
	"time"

	"gorm.io/gorm"
)

// Barista represents master data for coffee shop baristas / staff.
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
type Barista struct {
	ID              uint           `gorm:"primaryKey" json:"id"`
	CreatedAt       time.Time      `gorm:"index" json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`
	OutletID        uint           `json:"outlet_id" gorm:"index;index:idx_baristas_outlet_status;default:1"`
	Name            string         `json:"name" gorm:"not null;index"`
	Phone           string         `json:"phone"`
	DefaultSharePct float64        `json:"default_share_pct" gorm:"default:20"`
	BankAccount     string         `json:"bank_account"` // e.g. BCA 1234567890 a.n Salman
	Status          string         `json:"status" gorm:"default:active;index;index:idx_baristas_outlet_status"` // active, inactive
	Notes           string         `json:"notes"`
}

func (Barista) TableName() string {
	return "baristas"
}
