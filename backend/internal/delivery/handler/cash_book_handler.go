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

type CashBookHandler struct {
	cashBookUsecase *usecase.CashBookUsecase
}

func NewCashBookHandler(cashBookUsecase *usecase.CashBookUsecase) *CashBookHandler {
	return &CashBookHandler{cashBookUsecase: cashBookUsecase}
}

// requireOwner only allows true owner role (Buku Kas is owner-only)
func requireOwner(c *gin.Context) bool {
	if getUserRole(c) != "owner" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Akses ditolak: hanya pemilik yang dapat mengelola Buku Kas"})
		return false
	}
	return true
}

func (h *CashBookHandler) GetCashBooks(c *gin.Context) {
	if !requireOwner(c) {
		return
	}
	outletID := getOutletID(c)
	start := c.Query("start")
	end := c.Query("end")
	method := c.Query("method")
	tipe := c.Query("type")

	items, err := h.cashBookUsecase.GetAllFiltered(start, end, method, tipe, outletID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch cash book"})
		return
	}
	c.JSON(http.StatusOK, items)
}

func (h *CashBookHandler) GetCashBook(c *gin.Context) {
	if !requireOwner(c) {
		return
	}
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid cash book ID"})
		return
	}
	item, err := h.cashBookUsecase.GetByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Cash book entry not found"})
		return
	}
	c.JSON(http.StatusOK, item)
}

func (h *CashBookHandler) CreateCashBook(c *gin.Context) {
	if !requireOwner(c) {
		return
	}
	var req request.CreateCashBookRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Invalid input: %v", err)})
		return
	}

	uid, _ := getUserID(c)
	item := &entity.CashBook{
		OutletID:    getOutletID(c),
		Date:        parseDate(req.Date),
		Method:      req.Method,
		Type:        req.Type,
		Amount:      req.Amount,
		Description: req.Description,
		Reference:   req.Reference,
		CreatedBy:   uid,
	}

	result, err := h.cashBookUsecase.Create(item, getOutletID(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create cash book entry"})
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *CashBookHandler) UpdateCashBook(c *gin.Context) {
	if !requireOwner(c) {
		return
	}
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid cash book ID"})
		return
	}
	var req request.UpdateCashBookRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Invalid input: %v", err)})
		return
	}

	item := &entity.CashBook{
		Date:        parseDate(req.Date),
		Method:      req.Method,
		Type:        req.Type,
		Amount:      req.Amount,
		Description: req.Description,
		Reference:   req.Reference,
	}
	result, err := h.cashBookUsecase.Update(uint(id), item)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update cash book entry"})
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *CashBookHandler) DeleteCashBook(c *gin.Context) {
	if !requireOwner(c) {
		return
	}
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid cash book ID"})
		return
	}
	if err := h.cashBookUsecase.Delete(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete cash book entry"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Cash book entry deleted successfully"})
}
