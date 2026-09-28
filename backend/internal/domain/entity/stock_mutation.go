package entity

import "time"

// Vetted by AI - Manual Review Required by Senior Engineer/Manager

type StockMutation struct {
	ID           uint
	IngredientID uint
	Type         string // IN, OUT, ADJ_ADD, ADJ_SUB, TRANSFER
	Location     string // warehouse, kedai
	FromLocation string // warehouse, kedai (untuk TRANSFER)
	ToLocation   string // warehouse, kedai (untuk TRANSFER)
	Quantity     float64
	ReferenceID  string
	Notes        string
	Date         time.Time
	CreatedAt    time.Time
	OutletID     uint
}

type MutationType string

const (
	MutationIn       MutationType = "IN"
	MutationOut      MutationType = "OUT"
	MutationAdd      MutationType = "ADJ_ADD"
	MutationSub      MutationType = "ADJ_SUB"
	MutationTransfer MutationType = "TRANSFER"
)

type StockMutationResponse struct {
	ID             uint      `json:"id"`
	IngredientID   uint      `json:"ingredient_id"`
	IngredientName string    `json:"ingredient_name"`
	Type           string    `json:"type"`
	Location       string    `json:"location"`
	FromLocation   string    `json:"from_location"`
	ToLocation     string    `json:"to_location"`
	Quantity       float64   `json:"quantity"`
	ReferenceID    string    `json:"reference_id"`
	Notes          string    `json:"notes"`
	Date           time.Time `json:"date"`
	CreatedAt      time.Time `json:"created_at"`
}

func (m *StockMutation) ToResponse() StockMutationResponse {
	return StockMutationResponse{
		ID:           m.ID,
		IngredientID: m.IngredientID,
		Type:         m.Type,
		Location:     m.Location,
		FromLocation: m.FromLocation,
		ToLocation:   m.ToLocation,
		Quantity:     m.Quantity,
		ReferenceID:  m.ReferenceID,
		Notes:        m.Notes,
		Date:         m.Date,
		CreatedAt:    m.CreatedAt,
	}
}
