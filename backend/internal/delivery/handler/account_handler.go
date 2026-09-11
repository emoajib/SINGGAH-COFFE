package handler

import (
	"fmt"
	"log"
	"net/http"
	"strconv"

	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/usecase"

	"github.com/gin-gonic/gin"
)

// AccountHandler handles Chart of Accounts HTTP endpoints
type AccountHandler struct {
	accountUsecase *usecase.AccountUsecase
}

func NewAccountHandler(accountUsecase *usecase.AccountUsecase) *AccountHandler {
	return &AccountHandler{accountUsecase: accountUsecase}
}

// GetAccounts returns all accounts for the current outlet
func (h *AccountHandler) GetAccounts(c *gin.Context) {
	outletID := getOutletID(c)
	accounts, err := h.accountUsecase.GetAll(outletID)
	if err != nil {
		log.Printf("[ERROR] GetAccounts failed: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch accounts"})
		return
	}
	c.JSON(http.StatusOK, accounts)
}

// GetAccount returns a single account by ID
func (h *AccountHandler) GetAccount(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid account ID"})
		return
	}

	account, err := h.accountUsecase.GetByID(uint(id))
	if err != nil {
		log.Printf("[ERROR] GetAccount failed: %v", err)
		c.JSON(http.StatusNotFound, gin.H{"error": "Account not found"})
		return
	}
	c.JSON(http.StatusOK, account)
}

// CreateAccount creates a new account (owner only)
func (h *AccountHandler) CreateAccount(c *gin.Context) {
	if getUserRole(c) != "owner" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only owner can manage accounts"})
		return
	}

	var account entity.Account
	if err := c.ShouldBindJSON(&account); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Invalid input: %v", err)})
		return
	}

	result, err := h.accountUsecase.Create(&account, getOutletID(c))
	if err != nil {
		log.Printf("[ERROR] CreateAccount failed: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, result)
}

// UpdateAccount updates an existing account (owner only)
func (h *AccountHandler) UpdateAccount(c *gin.Context) {
	if getUserRole(c) != "owner" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only owner can manage accounts"})
		return
	}

	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid account ID"})
		return
	}

	var account entity.Account
	if err := c.ShouldBindJSON(&account); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Invalid input: %v", err)})
		return
	}

	result, err := h.accountUsecase.Update(uint(id), &account)
	if err != nil {
		log.Printf("[ERROR] UpdateAccount failed: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// DeleteAccount deletes an account (owner only)
func (h *AccountHandler) DeleteAccount(c *gin.Context) {
	if getUserRole(c) != "owner" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only owner can manage accounts"})
		return
	}

	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid account ID"})
		return
	}

	if err := h.accountUsecase.Delete(uint(id)); err != nil {
		log.Printf("[ERROR] DeleteAccount failed: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Account deleted successfully"})
}

// SeedAccounts seeds default PSAK accounts for the outlet (owner only)
func (h *AccountHandler) SeedAccounts(c *gin.Context) {
	if getUserRole(c) != "owner" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only owner can manage accounts"})
		return
	}

	outletID := getOutletID(c)
	if outletID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Outlet ID is required"})
		return
	}

	if err := h.accountUsecase.SeedDefaultAccounts(outletID); err != nil {
		log.Printf("[ERROR] SeedAccounts failed: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Default PSAK accounts seeded successfully"})
}
