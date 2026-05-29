package handlers

import (
	"fmt"
	"net/http"
	"path/filepath"
	"singgah-pos-backend/internal/models"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type ProductHandler struct {
	DB *gorm.DB
}

func NewProductHandler(db *gorm.DB) *ProductHandler {
	return &ProductHandler{DB: db}
}

func (h *ProductHandler) GetProducts(c *gin.Context) {
	var products []models.Product
	// Preload Recipe so we can see ingredients
	h.DB.Preload("Recipe").Preload("Recipe.Ingredient").Find(&products)

	// Data Privacy: Only Owner and Manager can see COGS/Cost
	role, _ := c.Get("role")
	if role != "owner" && role != "manager" {
		for i := range products {
			products[i].Cost = 0
			// Hide ingredient costs in recipe too
			for j := range products[i].Recipe {
				products[i].Recipe[j].Ingredient.CostPerUnit = 0
			}
		}
	}

	c.JSON(http.StatusOK, products)
}

type CreateProductInput struct {
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

func (h *ProductHandler) CreateProduct(c *gin.Context) {
	var input CreateProductInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Calculate Cost based on Recipe
	var totalCost float64 = 0
	var recipeItems []models.RecipeItem

	for _, item := range input.Recipe {
		var ingredient models.Ingredient
		if result := h.DB.First(&ingredient, item.IngredientID); result.Error == nil {
			cost := item.Quantity * ingredient.CostPerUnit
			totalCost += cost

			recipeItems = append(recipeItems, models.RecipeItem{
				IngredientID: item.IngredientID,
				Quantity:     item.Quantity,
			})
		}
	}

	product := models.Product{
		Name:        input.Name,
		Category:    input.Category,
		Price:       input.Price,
		Cost:        totalCost, // Auto-calculated Cost
		Stock:       input.Stock,
		Sku:         input.Sku,
		Description: input.Description,
		ImageURL:    input.ImageURL,
		Recipe:      recipeItems,
	}

	if err := h.DB.Create(&product).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create product"})
		return
	}

	c.JSON(http.StatusCreated, product)
}

func (h *ProductHandler) UpdateProduct(c *gin.Context) {
	id := c.Param("id")
	var product models.Product
	if err := h.DB.First(&product, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		return
	}

	var input CreateProductInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Transaction to update product and recipe
	err := h.DB.Transaction(func(tx *gorm.DB) error {
		// Delete old recipe items
		if err := tx.Where("product_id = ?", id).Delete(&models.RecipeItem{}).Error; err != nil {
			return err
		}

		// Calculate new cost based on new recipe
		var totalCost float64 = 0
		var recipeItems []models.RecipeItem

		for _, item := range input.Recipe {
			var ingredient models.Ingredient
			if result := tx.First(&ingredient, item.IngredientID); result.Error == nil {
				cost := item.Quantity * ingredient.CostPerUnit
				totalCost += cost

				recipeItems = append(recipeItems, models.RecipeItem{
					ProductID:    product.ID,
					IngredientID: item.IngredientID,
					Quantity:     item.Quantity,
				})
			}
		}

		// Update product fields
		product.Name = input.Name
		product.Category = input.Category
		product.Price = input.Price
		product.Cost = totalCost
		product.Stock = input.Stock
		product.Sku = input.Sku
		product.Description = input.Description
		product.ImageURL = input.ImageURL

		if err := tx.Save(&product).Error; err != nil {
			return err
		}

		// Create new recipe items
		if len(recipeItems) > 0 {
			if err := tx.Create(&recipeItems).Error; err != nil {
				return err
			}
		}

		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update product"})
		return
	}

	c.JSON(http.StatusOK, product)
}

func (h *ProductHandler) DeleteProduct(c *gin.Context) {
	id := c.Param("id")

	err := h.DB.Transaction(func(tx *gorm.DB) error {
		// Delete Recipe Items first
		if err := tx.Where("product_id = ?", id).Delete(&models.RecipeItem{}).Error; err != nil {
			return err
		}
		// Delete Product
		if err := tx.Delete(&models.Product{}, id).Error; err != nil {
			return err
		}
		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete product"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Product deleted successfully"})
}

func (h *ProductHandler) UploadProductImage(c *gin.Context) {
	file, err := c.FormFile("image")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}

	// Create a unique filename
	extension := filepath.Ext(file.Filename)
	newFilename := fmt.Sprintf("product_%d%s", time.Now().Unix(), extension)
	savePath := filepath.Join("uploads/products", newFilename)

	if err := c.SaveUploadedFile(file, savePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}

	// Return the accessible URL
	url := fmt.Sprintf("/uploads/products/%s", newFilename)
	c.JSON(http.StatusOK, gin.H{
		"message": "Image uploaded successfully",
		"url":     url,
	})
}
