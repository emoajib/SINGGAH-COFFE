package models

import (
	"time"

	"gorm.io/gorm"
)

// BaseModel overrides gorm.Model to provide lowercase JSON tags for ID and other fields
type BaseModel struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time      `gorm:"index" json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

type User struct {
	BaseModel
	Name     string `json:"name"`
	Email    string `json:"email" gorm:"unique"`
	Password string `json:"-"`    // Don't return password in JSON
	Role     string `json:"role"` // owner, manager, cashier
}

type Product struct {
	BaseModel
	Name        string       `json:"name"`
	Category    string       `json:"category"`
	Price       float64      `json:"price"`
	Cost        float64      `json:"cost"`  // Calculated from recipe or manual
	Stock       int          `json:"stock"` // For direct items like cans/pastries
	Sku         string       `json:"sku" gorm:"unique"`
	Description string       `json:"description"`
	ImageURL    string       `json:"image_url"`
	Recipe      []RecipeItem `json:"recipe" gorm:"foreignKey:ProductID"`
}

type Ingredient struct {
	BaseModel
	Name         string  `json:"name"`
	Unit         string  `json:"unit"` // gram, ml, pcs
	CurrentStock float64 `json:"current_stock"`
	MinStock     float64 `json:"min_stock"`
	CostPerUnit  float64 `json:"cost_per_unit"`
}

type RecipeItem struct {
	BaseModel
	ProductID    uint       `json:"product_id"`
	IngredientID uint       `json:"ingredient_id"`
	Ingredient   Ingredient `json:"ingredient"`
	Quantity     float64    `json:"quantity"` // Amount needed for 1 product
}

type StockMutation struct {
	BaseModel
	IngredientID uint      `json:"ingredient_id" gorm:"index"`
	Type         string    `json:"type"` // IN (Purchase), OUT (Sales), ADJ (Audit)
	Quantity     float64   `json:"quantity"`
	ReferenceID  string    `json:"reference_id"` // PO Number or Order Number
	Notes        string    `json:"notes"`
	Date         time.Time `json:"date"`
}

type PurchaseOrder struct {
	BaseModel
	PONumber  string    `json:"po_number" gorm:"unique"`
	Supplier  string    `json:"supplier"`
	Status    string    `json:"status"` // Draft, Ordered, Received, Cancelled
	TotalCost float64   `json:"total_cost"`
	Date      time.Time `json:"date"`
	Note      string    `json:"note"`
}

type Order struct {
	BaseModel
	OrderNumber   string      `json:"order_number" gorm:"unique"`
	TotalAmount   float64     `json:"total_amount"`
	PaymentMethod string      `json:"payment_method"` // Cash, QRIS, Transfer
	PaymentStatus string      `json:"payment_status"` // Unpaid, Paid, Cancelled
	PaymentRef    string      `json:"payment_ref"`    // ID from Xendit/Midtrans
	Status        string      `json:"status" gorm:"index"` // Completed, Pending, Void
	UserID        uint        `json:"user_id"`
	CashierName   string      `json:"cashier_name"`
	OrderItems    []OrderItem `json:"items" gorm:"foreignKey:OrderID"`
	OrderTime     time.Time   `json:"order_time"`
}

type OrderItem struct {
	BaseModel
	OrderID   uint    `json:"order_id" gorm:"index"`
	ProductID uint    `json:"product_id"`
	Product   Product `json:"product"`
	Quantity  int     `json:"quantity"`
	Price     float64 `json:"price"` // Price at moment of sale
	Cost      float64 `json:"cost"`  // HPP at moment of sale (for P&L)
}

type ProcessedWebhook struct {
	BaseModel
	WebhookID string `json:"webhook_id" gorm:"unique"`
	Status    string `json:"status"`
}

type Expense struct {
	BaseModel
	Title       string    `json:"title"`
	Amount      float64   `json:"amount"`
	Category    string    `json:"category"` // Operational, Marketing, Maintenance
	Date        time.Time `json:"date" gorm:"index"`
	Description string    `json:"description"`
	Notes       string    `json:"notes"`
}

type Setting struct {
	BaseModel
	Key          string `json:"key" gorm:"unique"`
	Value        string `json:"value"`
	SettingGroup string `json:"group" gorm:"column:setting_group"` // profile, tax, printer, etc.
}
