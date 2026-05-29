package handlers

import (
	"net/http"
	"singgah-pos-backend/internal/models"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type ExpenseHandler struct {
	DB *gorm.DB
}

func NewExpenseHandler(db *gorm.DB) *ExpenseHandler {
	return &ExpenseHandler{DB: db}
}

func (h *ExpenseHandler) GetExpenses(c *gin.Context) {
	var expenses []models.Expense
	h.DB.Order("date desc").Find(&expenses)
	c.JSON(http.StatusOK, expenses)
}

func (h *ExpenseHandler) CreateExpense(c *gin.Context) {
	var expense models.Expense
	if err := c.ShouldBindJSON(&expense); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if expense.Date.IsZero() {
		expense.Date = time.Now()
	}

	if err := h.DB.Create(&expense).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create expense"})
		return
	}

	c.JSON(http.StatusCreated, expense)
}

func (h *ExpenseHandler) DeleteExpense(c *gin.Context) {
	id := c.Param("id")
	if err := h.DB.Delete(&models.Expense{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete expense"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Expense deleted"})
}
