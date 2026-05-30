package handler

import (
	"net/http"
	"strconv"
	"time"

	"singgah-pos-backend/internal/delivery/request"
	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/usecase"

	"github.com/gin-gonic/gin"
)

type InventoryHandler struct {
	inventoryUsecase *usecase.InventoryUsecase
}

func NewInventoryHandler(inventoryUsecase *usecase.InventoryUsecase) *InventoryHandler {
	return &InventoryHandler{inventoryUsecase: inventoryUsecase}
}

func (h *InventoryHandler) GetIngredients(c *gin.Context) {
	ingredients, err := h.inventoryUsecase.GetIngredients()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch ingredients"})
		return
	}

	c.JSON(http.StatusOK, ingredients)
}

func (h *InventoryHandler) CreateIngredient(c *gin.Context) {
	var req request.CreateIngredientRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ingredient := &entity.Ingredient{
		Name:         req.Name,
		Unit:         req.Unit,
		CurrentStock: req.CurrentStock,
		MinStock:     req.MinStock,
		CostPerUnit:  req.CostPerUnit,
	}

	result, err := h.inventoryUsecase.CreateIngredient(ingredient)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create ingredient"})
		return
	}

	c.JSON(http.StatusCreated, result)
}

func (h *InventoryHandler) UpdateIngredient(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ingredient ID"})
		return
	}

	var req request.UpdateIngredientRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	if err := h.inventoryUsecase.UpdateIngredient(uint(id), req.Name, req.Unit, req.CostPerUnit, req.MinStock); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update ingredient"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Ingredient updated successfully"})
}

func (h *InventoryHandler) DeleteIngredient(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ingredient ID"})
		return
	}

	if err := h.inventoryUsecase.DeleteIngredient(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete ingredient"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Ingredient deleted successfully"})
}

func (h *InventoryHandler) GetStockHistory(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ingredient ID"})
		return
	}

	history, err := h.inventoryUsecase.GetStockHistory(uint(id))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch stock history"})
		return
	}

	c.JSON(http.StatusOK, history)
}

func (h *InventoryHandler) UpdateStock(c *gin.Context) {
	var req request.StockMutationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	quantity := req.Quantity
	if req.Type == string(entity.MutationOut) || req.Type == string(entity.MutationSub) {
		if quantity > 0 {
			quantity = -quantity
		}
	}

	if err := h.inventoryUsecase.UpdateStock(
		req.IngredientID,
		req.Type,
		quantity,
		req.Notes,
		req.IsPurchase,
		req.UpdateMasterPrice,
		req.NewCostPerUnit,
	); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update stock: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Stock updated successfully"})
}

func parseDate(dateStr string) time.Time {
	if dateStr == "" {
		return time.Now()
	}
	t, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return time.Now()
	}
	return t
}
