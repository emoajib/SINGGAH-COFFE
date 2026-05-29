package services_test

import (
	"testing"
	"singgah-pos-backend/internal/models"
	"singgah-pos-backend/internal/services"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupTestDB() (*gorm.DB, error) {
	// In-memory SQLite for fast isolation
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		return nil, err
	}
	// Migrate necessary tables
	err = db.AutoMigrate(
		&models.Ingredient{},
		&models.StockMutation{},
		&models.Product{},
		&models.RecipeItem{},
		&models.Expense{},
	)
	return db, err
}

func TestCreateIngredient(t *testing.T) {
	db, err := setupTestDB()
	if err != nil {
		t.Fatalf("Failed to setup DB: %v", err)
	}
	service := services.NewInventoryService(db)

	item := models.Ingredient{Name: "Espresso Beans", Unit: "gram", CurrentStock: 0}
	if err := service.CreateIngredient(&item); err != nil {
		t.Errorf("Failed to create ingredient: %v", err)
	}

	if item.ID == 0 {
		t.Error("ID should be set after creation")
	}
}

func TestStockMutation_Add(t *testing.T) {
	db, err := setupTestDB()
	if err != nil {
		t.Fatalf("Failed to setup DB: %v", err)
	}
	service := services.NewInventoryService(db)

	// 1. Initial State
	sugar := models.Ingredient{Name: "Sugar", Unit: "gram", CurrentStock: 1000}
	service.CreateIngredient(&sugar)

	// 2. Perform Mutation (IN - Purchase)
	mutation := models.StockMutation{
		IngredientID: sugar.ID,
		Type:         "IN",
		Quantity:     500,
		Notes:        "Restock from Supplier",
	}

	if err := service.CreateStockMutation(&mutation, false, false, 0); err != nil {
		t.Fatalf("Mutation failed: %v", err)
	}

	// 3. Verify Stock
	var check models.Ingredient
	db.First(&check, sugar.ID)
	if check.CurrentStock != 1500 {
		t.Errorf("Expected stock 1500, got %f", check.CurrentStock)
	}
}

func TestStockMutation_Deduct(t *testing.T) {
	db, err := setupTestDB()
	if err != nil {
		t.Fatalf("Failed to setup DB: %v", err)
	}
	service := services.NewInventoryService(db)

	// 1. Initial State
	milk := models.Ingredient{Name: "Milk", Unit: "ml", CurrentStock: 1000}
	service.CreateIngredient(&milk)

	// 2. Perform Mutation (OUT - Waste/Usage)
	mutation := models.StockMutation{
		IngredientID: milk.ID,
		Type:         "OUT",
		Quantity:     100,
		Notes:        "Spilled",
	}

	if err := service.CreateStockMutation(&mutation, false, false, 0); err != nil {
		t.Fatalf("Mutation failed: %v", err)
	}

	// 3. Verify Stock
	var check models.Ingredient
	db.First(&check, milk.ID)
	if check.CurrentStock != 900 {
		t.Errorf("Expected stock 900, got %f", check.CurrentStock)
	}
}

func TestStockMutation_IntegratedPurchase(t *testing.T) {
	db, err := setupTestDB()
	if err != nil {
		t.Fatalf("Failed to setup DB: %v", err)
	}
	service := services.NewInventoryService(db)

	// 1. Initial State: Coffee Beans at 100g, cost 15/g
	coffee := models.Ingredient{Name: "Coffee", Unit: "gram", CurrentStock: 100, CostPerUnit: 15}
	service.CreateIngredient(&coffee)

	// Setup a product that uses this coffee
	product := models.Product{Name: "Black Coffee", Price: 15000}
	db.Create(&product)
	recipe := models.RecipeItem{ProductID: product.ID, IngredientID: coffee.ID, Quantity: 10}
	db.Create(&recipe)

	// 2. Perform Mutation (IN - Purchase) with Expense and Price Update
	mutation := models.StockMutation{
		IngredientID: coffee.ID,
		Type:         "IN",
		Quantity:     1000,
		Notes:        "Buy 1kg coffee",
	}

	// New price is 20/g
	if err := service.CreateStockMutation(&mutation, true, true, 20); err != nil {
		t.Fatalf("Integrated mutation failed: %v", err)
	}

	// 3. Verify Stock: 100 + 1000 = 1100
	var checkIng models.Ingredient
	db.First(&checkIng, coffee.ID)
	if checkIng.CurrentStock != 1100 {
		t.Errorf("Expected stock 1100, got %f", checkIng.CurrentStock)
	}
	if checkIng.CostPerUnit != 20 {
		t.Errorf("Expected cost 20, got %f", checkIng.CostPerUnit)
	}

	// 4. Verify Expense: 1000 * 20 = 20000
	var expense models.Expense
	db.Where("title LIKE ?", "%Coffee%").First(&expense)
	if expense.Amount != 20000 {
		t.Errorf("Expected expense 20000, got %f", expense.Amount)
	}

	// 5. Verify Product Cost (HPP) recalculation: 10g * 20 = 200
	var checkProd models.Product
	db.First(&checkProd, product.ID)
	if checkProd.Cost != 200 {
		t.Errorf("Expected product cost 200, got %f", checkProd.Cost)
	}
}

func TestDeductStockForRecipe(t *testing.T) {
	db, err := setupTestDB()
	if err != nil {
		t.Fatalf("Failed to setup DB: %v", err)
	}
	service := services.NewInventoryService(db)

	// Setup: Milk (1000ml) & Coffee (500g)
	milk := models.Ingredient{Name: "Milk", Unit: "ml", CurrentStock: 1000}
	coffee := models.Ingredient{Name: "Coffee", Unit: "gr", CurrentStock: 500}
	service.CreateIngredient(&milk)
	service.CreateIngredient(&coffee)

	// Setup: Recipe for "Latte" uses 200ml Milk + 18g Coffee
	recipeItems := []models.RecipeItem{
		{IngredientID: milk.ID, Quantity: 200},
		{IngredientID: coffee.ID, Quantity: 18},
	}

	// Action: User buys 2 Lattes
	// Logic typically runs inside a transaction in OrderService
	err = db.Transaction(func(tx *gorm.DB) error {
		return service.DeductStockForRecipe(tx, recipeItems, 2, "ORD-X-001")
	})
	if err != nil {
		t.Fatalf("Deduct failed: %v", err)
	}

	// Verify Milk: 1000 - (200*2) = 600
	var checkMilk models.Ingredient
	db.First(&checkMilk, milk.ID)
	if checkMilk.CurrentStock != 600 {
		t.Errorf("Milk: Expected 600, got %f", checkMilk.CurrentStock)
	}

	// Verify Coffee: 500 - (18*2) = 464
	var checkCoffee models.Ingredient
	db.First(&checkCoffee, coffee.ID)
	if checkCoffee.CurrentStock != 464 {
		t.Errorf("Coffee: Expected 464, got %f", checkCoffee.CurrentStock)
	}

	// Verify Mutation Count (2 records: 1 milk, 1 coffee)
	var count int64
	db.Model(&models.StockMutation{}).Where("reference_id = ?", "ORD-X-001").Count(&count)
	if count != 2 {
		t.Errorf("Expected 2 mutation records, got %d", count)
	}
}
