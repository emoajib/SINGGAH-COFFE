package entity

type Product struct {
	ID          uint
	Name        string
	Category    string
	Price       float64
	Cost        float64
	Stock       int
	Sku         string
	Description string
	ImageURL    string
	Recipe      []RecipeItem
}

type RecipeItem struct {
	ID           uint
	ProductID    uint
	IngredientID uint
	Ingredient   Ingredient
	Quantity     float64
}

type ProductResponse struct {
	ID          uint                `json:"id"`
	Name        string              `json:"name"`
	Category    string              `json:"category"`
	Price       float64             `json:"price"`
	Cost        float64             `json:"cost"`
	Stock       int                 `json:"stock"`
	Sku         string              `json:"sku"`
	Description string              `json:"description"`
	ImageURL    string              `json:"image_url"`
	Recipe      []RecipeItemResponse `json:"recipe"`
}

type RecipeItemResponse struct {
	ID           uint               `json:"id"`
	ProductID    uint               `json:"product_id"`
	IngredientID uint               `json:"ingredient_id"`
	Ingredient   IngredientResponse `json:"ingredient"`
	Quantity     float64            `json:"quantity"`
}

func (p *Product) ToResponse() ProductResponse {
	recipe := make([]RecipeItemResponse, len(p.Recipe))
	for i, r := range p.Recipe {
		recipe[i] = RecipeItemResponse{
			ID:           r.ID,
			ProductID:    r.ProductID,
			IngredientID: r.IngredientID,
			Ingredient:   r.Ingredient.ToResponse(),
			Quantity:     r.Quantity,
		}
	}
	return ProductResponse{
		ID:          p.ID,
		Name:        p.Name,
		Category:    p.Category,
		Price:       p.Price,
		Cost:        p.Cost,
		Stock:       p.Stock,
		Sku:         p.Sku,
		Description: p.Description,
		ImageURL:    p.ImageURL,
		Recipe:      recipe,
	}
}
