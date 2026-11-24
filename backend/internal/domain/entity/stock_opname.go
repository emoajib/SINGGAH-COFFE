package entity

import "time"

type StockOpname struct {
	ID         uint              `json:"id"`
	OutletID   uint              `json:"outlet_id"`
	PeriodFrom time.Time         `json:"period_from"`
	PeriodTo   time.Time         `json:"period_to"`
	Notes      string            `json:"notes"`
	CreatedBy  uint              `json:"created_by"`
	CreatedAt  time.Time         `json:"created_at"`
	Items      []StockOpnameItem `json:"items"`
}

type StockOpnameItem struct {
	ID            uint    `json:"id"`
	OpnameID      uint    `json:"opname_id"`
	IngredientID  uint    `json:"ingredient_id"`
	IngredientName string  `json:"ingredient_name"`
	Unit          string  `json:"unit"`
	SystemStock   float64 `json:"system_stock"`
	PhysicalStock float64 `json:"physical_stock"`
	Difference    float64 `json:"difference"`
	Note          string  `json:"note"`
}
