// Vetted by AI - Manual Review Required by Senior Engineer/Manager
package entity

import "time"

type Customer struct {
	ID            uint
	OutletID      uint
	Phone         string
	Name          string
	Email         string
	BirthDate     *time.Time
	TotalOrders   int
	TotalSpend    float64
	AvgOrderValue float64
	FirstVisit    *time.Time
	LastVisit     *time.Time
	LoyaltyToken  string
	Tier          string
	Tags          string
	InternalNotes string
	IsActive      bool
	CreatedBy     uint
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

type LoyaltyProgram struct {
	ID                 uint
	OutletID           uint
	Name               string
	Description        string
	ThresholdType      string
	ThresholdValue     float64
	RewardType         string
	RewardNote         string
	EligibleProductIDs string
	MaxProductPrice    float64
	SouvenirProductIDs string
	DiscountPct        float64
	DiscountMax        float64
	IsActive           bool
	ValidFrom          *time.Time
	ValidUntil         *time.Time
	MaxRedemptions     int
	CreatedAt          time.Time
	UpdatedAt          time.Time
}

type LoyaltyStamp struct {
	ID           uint
	CustomerID   uint
	ProgramID    uint
	OrderID      uint
	StampValue   float64
	StampDate    time.Time
	IsUsed       bool
	RedemptionID uint
	OutletID     uint
}

type LoyaltyRedemption struct {
	ID            uint
	CustomerID    uint
	ProgramID     uint
	OrderID       uint
	CashierID     uint
	RewardType    string
	RewardDetail  string
	RedeemedValue float64
	StampsUsed    int
	RedeemedAt    time.Time
	Notes         string
	ExpenseID     uint
	OutletID      uint
}

type CustomerFeedback struct {
	ID           uint
	CustomerID   uint
	OutletID     uint
	LoyaltyToken string
	Rating       int
	Category     string
	Message      string
	OwnerReply   string
	RepliedBy    uint
	RepliedAt    *time.Time
	Status       string
	IsPublic     bool
	SubmittedAt  time.Time
	VisitDate    *time.Time
	OrderID      uint
}

// Responses / DTOs
type CustomerResponse struct {
	ID            uint       `json:"id"`
	OutletID      uint       `json:"outlet_id"`
	Phone         string     `json:"phone"`
	Name          string     `json:"name"`
	Email         string     `json:"email"`
	BirthDate     *time.Time `json:"birth_date,omitempty"`
	TotalOrders   int        `json:"total_orders"`
	TotalSpend    float64    `json:"total_spend"`
	AvgOrderValue float64    `json:"avg_order_value"`
	FirstVisit    *time.Time `json:"first_visit,omitempty"`
	LastVisit     *time.Time `json:"last_visit,omitempty"`
	LoyaltyToken  string     `json:"loyalty_token"`
	Tier          string     `json:"tier"`
	Tags          string     `json:"tags"`
	InternalNotes string     `json:"internal_notes,omitempty"`
	IsActive      bool       `json:"is_active"`
	CreatedAt     time.Time  `json:"created_at"`
}

type LoyaltyProgramResponse struct {
	ID                 uint       `json:"id"`
	OutletID           uint       `json:"outlet_id"`
	Name               string     `json:"name"`
	Description        string     `json:"description"`
	ThresholdType      string     `json:"threshold_type"`
	ThresholdValue     float64    `json:"threshold_value"`
	RewardType         string     `json:"reward_type"`
	RewardNote         string     `json:"reward_note"`
	EligibleProductIDs string     `json:"eligible_product_ids"`
	MaxProductPrice    float64    `json:"max_product_price"`
	SouvenirProductIDs string     `json:"souvenir_product_ids"`
	DiscountPct        float64    `json:"discount_pct"`
	DiscountMax        float64    `json:"discount_max"`
	IsActive           bool       `json:"is_active"`
	ValidFrom          *time.Time `json:"valid_from,omitempty"`
	ValidUntil         *time.Time `json:"valid_until,omitempty"`
	MaxRedemptions     int        `json:"max_redemptions"`
	CreatedAt          time.Time  `json:"created_at"`
}

type PublicLoyaltyCardResponse struct {
	CustomerName   string                   `json:"customer_name"`
	PhoneMasked    string                   `json:"phone_masked"`
	TotalOrders    int                      `json:"total_orders"`
	Tier           string                   `json:"tier"`
	Programs       []ProgramProgressResponse `json:"programs"`
	OutletName     string                   `json:"outlet_name"`
	RecentFeedback []FeedbackPublicResponse `json:"recent_feedback"`
}

type ProgramProgressResponse struct {
	ProgramID       uint    `json:"program_id"`
	ProgramName     string  `json:"program_name"`
	RewardNote      string  `json:"reward_note"`
	RewardType      string  `json:"reward_type"`
	CurrentStamps   int     `json:"current_stamps"`
	ThresholdValue  int     `json:"threshold_value"`
	IsEligible      bool    `json:"is_eligible"`
	ProgressPercent float64 `json:"progress_percent"`
}

type FeedbackResponse struct {
	ID           uint       `json:"id"`
	CustomerID   uint       `json:"customer_id"`
	CustomerName string     `json:"customer_name,omitempty"`
	Rating       int        `json:"rating"`
	Category     string     `json:"category"`
	Message      string     `json:"message"`
	OwnerReply   string     `json:"owner_reply,omitempty"`
	Status       string     `json:"status"`
	SubmittedAt  time.Time  `json:"submitted_at"`
}

type FeedbackPublicResponse struct {
	Rating      int       `json:"rating"`
	Message     string    `json:"message"`
	OwnerReply  string    `json:"owner_reply,omitempty"`
	SubmittedAt time.Time `json:"submitted_at"`
}
