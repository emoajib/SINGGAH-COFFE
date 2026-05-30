package entity

type Ingredient struct {
	ID           uint
	Name         string
	Unit         string
	CurrentStock float64
	MinStock     float64
	CostPerUnit  float64
}

type IngredientResponse struct {
	ID           uint    `json:"id"`
	Name         string  `json:"name"`
	Unit         string  `json:"unit"`
	CurrentStock float64 `json:"current_stock"`
	MinStock     float64 `json:"min_stock"`
	CostPerUnit  float64 `json:"cost_per_unit"`
}

func (i *Ingredient) ToResponse() IngredientResponse {
	return IngredientResponse{
		ID:           i.ID,
		Name:         i.Name,
		Unit:         i.Unit,
		CurrentStock: i.CurrentStock,
		MinStock:     i.MinStock,
		CostPerUnit:  i.CostPerUnit,
	}
}
