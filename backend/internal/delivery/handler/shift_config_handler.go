package handler

import (
	"errors"
	"net/http"
	"strconv"

	"singgah-pos-backend/internal/domain/entity"
	domainErrors "singgah-pos-backend/internal/domain/errors"
	"singgah-pos-backend/internal/usecase"

	"github.com/gin-gonic/gin"
)

// ShiftConfigHandler handles HTTP requests for shift configuration CRUD.
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
type ShiftConfigHandler struct {
	uc usecase.ShiftConfigUsecase
}

// NewShiftConfigHandler creates a new ShiftConfigHandler.
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func NewShiftConfigHandler(uc usecase.ShiftConfigUsecase) *ShiftConfigHandler {
	return &ShiftConfigHandler{uc: uc}
}

// CreateShift handles POST /profit-sharing/shift-configs
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (h *ShiftConfigHandler) CreateShift(c *gin.Context) {
	var req CreateShiftConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "request body tidak valid: " + err.Error()})
		return
	}
	outletID := getOutletID(c)
	shift := &entity.ShiftConfig{
		OutletID:       outletID,
		Name:           req.Name,
		StartTime:      req.StartTime,
		EndTime:        req.EndTime,
		OwnerPct:       req.OwnerPct,
		BaristaPoolPct: req.BaristaPoolPct,
		IsActive:       req.IsActive,
		SortOrder:      req.SortOrder,
	}
	if err := h.uc.Create(shift); err != nil {
		writeDomainError(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{
		"id":             shift.ID,
		"message":        "shift config created successfully",
		"shift_config":   shift,
	})
}

// UpdateShift handles PUT /profit-sharing/shift-configs/:id
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (h *ShiftConfigHandler) UpdateShift(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id tidak valid"})
		return
	}
	var req UpdateShiftConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "request body tidak valid: " + err.Error()})
		return
	}
	outletID := getOutletID(c)
	shift := &entity.ShiftConfig{
		ID:             uint(id),
		OutletID:       outletID,
		Name:           req.Name,
		StartTime:      req.StartTime,
		EndTime:        req.EndTime,
		OwnerPct:       req.OwnerPct,
		BaristaPoolPct: req.BaristaPoolPct,
		IsActive:       req.IsActive,
		SortOrder:      req.SortOrder,
	}
	if err := h.uc.Update(shift); err != nil {
		writeDomainError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"message":      "shift config updated successfully",
		"shift_config": shift,
	})
}

// GetShifts handles GET /profit-sharing/shift-configs
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (h *ShiftConfigHandler) GetShifts(c *gin.Context) {
	outletID := getOutletID(c)
	shifts, err := h.uc.GetAll(outletID)
	if err != nil {
		writeDomainError(c, err)
		return
	}
	if shifts == nil {
		shifts = []entity.ShiftConfig{}
	}
	c.JSON(http.StatusOK, shifts)
}

// GetShiftByID handles GET /profit-sharing/shift-configs/:id
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (h *ShiftConfigHandler) GetShiftByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id tidak valid"})
		return
	}
	shift, err := h.uc.GetByID(uint(id))
	if err != nil {
		writeDomainError(c, err)
		return
	}
	c.JSON(http.StatusOK, shift)
}

// DeleteShift handles DELETE /profit-sharing/shift-configs/:id
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (h *ShiftConfigHandler) DeleteShift(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id tidak valid"})
		return
	}
	outletID := getOutletID(c)
	if err := h.uc.Delete(uint(id), outletID); err != nil {
		writeDomainError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "shift config deleted successfully"})
}

// CreateShiftConfigRequest is the request body for creating a shift config.
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
type CreateShiftConfigRequest struct {
	Name           string  `json:"name" binding:"required"`
	StartTime      string  `json:"start_time" binding:"required"`
	EndTime        string  `json:"end_time" binding:"required"`
	OwnerPct       float64 `json:"owner_pct" binding:"required"`
	BaristaPoolPct float64 `json:"barista_pool_pct" binding:"required"`
	IsActive       bool    `json:"is_active"`
	SortOrder      int     `json:"sort_order"`
}

// UpdateShiftConfigRequest is the request body for updating a shift config.
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
type UpdateShiftConfigRequest struct {
	Name           string  `json:"name" binding:"required"`
	StartTime      string  `json:"start_time" binding:"required"`
	EndTime        string  `json:"end_time" binding:"required"`
	OwnerPct       float64 `json:"owner_pct" binding:"required"`
	BaristaPoolPct float64 `json:"barista_pool_pct" binding:"required"`
	IsActive       bool    `json:"is_active"`
	SortOrder      int     `json:"sort_order"`
}

// writeDomainError maps domain errors to appropriate HTTP status codes.
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func writeDomainError(c *gin.Context, err error) {
	var de *domainErrors.DomainError
	if errors.As(err, &de) {
		switch de.Err {
		case domainErrors.ErrNotFound:
			c.JSON(http.StatusNotFound, gin.H{"error": de.Message})
			return
		case domainErrors.ErrUnauthorized:
			c.JSON(http.StatusUnauthorized, gin.H{"error": de.Message})
			return
		default:
			c.JSON(http.StatusBadRequest, gin.H{"error": de.Message})
			return
		}
	}
	c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
}