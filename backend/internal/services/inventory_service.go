package services

import (
	"singgah-pos-backend/internal/models"

	"gorm.io/gorm"
)

type InventoryService struct {
	DB *gorm.DB
}

func NewInventoryService(db *gorm.DB) *InventoryService {
	return &InventoryService{DB: db}
}

// CreateIngredient adds a new raw material
func (s *InventoryService) CreateIngredient(item *models.Ingredient) error {
	return s.DB.Create(item).Error
}

// GetIngredients returns all raw ingredients
func (s *InventoryService) GetIngredients() ([]models.Ingredient, error) {
	var ingredients []models.Ingredient
	result := s.DB.Find(&ingredients)
	return ingredients, result.Error
}

// GetStockHistory returns mutation history for a specific ingredient
func (s *InventoryService) GetStockHistory(ingredientID string) ([]models.StockMutation, error) {
	var mutations []models.StockMutation
	// Preload nothing for now as StockMutation just has IDs and strings.
	// Order by most recent first
	result := s.DB.Where("ingredient_id = ?", ingredientID).Order("created_at desc").Find(&mutations)
	return mutations, result.Error
}

// CreateStockMutation handles stock adjustments (manual mutations)
func (s *InventoryService) CreateStockMutation(mutation *models.StockMutation) error {
	return s.DB.Transaction(func(tx *gorm.DB) error {
		// 1. Create Mutation Record
		if err := tx.Create(mutation).Error; err != nil {
			return err
		}

		// 2. Update Ingredient Stock
		return s.updateIngredientStock(tx, mutation.IngredientID, mutation.Type, mutation.Quantity)
	})
}

// updateIngredientStock is a helper to update stock based on mutation type
func (s *InventoryService) updateIngredientStock(tx *gorm.DB, ingredientID uint, mutationType string, quantity float64) error {
	var ingredient models.Ingredient
	if err := tx.First(&ingredient, ingredientID).Error; err != nil {
		return err
	}

	if mutationType == "IN" || mutationType == "ADJ_ADD" {
		ingredient.CurrentStock += quantity
	} else if mutationType == "OUT" || mutationType == "ADJ_SUB" {
		ingredient.CurrentStock -= quantity
	}

	return tx.Save(&ingredient).Error
}

// DeductStockForRecipe is used by OrderService/Handler inside a transaction to deduct ingredients
func (s *InventoryService) DeductStockForRecipe(tx *gorm.DB, recipe []models.RecipeItem, orderQuantity int, refID string) error {
	for _, recipeItem := range recipe {
		deductionAmount := recipeItem.Quantity * float64(orderQuantity)

		// Update Ingredient Stock (using SQL expression for atomicity/concurrency safety inside tx)
		if err := tx.Model(&models.Ingredient{}).
			Where("id = ?", recipeItem.IngredientID).
			UpdateColumn("current_stock", gorm.Expr("current_stock - ?", deductionAmount)).
			Error; err != nil {
			return err
		}

		// Log Mutation (OUT - Sales)
		mutation := models.StockMutation{
			IngredientID: recipeItem.IngredientID,
			Type:         "OUT",
			Quantity:     deductionAmount,
			ReferenceID:  refID,
			Notes:        "Sales Deduction",
		}
		if err := tx.Create(&mutation).Error; err != nil {
			return err
		}
	}
	return nil
}

// DeductDirectStock handles direct product stock deduction (not ingredients)
func (s *InventoryService) DeductDirectStock(tx *gorm.DB, productID uint, quantity int) error {
	return tx.Model(&models.Product{}).
		Where("id = ?", productID).
		UpdateColumn("stock", gorm.Expr("stock - ?", quantity)).
		Error
}

// UpdateIngredient updates ingredient details and recalculates product costs
func (s *InventoryService) UpdateIngredient(id string, name string, unit string, costPerUnit float64, minStock float64) error {
	return s.DB.Transaction(func(tx *gorm.DB) error {
		// 1. Update Ingredient
		if err := tx.Model(&models.Ingredient{}).
			Where("id = ?", id).
			Updates(map[string]interface{}{
				"name":          name,
				"unit":          unit,
				"cost_per_unit": costPerUnit,
				"min_stock":     minStock,
			}).Error; err != nil {
			return err
		}

		// 2. Recalculate costs for all products using this ingredient
		var recipeItems []models.RecipeItem
		if err := tx.Where("ingredient_id = ?", id).Find(&recipeItems).Error; err != nil {
			return err
		}

		// Get unique product IDs
		productIDs := make(map[uint]bool)
		for _, item := range recipeItems {
			productIDs[item.ProductID] = true
		}

		// Recalculate cost for each affected product
		for productID := range productIDs {
			var totalCost float64

			// Sum up all ingredient costs for this product
			if err := tx.Table("recipe_items").
				Select("SUM(recipe_items.quantity * ingredients.cost_per_unit) as total_cost").
				Joins("JOIN ingredients ON ingredients.id = recipe_items.ingredient_id").
				Where("recipe_items.product_id = ?", productID).
				Scan(&totalCost).Error; err != nil {
				return err
			}

			// Update product cost
			if err := tx.Model(&models.Product{}).
				Where("id = ?", productID).
				Update("cost", totalCost).Error; err != nil {
				return err
			}
		}

		return nil
	})
}

// DeleteIngredient removes an ingredient and its recipe associations
func (s *InventoryService) DeleteIngredient(id string) error {
	return s.DB.Transaction(func(tx *gorm.DB) error {
		// 1. Delete Recipe Items using this ingredient
		if err := tx.Where("ingredient_id = ?", id).Delete(&models.RecipeItem{}).Error; err != nil {
			return err
		}

		// 2. Delete Stock Mutations for this ingredient (optional, but good for cleanup)
		if err := tx.Where("ingredient_id = ?", id).Delete(&models.StockMutation{}).Error; err != nil {
			return err
		}

		// 3. Delete Ingredient
		if err := tx.Delete(&models.Ingredient{}, id).Error; err != nil {
			return err
		}

		return nil
	})
}

// RestoreStockForOrder returns ingredients to inventory when an order is voided
func (s *InventoryService) RestoreStockForOrder(tx *gorm.DB, order models.Order) error {
	for _, item := range order.OrderItems {
		// Load product with recipe
		var product models.Product
		if err := tx.Preload("Recipe").First(&product, item.ProductID).Error; err != nil {
			return err
		}

		if len(product.Recipe) > 0 {
			for _, recipeItem := range product.Recipe {
				restoreAmount := recipeItem.Quantity * float64(item.Quantity)

				// Increment Ingredient Stock
				if err := tx.Model(&models.Ingredient{}).
					Where("id = ?", recipeItem.IngredientID).
					UpdateColumn("current_stock", gorm.Expr("current_stock + ?", restoreAmount)).
					Error; err != nil {
					return err
				}

				// Log Mutation (IN - Void Return)
				mutation := models.StockMutation{
					IngredientID: recipeItem.IngredientID,
					Type:         "IN",
					Quantity:     restoreAmount,
					ReferenceID:  order.OrderNumber,
					Notes:        "Void Return",
				}
				if err := tx.Create(&mutation).Error; err != nil {
					return err
				}
			}
		} else {
			// Restore direct product stock
			if err := tx.Model(&models.Product{}).
				Where("id = ?", item.ProductID).
				UpdateColumn("stock", gorm.Expr("stock + ?", item.Quantity)).
				Error; err != nil {
				return err
			}
		}
	}
	return nil
}

// ValidateStockAvailability checks if there's enough stock for all items in the order
func (s *InventoryService) ValidateStockAvailability(tx *gorm.DB, items []struct {
	ProductID uint `json:"product_id"`
	Quantity  int  `json:"quantity"`
}) error {
	for _, itemInput := range items {
		var product models.Product
		if err := tx.Preload("Recipe").Preload("Recipe.Ingredient").First(&product, itemInput.ProductID).Error; err != nil {
			return err
		}

		if len(product.Recipe) > 0 {
			for _, recipeItem := range product.Recipe {
				needed := recipeItem.Quantity * float64(itemInput.Quantity)
				if recipeItem.Ingredient.CurrentStock < needed {
					return gorm.ErrRecordNotFound // Or a custom error like "Insufficient stock for " + recipeItem.Ingredient.Name
				}
			}
		} else {
			if float64(product.Stock) < float64(itemInput.Quantity) {
				return gorm.ErrRecordNotFound // Insufficient direct stock
			}
		}
	}
	return nil
}
