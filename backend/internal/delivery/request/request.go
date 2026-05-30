package request

type LoginRequest struct {
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type RegisterRequest struct {
	Name     string `json:"name" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=5"`
	Role     string `json:"role" binding:"required,oneof=owner manager cashier"`
}

type UpdateProfileRequest struct {
	Name  string `json:"name" binding:"required"`
	Email string `json:"email" binding:"required,email"`
}

type UpdateUserRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email" binding:"omitempty,email"`
	Role     string `json:"role" binding:"omitempty,oneof=owner manager cashier"`
	Password string `json:"password"`
}

type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password" binding:"required"`
	NewPassword     string `json:"new_password" binding:"required,min=5"`
}

type CreateProductRequest struct {
	Name        string  `json:"name" binding:"required"`
	Category    string  `json:"category" binding:"required"`
	Price       float64 `json:"price" binding:"required,gte=0"`
	Stock       int     `json:"stock" binding:"gte=0"`
	Sku         string  `json:"sku" binding:"required"`
	Description string  `json:"description"`
	ImageURL    string  `json:"image_url"`
	Recipe      []struct {
		IngredientID uint    `json:"ingredient_id" binding:"required"`
		Quantity     float64 `json:"quantity" binding:"required,gt=0"`
	} `json:"recipe"`
}

type UpdateProductRequest struct {
	Name        string  `json:"name" binding:"required"`
	Category    string  `json:"category" binding:"required"`
	Price       float64 `json:"price" binding:"required,gte=0"`
	Stock       int     `json:"stock" binding:"gte=0"`
	Sku         string  `json:"sku"`
	Description string  `json:"description"`
	ImageURL    string  `json:"image_url"`
	Recipe      []struct {
		IngredientID uint    `json:"ingredient_id" binding:"required"`
		Quantity     float64 `json:"quantity" binding:"required,gt=0"`
	} `json:"recipe"`
}

type CreateOrderRequest struct {
	OrderNumber   string `json:"order_number"`
	PaymentMethod string `json:"payment_method" binding:"required"`
	CashierName   string `json:"cashier_name"`
	CustomerEmail string `json:"customer_email"`
	Items         []struct {
		ProductID uint `json:"product_id" binding:"required"`
		Quantity  int  `json:"quantity" binding:"required,gt=0"`
	} `json:"items" binding:"required,min=1"`
}

type CreateIngredientRequest struct {
	Name         string  `json:"name" binding:"required"`
	Unit         string  `json:"unit" binding:"required"`
	CurrentStock float64 `json:"current_stock" binding:"gte=0"`
	MinStock     float64 `json:"min_stock" binding:"gte=0"`
	CostPerUnit  float64 `json:"cost_per_unit" binding:"required,gt=0"`
}

type UpdateIngredientRequest struct {
	Name        string  `json:"name" binding:"required"`
	Unit        string  `json:"unit" binding:"required"`
	MinStock    float64 `json:"min_stock" binding:"gte=0"`
	CostPerUnit float64 `json:"cost_per_unit" binding:"required,gt=0"`
}

type StockMutationRequest struct {
	IngredientID      uint    `json:"ingredient_id" binding:"required"`
	Type              string  `json:"type" binding:"required,oneof=IN OUT ADJ"`
	Quantity          float64 `json:"quantity" binding:"required,gt=0"`
	Notes             string  `json:"notes"`
	IsPurchase        bool    `json:"is_purchase"`
	UpdateMasterPrice bool    `json:"update_master_price"`
	NewCostPerUnit    float64 `json:"new_cost_per_unit"`
}

type CreateExpenseRequest struct {
	Title       string  `json:"title" binding:"required"`
	Amount      float64 `json:"amount" binding:"required,gt=0"`
	Category    string  `json:"category" binding:"required"`
	Date        string  `json:"date" binding:"required"`
	Description string  `json:"description"`
	Notes       string  `json:"notes"`
}

type UpdateSettingsRequest map[string]string
