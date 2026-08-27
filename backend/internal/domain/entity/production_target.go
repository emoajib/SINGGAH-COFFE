package entity

// ProductionTarget represents the target cups for a product over a planning period.
type ProductionTarget struct {
	ProductID uint    `json:"product_id"`
	TargetCup float64 `json:"target_cup"`
}

// ProductionTargetDetail includes product info for the dashboard editor.
type ProductionTargetDetail struct {
	ProductID   uint    `json:"product_id"`
	ProductName string  `json:"product_name"`
	TargetCup   float64 `json:"target_cup"`
}

// RequirementIngredient is the aggregated need per ingredient across all products.
type RequirementIngredient struct {
	IngredientID         uint    `json:"ingredient_id"`
	Name                 string  `json:"name"`
	Category             string  `json:"category"`
	Unit                 string  `json:"unit"`
	CurrentStock         float64 `json:"current_stock"`
	TotalNeeded          float64 `json:"total_needed"`
	PurchaseUnit         string  `json:"purchase_unit"`
	PurchaseUnitSize     float64 `json:"purchase_unit_size"`
	NeedInPurchaseUnit   float64 `json:"need_in_purchase_unit"`
	RoundedPurchaseUnit  float64 `json:"rounded_purchase_unit"`
	EstimatedCost        float64 `json:"estimated_cost"`
}

// RequirementMenu is per-menu breakdown: which ingredients and how much.
type RequirementMenu struct {
	ProductID   uint     `json:"product_id"`
	ProductName string   `json:"product_name"`
	TargetCup   float64  `json:"target_cup"`
	Items       []RequirementMenuIngredient `json:"items"`
}

type RequirementMenuIngredient struct {
	IngredientID uint    `json:"ingredient_id"`
	Name         string  `json:"name"`
	QtyPerCup    float64 `json:"qty_per_cup"`
	Unit         string  `json:"unit"`
	TotalNeed    float64 `json:"total_need"`
}

// RequirementResponse mirrors the "Kebutuhan Stok" sheet (B & C sections).
type RequirementResponse struct {
	PeriodDays        int                       `json:"period_days"`
	TotalTargetCup    float64                   `json:"total_target_cup"`
	AvgCupPerDay      float64                   `json:"avg_cup_per_day"`
	TotalEstimatedCost float64                  `json:"total_estimated_cost"`
	Menus             []RequirementMenu         `json:"menus"`
	Ingredients       []RequirementIngredient   `json:"ingredients"`
}

// DailyTargetProduct — per-product daily target vs actual realized sales.
type DailyTargetProduct struct {
	ProductID   uint    `json:"product_id"`
	ProductName string  `json:"product_name"`
	Category    string  `json:"category"`
	DailyTarget float64 `json:"daily_target"`
	Realized    float64 `json:"realized"`
	Variance    float64 `json:"variance"`
	AchPct      float64 `json:"achievement_pct"`
	Status      string  `json:"status"`
}

// DailyTargetRealization — daily production target with actual sales realization, using the SAME
// ingredient aggregation as Kebutuhan Stok so the two views never diverge.
type DailyTargetRealization struct {
	Date               string                `json:"date"`
	PeriodDays         int                   `json:"period_days"`
	PerProduct         []DailyTargetProduct  `json:"per_product"`
	Ingredients        []RequirementIngredient `json:"ingredients"`
	TotalTargetCup     float64               `json:"total_target_cup"`
	TotalRealizedCup   float64               `json:"total_realized_cup"`
	TotalEstimatedCost float64               `json:"total_estimated_cost"`
}
