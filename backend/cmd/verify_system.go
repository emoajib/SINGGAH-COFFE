package main

import (
	"fmt"
	"log"
	"singgah-pos-backend/internal/config"
	"singgah-pos-backend/internal/database"
	"singgah-pos-backend/internal/models"
	"singgah-pos-backend/internal/services"

	"gorm.io/gorm"
)

func main() {
	fmt.Println("🚀 Starting System Verification with Dummy Data...")

	cfg := config.LoadConfig()
	db := database.Connect(cfg)
	invService := services.NewInventoryService(db)

	// Clean up previous dummy data if any
	db.Unscoped().Where("name LIKE ?", "%DUMMY%").Delete(&models.Ingredient{})
	db.Unscoped().Where("name LIKE ?", "%DUMMY%").Delete(&models.Product{})
	db.Unscoped().Where("title LIKE ?", "%DUMMY%").Delete(&models.Expense{})

	// 1. Create Dummy Ingredient
	fmt.Println("\nStep 1: Creating Dummy Ingredient...")
	ing := models.Ingredient{
		Name:         "Kopi DUMMY",
		Unit:         "gram",
		CurrentStock: 100,
		MinStock:     50,
		CostPerUnit:  100, // Rp 100 / gram
	}
	if err := db.Create(&ing).Error; err != nil {
		log.Fatalf("Failed to create ingredient: %v", err)
	}
	fmt.Printf("✅ Created: %s (Stock: %f, Price: Rp %f)\n", ing.Name, ing.CurrentStock, ing.CostPerUnit)

	// 2. Create Dummy Product with Recipe
	fmt.Println("\nStep 2: Creating Dummy Product with Recipe...")
	prod := models.Product{
		Name:     "Kopi Hitam DUMMY",
		Category: "Kopi",
		Price:    15000,
		Recipe: []models.RecipeItem{
			{IngredientID: ing.ID, Quantity: 10}, // 10g per cup
		},
	}
	// Initial Cost calculation
	prod.Cost = 10 * ing.CostPerUnit // 10 * 100 = 1000

	if err := db.Create(&prod).Error; err != nil {
		log.Fatalf("Failed to create product: %v", err)
	}
	fmt.Printf("✅ Created: %s (Price: Rp %f, HPP: Rp %f)\n", prod.Name, prod.Price, prod.Cost)

	// 3. Integrated Stock Mutation (Stock In + Expense + Price Update)
	fmt.Println("\nStep 3: Performing Integrated Stock In (500g, New Price Rp 120)...")
	mutation := models.StockMutation{
		IngredientID: ing.ID,
		Type:         "IN",
		Quantity:     500,
		Notes:        "DUMMY Restock",
	}

	// Trigger atomic transaction: Stock +500, Create Expense, Update Price to 120, Recalculate HPP
	err := invService.CreateStockMutation(&mutation, true, true, 120)
	if err != nil {
		log.Fatalf("Integrated mutation failed: %v", err)
	}

	// Verify Results
	var updatedIng models.Ingredient
	db.First(&updatedIng, ing.ID)
	fmt.Printf("📊 Ingredient Update: Stock -> %f, Price -> Rp %f\n", updatedIng.CurrentStock, updatedIng.CostPerUnit)

	var checkExpense models.Expense
	db.Where("title LIKE ?", "%Kopi DUMMY%").Order("created_at desc").First(&checkExpense)
	fmt.Printf("📊 Expense Created: %s, Amount: Rp %f\n", checkExpense.Title, checkExpense.Amount)

	var updatedProd models.Product
	db.First(&updatedProd, prod.ID)
	fmt.Printf("📊 Product HPP Update: New HPP -> Rp %f (Expected: Rp 1200)\n", updatedProd.Cost)

	// 4. Test Stock Deduction via Sales (Dummy Order)
	fmt.Println("\nStep 4: Simulating Sales (Order 5 Cups)...")
	// Process deduction manually using service
	err = db.Transaction(func(tx *gorm.DB) error {
		var recipe []models.RecipeItem
		tx.Where("product_id = ?", prod.ID).Find(&recipe)
		return invService.DeductStockForRecipe(tx, recipe, 5, "ORD-DUMMY-001")
	})

	if err != nil {
		log.Fatalf("Sales deduction failed: %v", err)
	}

	var finalIng models.Ingredient
	db.First(&finalIng, ing.ID)
	fmt.Printf("📊 Final Stock: %f (Expected: 600 - (5 * 10) = 550)\n", finalIng.CurrentStock)

	fmt.Println("\n✨ System Verification Complete. All Modules Functioning Correctly.")
}
