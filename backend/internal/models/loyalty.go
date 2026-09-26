// Vetted by AI - Manual Review Required by Senior Engineer/Manager
package models

import (
	"time"
)

type Customer struct {
	BaseModel
	OutletID       uint       `json:"outlet_id" gorm:"index:idx_phone_outlet;index:idx_last_visit"`
	Phone          string     `json:"phone" gorm:"size:20;not null;index:idx_phone_outlet"`
	Name           string     `json:"name" gorm:"size:100;default:''"`
	Email          string     `json:"email" gorm:"size:100;default:''"`
	BirthDate      *time.Time `json:"birth_date"`
	TotalOrders    int        `json:"total_orders" gorm:"default:0"`
	TotalSpend     float64    `json:"total_spend" gorm:"default:0"`
	AvgOrderValue  float64    `json:"avg_order_value" gorm:"default:0"`
	FirstVisit     *time.Time `json:"first_visit"`
	LastVisit      *time.Time `json:"last_visit" gorm:"index:idx_last_visit"`
	LoyaltyToken   string     `json:"loyalty_token" gorm:"size:16;not null;uniqueIndex"`
	Tier           string     `json:"tier" gorm:"size:20;default:'regular'"` // regular, silver, gold, platinum
	Tags           string     `json:"tags" gorm:"size:255;default:''"`
	InternalNotes  string     `json:"internal_notes" gorm:"type:text"`
	IsActive       bool       `json:"is_active" gorm:"default:true"`
	CreatedBy      uint       `json:"created_by" gorm:"default:0"`
}

type LoyaltyProgram struct {
	BaseModel
	OutletID           uint       `json:"outlet_id" gorm:"index:idx_programs_active"`
	Name               string     `json:"name" gorm:"size:100;not null"`
	Description        string     `json:"description" gorm:"type:text"`
	ThresholdType      string     `json:"threshold_type" gorm:"size:20;default:'order_count'"` // order_count, total_spend
	ThresholdValue     float64    `json:"threshold_value" gorm:"default:10"`
	RewardType         string     `json:"reward_type" gorm:"size:20;default:'free_menu'"` // free_menu, souvenir, discount
	RewardNote         string     `json:"reward_note" gorm:"size:255;default:''"`
	EligibleProductIDs string     `json:"eligible_product_ids" gorm:"type:text"` // comma separated or json array IDs
	MaxProductPrice    float64    `json:"max_product_price" gorm:"default:0"`
	SouvenirProductIDs string     `json:"souvenir_product_ids" gorm:"type:text"`
	DiscountPct        float64    `json:"discount_pct" gorm:"default:0"`
	DiscountMax        float64    `json:"discount_max" gorm:"default:0"`
	IsActive           bool       `json:"is_active" gorm:"default:true;index:idx_programs_active"`
	ValidFrom          *time.Time `json:"valid_from"`
	ValidUntil         *time.Time `json:"valid_until"`
	MaxRedemptions     int        `json:"max_redemptions" gorm:"default:0"`
}

type LoyaltyStamp struct {
	BaseModel
	CustomerID   uint      `json:"customer_id" gorm:"index:idx_stamps_lookup"`
	ProgramID    uint      `json:"program_id" gorm:"index:idx_stamps_lookup"`
	OrderID      uint      `json:"order_id" gorm:"index:idx_stamps_order"`
	StampValue   float64   `json:"stamp_value" gorm:"default:1"`
	StampDate    time.Time `json:"stamp_date" gorm:"index"`
	IsUsed       bool      `json:"is_used" gorm:"default:false;index:idx_stamps_lookup"`
	RedemptionID uint      `json:"redemption_id" gorm:"default:0"`
	OutletID     uint      `json:"outlet_id" gorm:"index"`
}

type LoyaltyRedemption struct {
	BaseModel
	CustomerID    uint      `json:"customer_id" gorm:"index"`
	ProgramID     uint      `json:"program_id" gorm:"index"`
	OrderID       uint      `json:"order_id" gorm:"default:0"`
	CashierID     uint      `json:"cashier_id"`
	RewardType    string    `json:"reward_type" gorm:"size:20"`
	RewardDetail  string    `json:"reward_detail" gorm:"size:255"`
	RedeemedValue float64   `json:"redeemed_value" gorm:"default:0"`
	StampsUsed    int       `json:"stamps_used" gorm:"default:0"`
	RedeemedAt    time.Time `json:"redeemed_at" gorm:"index"`
	Notes         string    `json:"notes" gorm:"type:text"`
	ExpenseID     uint      `json:"expense_id" gorm:"default:0"`
	OutletID      uint      `json:"outlet_id" gorm:"index"`
}

type CustomerFeedback struct {
	BaseModel
	CustomerID   uint       `json:"customer_id" gorm:"index"`
	OutletID     uint       `json:"outlet_id" gorm:"index:idx_feedback_outlet"`
	LoyaltyToken string     `json:"loyalty_token" gorm:"size:16;index"`
	Rating       int        `json:"rating" gorm:"default:5"` // 1-5
	Category     string     `json:"category" gorm:"size:30;default:'lainnya'"` // pelayanan, minuman, tempat, harga, lainnya
	Message      string     `json:"message" gorm:"type:text;not null"`
	OwnerReply   string     `json:"owner_reply" gorm:"type:text"`
	RepliedBy    uint       `json:"replied_by" gorm:"default:0"`
	RepliedAt    *time.Time `json:"replied_at"`
	Status       string     `json:"status" gorm:"size:20;default:'new';index:idx_feedback_outlet"` // new, read, replied
	IsPublic     bool       `json:"is_public" gorm:"default:false"`
	SubmittedAt  time.Time  `json:"submitted_at" gorm:"index:idx_feedback_outlet"`
	VisitDate    *time.Time `json:"visit_date"`
	OrderID      uint       `json:"order_id" gorm:"default:0"`
}
