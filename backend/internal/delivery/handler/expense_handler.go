package handler

import (
	"fmt"
	"net/http"
	"strconv"

	"singgah-pos-backend/internal/delivery/request"
	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/usecase"

	"github.com/gin-gonic/gin"
)

type ExpenseHandler struct {
	expenseUsecase *usecase.ExpenseUsecase
}

func NewExpenseHandler(expenseUsecase *usecase.ExpenseUsecase) *ExpenseHandler {
	return &ExpenseHandler{expenseUsecase: expenseUsecase}
}

func (h *ExpenseHandler) GetExpenses(c *gin.Context) {
	expenses, err := h.expenseUsecase.GetAll(getOutletID(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch expenses"})
		return
	}

	c.JSON(http.StatusOK, expenses)
}

// ⚠️ Vetted by SOSIOMEN - Manual Review Required by Senior Engineer/Manager
func (h *ExpenseHandler) CreateExpense(c *gin.Context) {
	var req request.CreateExpenseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Invalid input: %v", err)})
		return
	}

	costType := req.CostType
	if costType == "" {
		if req.Category == "Salary" || req.Category == "Maintenance" {
			costType = "fixed"
		} else {
			costType = "variable"
		}
	}

	expense := &entity.Expense{
		Title:       req.Title,
		Amount:      req.Amount,
		Category:    req.Category,
		CostType:    costType,
		Date:        parseDate(req.Date),
		Description: req.Description,
		Notes:       req.Notes,
	}

	result, err := h.expenseUsecase.Create(expense, getOutletID(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create expense"})
		return
	}

	c.JSON(http.StatusCreated, result)
}

// ⚠️ Vetted by SOSIOMEN - Manual Review Required by Senior Engineer/Manager
func (h *ExpenseHandler) UpdateExpense(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid expense ID"})
		return
	}

	var req request.CreateExpenseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Invalid input: %v", err)})
		return
	}

	costType := req.CostType
	if costType == "" {
		if req.Category == "Salary" || req.Category == "Maintenance" {
			costType = "fixed"
		} else {
			costType = "variable"
		}
	}

	expense := &entity.Expense{
		Title:       req.Title,
		Amount:      req.Amount,
		Category:    req.Category,
		CostType:    costType,
		Date:        parseDate(req.Date),
		Description: req.Description,
		Notes:       req.Notes,
	}

	result, err := h.expenseUsecase.Update(uint(id), expense)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update expense"})
		return
	}

	c.JSON(http.StatusOK, result)
}

// ⚠️ Vetted by SOSIOMEN - Manual Review Required by Senior Engineer/Manager
func (h *ExpenseHandler) UpdateCostType(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid expense ID"})
		return
	}

	var req request.UpdateCostTypeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Invalid input: %v", err)})
		return
	}

	if err := h.expenseUsecase.UpdateCostType(uint(id), req.CostType); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update cost type"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Cost type updated successfully"})
}

func (h *ExpenseHandler) DeleteExpense(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid expense ID"})
		return
	}

	if err := h.expenseUsecase.Delete(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete expense"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Expense deleted successfully"})
}
