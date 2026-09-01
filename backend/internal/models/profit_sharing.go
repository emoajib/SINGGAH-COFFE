package models

import (
	"time"

	"gorm.io/gorm"
)

type ProfitSharingPeriod struct {
	ID            uint           `gorm:"primaryKey" json:"id"`
	CreatedAt     time.Time      `gorm:"index" json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`
	OutletID      uint           `json:"outlet_id" gorm:"index"`
	PeriodStart   time.Time      `json:"period_start" gorm:"index"`
	PeriodEnd     time.Time      `json:"period_end"`
	BasisAmount   float64        `json:"basis_amount"`
	TotalExpenses float64        `json:"total_expenses"`
	TotalCogs     float64        `json:"total_cogs"`
	NetProfit     float64        `json:"net_profit"`
	Ratio         float64        `json:"ratio"`
	KeeperAmount  float64        `json:"keeper_amount"`
	OwnerAmount   float64        `json:"owner_amount"`
	Status        string         `json:"status" gorm:"default:draft;index"`
	PerProduct    string         `json:"per_product"`
	PaymentNote   string         `json:"payment_note"`
	TaxNote       string         `json:"tax_note"`
}

func (ProfitSharingPeriod) TableName() string {
	return "profit_sharing_periods"
}
