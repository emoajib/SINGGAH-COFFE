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
	Status            string         `json:"status" gorm:"default:draft;index"`
	PerProduct        string         `json:"per_product"`
	ExpensesBreakdown string         `json:"expenses_breakdown" gorm:"type:text"`
	PaymentNote       string         `json:"payment_note"`
	TaxNote       string         `json:"tax_note"`
	BasisType     string         `json:"basis_type" gorm:"default:net"`  // net, gross
	OwnerPct      float64        `json:"owner_pct" gorm:"default:60"`    // owner percentage
	// Snapshot rasio per periode (total OwnerPct+PoolPct wajib 100, dikunci saat finalize).
	PoolPct             float64    `json:"pool_pct" gorm:"default:40"`
	RatioEffectiveDate  *time.Time `json:"ratio_effective_date"`
	RatioLockedAt       *time.Time `json:"ratio_locked_at"`
	RoundingRemainder   float64    `json:"rounding_remainder" gorm:"default:0"` // total sisa rupiah ke kas
	People        []ProfitSharingPerson `json:"people" gorm:"foreignKey:PeriodID"`
}

func (ProfitSharingPeriod) TableName() string {
	return "profit_sharing_periods"
}

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
type ShiftConfig struct {
	ID             uint           `gorm:"primaryKey" json:"id"`
	CreatedAt      time.Time      `gorm:"index" json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`
	OutletID       uint           `json:"outlet_id" gorm:"index:idx_shift_outlet"`
	Name           string         `json:"name" gorm:"size:50;not null"`
	StartTime      string         `json:"start_time" gorm:"size:5;not null"` // "07:00" WIB
	EndTime        string         `json:"end_time" gorm:"size:5;not null"`   // "14:00" WIB
	OwnerPct       float64        `json:"owner_pct" gorm:"default:60"`       // default 60%
	BaristaPoolPct float64        `json:"barista_pool_pct" gorm:"default:40"`// default 40% (OwnerPct + BaristaPoolPct = 100)
	IsActive       bool           `json:"is_active" gorm:"default:true"`
	SortOrder      int            `json:"sort_order" gorm:"default:0"`
}

func (ShiftConfig) TableName() string {
	return "shift_configs"
}

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
type ProfitSharingPerson struct {
	ID               uint           `gorm:"primaryKey" json:"id"`
	CreatedAt        time.Time      `gorm:"index" json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	DeletedAt        gorm.DeletedAt `gorm:"index" json:"-"`
	PeriodID         uint           `json:"period_id" gorm:"index"`
	Name             string         `json:"name"`
	Role             string         `json:"role"` // owner, barista
	SharePct         float64        `json:"share_pct"`
	GrossAmount      float64        `json:"gross_amount"`
	LeaveReduction   float64        `json:"leave_reduction"`
	CashbonReduction float64        `json:"cashbon_reduction"`
	Amount           float64        `json:"amount"` // Jatah bersih diterima
	IsOnLeave        bool           `json:"is_on_leave"`
	LeaveDays        int            `json:"leave_days" gorm:"default:0"`
	LeaveDates       string         `json:"leave_dates" gorm:"type:text"`                // Legacy: comma-separated leave dates (for backward compatibility)
	Attendance       string         `json:"attendance" gorm:"type:text;default:'{}'"`    // JSON: map[date][]shiftID - e.g., {"2026-10-01":[1,2],"2026-10-02":[1]}
	ShiftIDs         string         `json:"shift_ids" gorm:"type:text;default:'[]'"`       // JSON array of shift IDs
	ShiftNames       string         `json:"shift_names" gorm:"type:text;default:'[]'"`     // JSON array of shift names
	ShiftPoolPcts    string         `json:"shift_pool_pcts" gorm:"type:text;default:'[]'"` // JSON array of shift pool percentages
	Cashbons         []BaristaCashbon `json:"cashbons" gorm:"-"`
}

func (ProfitSharingPerson) TableName() string {
	return "profit_sharing_people"
}

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
type BaristaCashbon struct {
	ID            uint           `gorm:"primaryKey" json:"id"`
	CreatedAt     time.Time      `gorm:"index" json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`
	OutletID      uint           `json:"outlet_id" gorm:"index;index:idx_cashbons_outlet_status;index:idx_cashbons_outlet_date"`
	PersonID      uint           `json:"person_id" gorm:"index"`
	BaristaName   string         `json:"barista_name" gorm:"index"`
	Amount        float64        `json:"amount"`
	CashbonDate   time.Time      `json:"cashbon_date" gorm:"index;index:idx_cashbons_outlet_date"`
	PaymentMethod string         `json:"payment_method" gorm:"default:Cash"` // Cash, Transfer, Lainnya
	Reason        string         `json:"reason"`
	Status        string         `json:"status" gorm:"default:pending;index;index:idx_cashbons_outlet_status"`
	PeriodID      uint           `json:"period_id" gorm:"index"`
	// Kasbon cap + carry-over: sisa yang belum tertutup dibawa ke periode berikut.
	RemainingBalance float64 `json:"remaining_balance" gorm:"default:0"`
	RecordedBy       uint    `json:"recorded_by" gorm:"index"`
	ApprovedBy       *uint   `json:"approved_by" gorm:"index"`
}

func (BaristaCashbon) TableName() string {
	return "barista_cashbons"
}
