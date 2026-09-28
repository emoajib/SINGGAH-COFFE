package entity

// Vetted by AI - Manual Review Required by Senior Engineer/Manager

type Ingredient struct {
	ID               uint
	Name             string
	Category         string
	Unit             string
	PurchaseUnit     string
	PurchaseUnitSize float64
	CurrentStock     float64 // Total stok (warehouse_stock + kedai_stock) untuk backward compatibility
	WarehouseStock   float64 // Stok penyimpanan gudang utama
	KedaiStock       float64 // Stok operasional meja bar barista
	MinStock         float64
	CostPerUnit      float64
	OutletID         uint
}

type IngredientResponse struct {
	ID               uint    `json:"id"`
	Name             string  `json:"name"`
	Category         string  `json:"category"`
	Unit             string  `json:"unit"`
	PurchaseUnit     string  `json:"purchase_unit"`
	PurchaseUnitSize float64 `json:"purchase_unit_size"`
	CurrentStock     float64 `json:"current_stock"`
	WarehouseStock   float64 `json:"warehouse_stock"`
	KedaiStock       float64 `json:"kedai_stock"`
	MinStock         float64 `json:"min_stock"`
	CostPerUnit      float64 `json:"cost_per_unit"`
}

func (i *Ingredient) ToResponse() IngredientResponse {
	return IngredientResponse{
		ID:               i.ID,
		Name:             i.Name,
		Category:         i.Category,
		Unit:             i.Unit,
		PurchaseUnit:     i.PurchaseUnit,
		PurchaseUnitSize: i.PurchaseUnitSize,
		CurrentStock:     i.CurrentStock,
		WarehouseStock:   i.WarehouseStock,
		KedaiStock:       i.KedaiStock,
		MinStock:         i.MinStock,
		CostPerUnit:      i.CostPerUnit,
	}
}
