package usecase

import (
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/domain/errors"
	"singgah-pos-backend/internal/models"
)

func setupOrderTestDB() *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		panic("Failed to connect to database: " + err.Error())
	}
	db.AutoMigrate(
		&models.Order{}, &models.OrderItem{}, &models.Product{}, &models.Ingredient{},
		&models.RecipeItem{}, &models.StockMutation{}, &models.Setting{},
		&models.Expense{}, &models.CashBook{},
	)
	return db
}

func createOrderUsecase(db *gorm.DB) *OrderUsecase {
	return NewOrderUsecase(db)
}

func seedProductWithRecipe(db *gorm.DB, name, sku string, price float64, ingID uint, qty float64) uint {
	product := &models.Product{
		Name:  name,
		Price: price,
		Cost:  qty * 100,
		Stock: 100,
		Sku:   sku,
	}
	db.Create(product)

	recipe := &models.RecipeItem{
		ProductID:    product.ID,
		IngredientID: ingID,
		Quantity:     qty,
	}
	db.Create(recipe)
	return product.ID
}

func TestOrderUsecase_GetAllEmpty(t *testing.T) {
	db := setupOrderTestDB()
	defer func() { sqlDB, _ := db.DB(); sqlDB.Close() }()
	uc := createOrderUsecase(db)

	orders, err := uc.GetAll(10, 0)

	assert.NoError(t, err)
	assert.Len(t, orders, 0)
}

func TestOrderUsecase_GetByIDNotFound(t *testing.T) {
	db := setupOrderTestDB()
	defer func() { sqlDB, _ := db.DB(); sqlDB.Close() }()
	uc := createOrderUsecase(db)

	_, err := uc.GetByID(999)

	assert.Error(t, err)
	assert.ErrorIs(t, err, errors.ErrNotFound)
}

func TestOrderUsecase_CreateSuccess(t *testing.T) {
	db := setupOrderTestDB()
	defer func() { sqlDB, _ := db.DB(); sqlDB.Close() }()
	uc := createOrderUsecase(db)

	ing := &entity.Ingredient{Name: "Kopi Bubuk", Unit: "gram", CurrentStock: 1000, MinStock: 100, CostPerUnit: 100}
	db.Create(ing)

	prodID := seedProductWithRecipe(db, "Kopi Susu", "KS-001", 25000, ing.ID, 20)

	req := CreateOrderRequest{
		OrderNumber:   "ORD-TEST-001",
		PaymentMethod: "Cash",
		CashierName:   "Test Cashier",
		Items: []struct {
			ProductID uint `json:"product_id"`
			Quantity  int  `json:"quantity"`
		}{
			{ProductID: prodID, Quantity: 2},
		},
	}

	resp, err := uc.Create(req, 1, "Test Cashier")

	assert.NoError(t, err)
	assert.NotNil(t, resp)
	assert.Equal(t, "ORD-TEST-001", resp.Order.OrderNumber)
	assert.Equal(t, "Completed", resp.Order.Status)
	assert.Equal(t, "Paid", resp.Order.PaymentStatus)
	assert.Equal(t, "Cash", resp.Order.PaymentMethod)
	assert.Len(t, resp.Order.OrderItems, 1)
	assert.Equal(t, "Kopi Susu", resp.Order.OrderItems[0].Product.Name)

	expectedTotal := 25000.0 * 2
	assert.Equal(t, expectedTotal, resp.Order.TotalAmount)

	var cb models.CashBook
	db.Where("reference = ?", fmt.Sprintf("order:%d", resp.Order.ID)).First(&cb)
	assert.Equal(t, "income", cb.Type)
	assert.Equal(t, "Cash", cb.Method)
	assert.Equal(t, expectedTotal, cb.Amount)

	var updatedIng entity.Ingredient
	db.First(&updatedIng, ing.ID)
	assert.Equal(t, 960.0, updatedIng.CurrentStock) // 1000 - (20 * 2)
}

func TestOrderUsecase_CreateWithQRIS(t *testing.T) {
	db := setupOrderTestDB()
	defer func() { sqlDB, _ := db.DB(); sqlDB.Close() }()
	uc := createOrderUsecase(db)

	ing := &entity.Ingredient{Name: "Gula", Unit: "gram", CurrentStock: 500, MinStock: 50, CostPerUnit: 20}
	db.Create(ing)

	prodID := seedProductWithRecipe(db, "Es Teh", "ET-001", 10000, ing.ID, 10)

	req := CreateOrderRequest{
		OrderNumber:   "ORD-QRIS-001",
		PaymentMethod: "QRIS",
		CashierName:   "Test Cashier",
		Items: []struct {
			ProductID uint `json:"product_id"`
			Quantity  int  `json:"quantity"`
		}{
			{ProductID: prodID, Quantity: 1},
		},
	}

	resp, err := uc.Create(req, 1, "Test Cashier")

	assert.NoError(t, err)
	assert.NotNil(t, resp)
	assert.Equal(t, "Pending", resp.Order.Status)
	assert.Equal(t, "Unpaid", resp.Order.PaymentStatus)
}

func TestOrderUsecase_VoidSuccess(t *testing.T) {
	db := setupOrderTestDB()
	defer func() { sqlDB, _ := db.DB(); sqlDB.Close() }()
	uc := createOrderUsecase(db)

	ing := &entity.Ingredient{Name: "Susu", Unit: "ml", CurrentStock: 500, MinStock: 50, CostPerUnit: 30}
	db.Create(ing)

	prodID := seedProductWithRecipe(db, "Susu Segar", "SS-001", 15000, ing.ID, 50)

	created, _ := uc.Create(CreateOrderRequest{
		OrderNumber: "ORD-VOID-001", PaymentMethod: "Cash", CashierName: "CS",
		Items: []struct {
			ProductID uint `json:"product_id"`
			Quantity  int  `json:"quantity"`
		}{
			{ProductID: prodID, Quantity: 1},
		},
	}, 1, "CS")

	resp, err := uc.Void(created.Order.ID)

	assert.NoError(t, err)
	assert.NotNil(t, resp)
	assert.Equal(t, "Void", resp.Status)

	var updatedIng entity.Ingredient
	db.First(&updatedIng, ing.ID)
	assert.Equal(t, 500.0, updatedIng.CurrentStock) // Restored to original
}

func TestOrderUsecase_VoidAlreadyVoided(t *testing.T) {
	db := setupOrderTestDB()
	defer func() { sqlDB, _ := db.DB(); sqlDB.Close() }()
	uc := createOrderUsecase(db)

	ing := &entity.Ingredient{Name: "Teh", Unit: "gram", CurrentStock: 200, MinStock: 20, CostPerUnit: 10}
	db.Create(ing)
	prodID := seedProductWithRecipe(db, "Teh Botol", "TB-001", 7000, ing.ID, 5)

	created, _ := uc.Create(CreateOrderRequest{
		OrderNumber: "ORD-VOID2-001", PaymentMethod: "Cash", CashierName: "CS",
		Items: []struct {
			ProductID uint `json:"product_id"`
			Quantity  int  `json:"quantity"`
		}{{ProductID: prodID, Quantity: 1}},
	}, 1, "CS")

	uc.Void(created.Order.ID)

	_, err := uc.Void(created.Order.ID)
	assert.Error(t, err)
	assert.ErrorIs(t, err, errors.ErrOrderAlreadyVoided)
}

func TestOrderUsecase_VoidNotFound(t *testing.T) {
	db := setupOrderTestDB()
	defer func() { sqlDB, _ := db.DB(); sqlDB.Close() }()
	uc := createOrderUsecase(db)

	_, err := uc.Void(999)

	assert.Error(t, err)
	assert.ErrorIs(t, err, errors.ErrNotFound)
}

func TestOrderUsecase_CreateInsufficientStock(t *testing.T) {
	db := setupOrderTestDB()
	defer func() { sqlDB, _ := db.DB(); sqlDB.Close() }()
	uc := createOrderUsecase(db)

	ing := &entity.Ingredient{Name: "Limited Stock", Unit: "pcs", CurrentStock: 5, MinStock: 1, CostPerUnit: 100}
	db.Create(ing)

	prodID := seedProductWithRecipe(db, "Limited Item", "LIM-001", 50000, ing.ID, 10)

	req := CreateOrderRequest{
		OrderNumber: "ORD-LIM-001", PaymentMethod: "Cash", CashierName: "CS",
		Items: []struct {
			ProductID uint `json:"product_id"`
			Quantity  int  `json:"quantity"`
		}{
			{ProductID: prodID, Quantity: 1},
		},
	}

	_, err := uc.Create(req, 1, "CS")

	assert.Error(t, err)
	assert.ErrorIs(t, err, errors.ErrInsufficientStock)
}

func TestOrderUsecase_CompletePayment(t *testing.T) {
	db := setupOrderTestDB()
	defer func() { sqlDB, _ := db.DB(); sqlDB.Close() }()
	uc := createOrderUsecase(db)

	ing := &entity.Ingredient{Name: "Kopi", Unit: "gram", CurrentStock: 500, MinStock: 50, CostPerUnit: 20}
	db.Create(ing)

	prodID := seedProductWithRecipe(db, "Kopi Hitam", "KH-001", 12000, ing.ID, 15)

	created, err := uc.Create(CreateOrderRequest{
		OrderNumber:   "ORD-QRIS-TEST-001",
		PaymentMethod: "QRIS",
		CashierName:   "Kasir Ari",
		Items: []struct {
			ProductID uint `json:"product_id"`
			Quantity  int  `json:"quantity"`
		}{
			{ProductID: prodID, Quantity: 1},
		},
	}, 1, "Kasir Ari")

	assert.NoError(t, err)
	assert.Equal(t, "Pending", created.Order.Status)
	assert.Equal(t, "Unpaid", created.Order.PaymentStatus)

	// Complete payment manually
	completed, err := uc.CompletePayment(created.Order.ID)
	assert.NoError(t, err)
	assert.NotNil(t, completed)
	assert.Equal(t, "Completed", completed.Status)
	assert.Equal(t, "Paid", completed.PaymentStatus)
}

