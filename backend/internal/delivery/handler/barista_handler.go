package handler

import (
	"net/http"
	"strconv"

	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/usecase"

	"github.com/gin-gonic/gin"
)

// BaristaHandler handles HTTP requests for barista management
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
type BaristaHandler struct {
	usecase *usecase.BaristaUsecase
}

func NewBaristaHandler(uc *usecase.BaristaUsecase) *BaristaHandler {
	return &BaristaHandler{usecase: uc}
}

type baristaRequest struct {
	Name            string  `json:"name" binding:"required"`
	Phone           string  `json:"phone"`
	DefaultSharePct float64 `json:"default_share_pct"`
	BankAccount     string  `json:"bank_account"`
	Status          string  `json:"status"` // active, inactive
	Notes           string  `json:"notes"`
}

func (h *BaristaHandler) GetAll(c *gin.Context) {
	outletID := getOutletID(c)
	status := c.DefaultQuery("status", "all")
	baristas, err := h.usecase.GetAll(outletID, status)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, baristas)
}

func (h *BaristaHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID barista tidak valid"})
		return
	}
	outletID := getOutletID(c)
	barista, err := h.usecase.GetByID(uint(id), outletID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Data barista tidak ditemukan"})
		return
	}
	c.JSON(http.StatusOK, barista)
}

func (h *BaristaHandler) Create(c *gin.Context) {
	var req baristaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format data tidak valid: " + err.Error()})
		return
	}
	outletID := getOutletID(c)
	if req.Status == "" {
		req.Status = "active"
	}

	barista := &entity.Barista{
		OutletID:        outletID,
		Name:            req.Name,
		Phone:           req.Phone,
		DefaultSharePct: req.DefaultSharePct,
		BankAccount:     req.BankAccount,
		Status:          req.Status,
		Notes:           req.Notes,
	}

	if err := h.usecase.Create(barista); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, barista)
}

func (h *BaristaHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID barista tidak valid"})
		return
	}
	var req baristaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format data tidak valid: " + err.Error()})
		return
	}
	outletID := getOutletID(c)

	barista := &entity.Barista{
		ID:              uint(id),
		OutletID:        outletID,
		Name:            req.Name,
		Phone:           req.Phone,
		DefaultSharePct: req.DefaultSharePct,
		BankAccount:     req.BankAccount,
		Status:          req.Status,
		Notes:           req.Notes,
	}

	if err := h.usecase.Update(barista); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, barista)
}

func (h *BaristaHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID barista tidak valid"})
		return
	}
	outletID := getOutletID(c)
	if err := h.usecase.Delete(uint(id), outletID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Data barista berhasil dihapus"})
}
