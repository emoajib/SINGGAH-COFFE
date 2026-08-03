package repository

import (
	"singgah-pos-backend/internal/domain/entity"
)

// UserRepository defines data access for users
type UserRepository interface {
	FindByID(id uint) (*entity.User, error)
	FindByEmail(email string) (*entity.User, error)
	FindByIdentifier(identifier string) (*entity.User, error)
	FindAll() ([]entity.User, error)
	Create(user *entity.User) error
	Update(user *entity.User) error
	Delete(id uint) error
}

// ProductRepository defines data access for products
type ProductRepository interface {
	FindByID(id uint) (*entity.Product, error)
	FindByIDWithRecipe(id uint) (*entity.Product, error)
	FindByIDWithRecipeForUpdate(id uint) (*entity.Product, error)
	FindAll(limit, offset int) ([]entity.Product, error)
	Create(product *entity.Product) error
	Update(product *entity.Product) error
	UpdateStockAtomic(id uint, delta float64, operator string) error
	Delete(id uint) error
	DeleteRecipeByProductID(productID uint) error
	CreateRecipeItems(items []entity.RecipeItem) error
}

// IngredientRepository defines data access for ingredients
type IngredientRepository interface {
	FindByID(id uint) (*entity.Ingredient, error)
	FindByIDForUpdate(id uint) (*entity.Ingredient, error)
	FindAll(outletID ...uint) ([]entity.Ingredient, error)
	Create(ingredient *entity.Ingredient) error
	Update(ingredient *entity.Ingredient) error
	UpdateStock(id uint, newStock float64) error
	UpdateStockAtomic(id uint, delta float64, operator string) error
	UpdateCostPerUnit(id uint, cost float64) error
	Delete(id uint) error
	CountLowStock(outletID ...uint) (int64, error)
	FindLowStock(limit int, outletID ...uint) ([]entity.Ingredient, error)
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
	FindAll(limit, offset int, outletID ...uint) ([]entity.Order, error)
	Create(order *entity.Order) error
	Update(order *entity.Order) error
	GetTotalSalesSince(since string, outletID ...uint) (float64, error)
	GetTotalSalesRange(start, end string, outletID ...uint) (float64, error)
	CountSince(since string, outletID ...uint) (int64, error)
	CountByStatus(status string, outletID ...uint) (int64, error)
	GetSumByStatusSince(status, since, timeFormat string, outletID ...uint) ([]entity.TrendPoint, error)
	// BEP
	GetDailySalesRange(start, end string, outletID ...uint) ([]entity.DailySales, error)
	GetAverageOrderValue(start, end string, outletID ...uint) (float64, error)
}

// OrderItemRepository defines data access for order items
type OrderItemRepository interface {
	Create(items []entity.OrderItem) error
	GetTotalCogsByStatus(status string, outletID ...uint) (float64, error)
	GetTotalCogsRange(start, end string, outletID ...uint) (float64, error)
	GetCategoryBreakdown(outletID ...uint) ([]entity.CatBreakdown, error)
	GetTopProducts(limit int, outletID ...uint) ([]entity.TopProduct, error)
	// BEP
	GetProductSalesVolume(start, end string, outletID ...uint) ([]entity.ProductSalesVolume, error)
}

// ExpenseRepository defines data access for expenses
type ExpenseRepository interface {
	FindAll(outletID ...uint) ([]entity.Expense, error)
	FindByID(id uint) (*entity.Expense, error)
	Create(expense *entity.Expense) error
	Update(expense *entity.Expense) error
	Delete(id uint) error
	GetTotal(outletID ...uint) (float64, error)
	GetBreakdownRange(start, end string, outletID ...uint) ([]entity.ExpenseDetail, error)
	// BEP
	GetTotalByCostType(costType, start, end string, outletID ...uint) (float64, error)
	GetFixedCostBreakdown(start, end string, outletID ...uint) ([]entity.FixedCostItem, error)
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
	FindAll(limit int) ([]entity.ProcessedWebhook, error)
}

// OutletRepository defines data access for outlets
type OutletRepository interface {
	FindAll() ([]entity.Outlet, error)
	FindByID(id uint) (*entity.Outlet, error)
	Create(outlet *entity.Outlet) error
	Update(outlet *entity.Outlet) error
	Delete(id uint) error
}

// TokenBlacklistRepository defines data access for token blacklist
type TokenBlacklistRepository interface {
	Create(blacklist *entity.TokenBlacklist) error
	FindByJti(jti string) (*entity.TokenBlacklist, error)
	FindByTokenHash(tokenHash string) (*entity.TokenBlacklist, error)
	IsTokenBlacklisted(tokenString string) (bool, error)
	DeleteExpired() error
}

// CashRegisterRepository defines data access for cash registers
type CashRegisterRepository interface {
	FindByID(id uint) (*entity.CashRegister, error)
	FindOpenByUserID(userID uint) (*entity.CashRegister, error)
	FindAll(outletID uint, cashierName string, dateFrom string, dateTo string, status string, limit int, offset int) ([]entity.CashRegister, error)
	CountOpenByOutlet(outletID uint) (int64, error)
	Create(cashRegister *entity.CashRegister) error
	Update(cashRegister *entity.CashRegister) error
	Delete(id uint) error
}
