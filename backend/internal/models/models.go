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

type Outlet struct {
	BaseModel
	Name    string `json:"name"`
	Address string `json:"address"`
	Phone   string `json:"phone"`
	Code    string `json:"code" gorm:"unique"` // short code eg. "pusat", "cabang-a"
}

type User struct {
	BaseModel
	Name     string `json:"name"`
	Email    string `json:"email" gorm:"unique"`
	Password string `json:"-"`    // Don't return password in JSON
	Role     string `json:"role"` // owner, manager, cashier
	OutletID uint   `json:"outlet_id" gorm:"default:0"` // 0 = all outlets (owner only)
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
	Name             string  `json:"name"`
	Category         string  `json:"category"` // Kopi, Susu, Pemanis, Kemasan, etc.
	Unit             string  `json:"unit"` // gram, ml, pcs
	PurchaseUnit     string  `json:"purchase_unit"` // kg, liter, gram, pcs
	PurchaseUnitSize float64 `json:"purchase_unit_size"` // isi per satuan beli (1000 gr/kg, 100 gr/pack)
	CurrentStock     float64 `json:"current_stock"`
	MinStock         float64 `json:"min_stock"`
	CostPerUnit      float64 `json:"cost_per_unit"`
	OutletID         uint    `json:"outlet_id" gorm:"index"`
}

type ProductionTarget struct {
	BaseModel
	ProductID uint    `json:"product_id" gorm:"uniqueIndex:uq_product_outlet"`
	TargetCup float64 `json:"target_cup"`
	OutletID  uint    `json:"outlet_id" gorm:"uniqueIndex:uq_product_outlet;default:1"`
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
	OutletID     uint      `json:"outlet_id" gorm:"index"`
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
	OutletID      uint        `json:"outlet_id" gorm:"index"`
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

// ⚠️ Vetted by SOSIOMEN - Manual Review Required by Senior Engineer/Manager
type Expense struct {
	BaseModel
	Title         string    `json:"title"`
	Amount        float64   `json:"amount"`
	Category      string    `json:"category"`                // Operational, Marketing, Maintenance
	CostType      string    `json:"cost_type" gorm:"default:fixed"` // fixed, variable
	PaymentMethod string    `json:"payment_method" gorm:"default:Cash"` // Cash, QRIS, Lainnya
	Date          time.Time `json:"date" gorm:"index"`
	Description   string    `json:"description"`
	Notes         string    `json:"notes"`
	OutletID      uint      `json:"outlet_id" gorm:"index"`
}

type Setting struct {
	BaseModel
	Key          string `json:"key" gorm:"uniqueIndex:idx_key_outlet"`
	Value        string `json:"value"`
	SettingGroup string `json:"group" gorm:"column:setting_group"` // profile, tax, printer, etc.
	OutletID     uint   `json:"outlet_id" gorm:"uniqueIndex:idx_key_outlet;default:0"`
}

type CashRegister struct {
	BaseModel
	UserID        uint       `json:"user_id" gorm:"index"`
	CashierName   string     `json:"cashier_name"`
	OutletID      uint       `json:"outlet_id" gorm:"index"`
	OpeningAmount float64    `json:"opening_amount"`            // Uang receh / kas awal saat buka kas
	Notes         string     `json:"notes"`
	OpenedAt      time.Time  `json:"opened_at" gorm:"index"`    // Waktu buka kas
	ClosedAt      *time.Time `json:"closed_at"`                 // Reserved: waktu tutup kas
	ClosingAmount *float64   `json:"closing_amount"`            // Reserved: kas akhir saat tutup kas
	ExpectedCash  float64    `json:"expected_cash"`             // kas diharapkan (awal + penjualan tunai shift)
	Variance      float64    `json:"variance"`                  // selisih: closing - expected
	Status        string     `json:"status" gorm:"default:open;index"` // open, closed
}

// CashBook — Buku Kas pemilik (distinct from CashRegister shift sessions)
// Records cash inflows/outflows with method Cash/QRIS/Lainnya
type CashBook struct {
	BaseModel
	OutletID    uint      `json:"outlet_id" gorm:"index"`
	Date        time.Time `json:"date" gorm:"index"`
	Method      string    `json:"method" gorm:"index"` // Cash, QRIS, Lainnya
	Type        string    `json:"type" gorm:"index"`   // income, expense
	Amount      float64   `json:"amount"`
	Description string    `json:"description"`
	Reference   string    `json:"reference"` // optional: order_id, expense_id, etc.
	CreatedBy   uint      `json:"created_by" gorm:"index"`
}
