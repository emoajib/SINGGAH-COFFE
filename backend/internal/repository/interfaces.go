package repository

import (
	"singgah-pos-backend/internal/domain/entity"
)

// UserRepository defines data access for users
type UserRepository interface {
	FindByID(id uint) (*entity.User, error)
	FindByEmail(email string) (*entity.User, error)
	FindAll() ([]entity.User, error)
	Create(user *entity.User) error
	Update(user *entity.User) error
	Delete(id uint) error
}

// ProductRepository defines data access for products
type ProductRepository interface {
	FindByID(id uint) (*entity.Product, error)
	FindByIDWithRecipe(id uint) (*entity.Product, error)
	FindAll(limit, offset int) ([]entity.Product, error)
	Create(product *entity.Product) error
	Update(product *entity.Product) error
	Delete(id uint) error
	DeleteRecipeByProductID(productID uint) error
	CreateRecipeItems(items []entity.RecipeItem) error
}

// IngredientRepository defines data access for ingredients
type IngredientRepository interface {
	FindByID(id uint) (*entity.Ingredient, error)
	FindAll() ([]entity.Ingredient, error)
	Create(ingredient *entity.Ingredient) error
	Update(ingredient *entity.Ingredient) error
	UpdateStock(id uint, newStock float64) error
	UpdateStockAtomic(id uint, delta float64, operator string) error
	UpdateCostPerUnit(id uint, cost float64) error
	Delete(id uint) error
	CountLowStock() (int64, error)
}

// StockMutationRepository defines data access for stock mutations
type StockMutationRepository interface {
	Create(mutation *entity.StockMutation) error
	FindByIngredientID(ingredientID uint) ([]entity.StockMutation, error)
}

// OrderRepository defines data access for orders
type OrderRepository interface {
	FindByID(id uint) (*entity.Order, error)
	FindByIDWithItems(id uint) (*entity.Order, error)
	FindAll(limit, offset int) ([]entity.Order, error)
	Create(order *entity.Order) error
	Update(order *entity.Order) error
	GetTotalSalesSince(since string) (float64, error)
	CountSince(since string) (int64, error)
	CountByStatus(status string) (int64, error)
	GetSumByStatusSince(status, since, timeFormat string) ([]entity.TrendPoint, error)
}

// OrderItemRepository defines data access for order items
type OrderItemRepository interface {
	Create(items []entity.OrderItem) error
	GetTotalCogsByStatus(status string) (float64, error)
	GetCategoryBreakdown() ([]entity.CatBreakdown, error)
	GetTopProducts(limit int) ([]entity.TopProduct, error)
}

// ExpenseRepository defines data access for expenses
type ExpenseRepository interface {
	FindAll() ([]entity.Expense, error)
	Create(expense *entity.Expense) error
	Delete(id uint) error
	GetTotal() (float64, error)
}

// SettingRepository defines data access for settings
type SettingRepository interface {
	FindAll() ([]entity.Setting, error)
	FindByGroup(group string) ([]entity.Setting, error)
	FindByKey(key string) (*entity.Setting, error)
	Upsert(key, value, group string) error
}

// WebhookRepository defines data access for processed webhooks
type WebhookRepository interface {
	FindByWebhookID(webhookID string) (*entity.ProcessedWebhook, error)
	Create(webhook *entity.ProcessedWebhook) error
	Update(order *entity.Order) error
}
