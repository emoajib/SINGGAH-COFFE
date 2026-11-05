package models

type OrderMaterial struct {
	BaseModel
	OrderID      uint    `json:"order_id" gorm:"index"`
	IngredientID uint    `json:"ingredient_id"`
	Quantity     float64 `json:"quantity"`
	Location     string  `json:"location" gorm:"default:'kedai'"`
}