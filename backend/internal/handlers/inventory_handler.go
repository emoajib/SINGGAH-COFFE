package handlers

import (
	"net/http"
	"singgah-pos-backend/internal/models"
	"singgah-pos-backend/internal/services"

	"github.com/gin-gonic/gin"
)

type InventoryHandler struct {
	Service *services.InventoryService
}

func NewInventoryHandler(service *services.InventoryService) *InventoryHandler {
	return &InventoryHandler{Service: service}
}

// GetIngredients returns all raw ingredients
func (h *InventoryHandler) GetIngredients(c *gin.Context) {
	ingredients, err := h.Service.GetIngredients()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Data Privacy: Only Owner and Manager can see Purchase Cost
	role, _ := c.Get("role")
	if role != "owner" && role != "manager" {
		for i := range ingredients {
			ingredients[i].CostPerUnit = 0
		}
	}

	c.JSON(http.StatusOK, ingredients)
}

// GetStockHistory returns history for an ingredient
func (h *InventoryHandler) GetStockHistory(c *gin.Context) {
	id := c.Param("id")
	history, err := h.Service.GetStockHistory(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch stock history"})
		return
	}
	c.JSON(http.StatusOK, history)
}

// CreateIngredient adds a new raw material
func (h *InventoryHandler) CreateIngredient(c *gin.Context) {
	var item models.Ingredient
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.Service.CreateIngredient(&item); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, item)
}

// UpdateStock handles stock adjustments (mutations) with optional integrated expense/price update
func (h *InventoryHandler) UpdateStock(c *gin.Context) {
	var input struct {
		models.StockMutation
		IsPurchase        bool    `json:"is_purchase"`
		UpdateMasterPrice bool    `json:"update_master_price"`
		NewCostPerUnit    float64 `json:"new_cost_per_unit"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.Service.CreateStockMutation(&input.StockMutation, input.IsPurchase, input.UpdateMasterPrice, input.NewCostPerUnit); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update stock and related records"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Stock updated successfully"})
}

// UpdateIngredient updates ingredient details (name, unit, cost, min_stock)
func (h *InventoryHandler) UpdateIngredient(c *gin.Context) {
	id := c.Param("id")

	var input struct {
		Name        string  `json:"name"`
		Unit        string  `json:"unit"`
		CostPerUnit float64 `json:"cost_per_unit"`
		MinStock    float64 `json:"min_stock"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.Service.UpdateIngredient(id, input.Name, input.Unit, input.CostPerUnit, input.MinStock); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update ingredient"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Ingredient updated successfully"})
}

// DeleteIngredient handles DELETE /ingredients/:id
func (h *InventoryHandler) DeleteIngredient(c *gin.Context) {
	id := c.Param("id")

	if err := h.Service.DeleteIngredient(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete ingredient"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Ingredient deleted successfully"})
}
