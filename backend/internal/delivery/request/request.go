package request

type LoginRequest struct {
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type RegisterRequest struct {
	Name     string `json:"name" binding:"required"`
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
	Role     string `json:"role" binding:"required"`
}

type UpdateProfileRequest struct {
	Name  string `json:"name"`
	Email string `json:"email"`
}

type UpdateUserRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Role     string `json:"role"`
	Password string `json:"password"`
}

type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password" binding:"required"`
	NewPassword     string `json:"new_password" binding:"required"`
}

type CreateProductRequest struct {
	Name        string  `json:"name"`
	Category    string  `json:"category"`
	Price       float64 `json:"price"`
	Stock       int     `json:"stock"`
	Sku         string  `json:"sku"`
	Description string  `json:"description"`
	ImageURL    string  `json:"image_url"`
	Recipe      []struct {
		IngredientID uint    `json:"ingredient_id"`
		Quantity     float64 `json:"quantity"`
	} `json:"recipe"`
}

type UpdateProductRequest struct {
	Name        string  `json:"name"`
	Category    string  `json:"category"`
	Price       float64 `json:"price"`
	Stock       int     `json:"stock"`
	Sku         string  `json:"sku"`
	Description string  `json:"description"`
	ImageURL    string  `json:"image_url"`
	Recipe      []struct {
		IngredientID uint    `json:"ingredient_id"`
		Quantity     float64 `json:"quantity"`
	} `json:"recipe"`
}

type CreateOrderRequest struct {
	OrderNumber   string `json:"order_number"`
	PaymentMethod string `json:"payment_method"`
	CashierName   string `json:"cashier_name"`
	CustomerEmail string `json:"customer_email"`
	Items         []struct {
		ProductID uint `json:"product_id"`
		Quantity  int  `json:"quantity"`
	} `json:"items"`
}

type CreateIngredientRequest struct {
	Name         string  `json:"name"`
	Unit         string  `json:"unit"`
	CurrentStock float64 `json:"current_stock"`
	MinStock     float64 `json:"min_stock"`
	CostPerUnit  float64 `json:"cost_per_unit"`
}

type UpdateIngredientRequest struct {
	Name        string  `json:"name"`
	Unit        string  `json:"unit"`
	MinStock    float64 `json:"min_stock"`
	CostPerUnit float64 `json:"cost_per_unit"`
}

type StockMutationRequest struct {
	IngredientID      uint    `json:"ingredient_id"`
	Type              string  `json:"type"`
	Quantity          float64 `json:"quantity"`
	Notes             string  `json:"notes"`
	IsPurchase        bool    `json:"is_purchase"`
	UpdateMasterPrice bool    `json:"update_master_price"`
	NewCostPerUnit    float64 `json:"new_cost_per_unit"`
}

type CreateExpenseRequest struct {
	Title       string  `json:"title"`
	Amount      float64 `json:"amount"`
	Category    string  `json:"category"`
	Date        string  `json:"date"`
	Description string  `json:"description"`
	Notes       string  `json:"notes"`
}

type UpdateSettingsRequest map[string]string
