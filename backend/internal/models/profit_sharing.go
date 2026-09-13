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
	BasisType     string         `json:"basis_type" gorm:"default:net"`  // net, gross
	OwnerPct      float64        `json:"owner_pct" gorm:"default:60"`    // owner percentage
	People        []ProfitSharingPerson `json:"people" gorm:"foreignKey:PeriodID"`
}

func (ProfitSharingPeriod) TableName() string {
	return "profit_sharing_periods"
}

type ProfitSharingPerson struct {
	ID             uint           `gorm:"primaryKey" json:"id"`
	CreatedAt      time.Time      `gorm:"index" json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`
	PeriodID       uint           `json:"period_id" gorm:"index"`
	Name           string         `json:"name"`
	Role           string         `json:"role"` // owner, barista
	SharePct       float64        `json:"share_pct"`
	Amount         float64        `json:"amount"`
	IsOnLeave      bool           `json:"is_on_leave"`
	LeaveReduction float64        `json:"leave_reduction"`
}

func (ProfitSharingPerson) TableName() string {
	return "profit_sharing_people"
}
