package entity

import "time"

type Expense struct {
	ID          uint
	Title       string
	Amount      float64
	Category    string
	Date        time.Time
	Description string
	Notes       string
	CreatedAt   time.Time
}

type ExpenseResponse struct {
	ID          uint      `json:"id"`
	Title       string    `json:"title"`
	Amount      float64   `json:"amount"`
	Category    string    `json:"category"`
	Date        time.Time `json:"date"`
	Description string    `json:"description"`
	Notes       string    `json:"notes"`
	CreatedAt   time.Time `json:"created_at"`
}

func (e *Expense) ToResponse() ExpenseResponse {
	return ExpenseResponse{
		ID:          e.ID,
		Title:       e.Title,
		Amount:      e.Amount,
		Category:    e.Category,
		Date:        e.Date,
		Description: e.Description,
		Notes:       e.Notes,
		CreatedAt:   e.CreatedAt,
	}
}
