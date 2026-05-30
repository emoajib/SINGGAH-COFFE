package entity

import "time"

type StockMutation struct {
	ID           uint
	IngredientID uint
	Type         string // IN, OUT, ADJ_ADD, ADJ_SUB
	Quantity     float64
	ReferenceID  string
	Notes        string
	Date         time.Time
	CreatedAt    time.Time
}

type MutationType string

const (
	MutationIn    MutationType = "IN"
	MutationOut   MutationType = "OUT"
	MutationAdd   MutationType = "ADJ_ADD"
	MutationSub   MutationType = "ADJ_SUB"
)

type StockMutationResponse struct {
	ID           uint      `json:"id"`
	IngredientID uint      `json:"ingredient_id"`
	Type         string    `json:"type"`
	Quantity     float64   `json:"quantity"`
	ReferenceID  string    `json:"reference_id"`
	Notes        string    `json:"notes"`
	Date         time.Time `json:"date"`
	CreatedAt    time.Time `json:"created_at"`
}

func (m *StockMutation) ToResponse() StockMutationResponse {
	return StockMutationResponse{
		ID:           m.ID,
		IngredientID: m.IngredientID,
		Type:         m.Type,
		Quantity:     m.Quantity,
		ReferenceID:  m.ReferenceID,
		Notes:        m.Notes,
		Date:         m.Date,
		CreatedAt:    m.CreatedAt,
	}
}
