package handler

import (
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"

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
		Kode:           req.Kode,
		StartTime:      req.StartTime,
		EndTime:        req.EndTime,
		OwnerPct:       req.OwnerPct,
		BaristaPoolPct: req.BaristaPoolPct,
		IsActive:       req.IsActive,
		SortOrder:      req.SortOrder,
	}
	warnings, err := h.uc.Create(shift)
	if err != nil {
		writeDomainError(c, err)
		return
	}
	resp := gin.H{
		"id":           shift.ID,
		"message":      "shift config created successfully",
		"shift_config": shift,
	}
	if len(warnings) > 0 {
		resp["warnings"] = warnings
	}
	c.JSON(http.StatusCreated, resp)
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
		Kode:           req.Kode,
		StartTime:      req.StartTime,
		EndTime:        req.EndTime,
		OwnerPct:       req.OwnerPct,
		BaristaPoolPct: req.BaristaPoolPct,
		IsActive:       req.IsActive,
		SortOrder:      req.SortOrder,
	}
	warnings, err := h.uc.Update(shift)
	if err != nil {
		writeDomainError(c, err)
		return
	}
	resp := gin.H{
		"message":      "shift config updated successfully",
		"shift_config": shift,
	}
	if len(warnings) > 0 {
		resp["warnings"] = warnings
	}
	c.JSON(http.StatusOK, resp)
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
	shift, err := h.uc.GetByID(uint(id), getOutletID(c))
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
	Kode           string  `json:"kode"`
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
	Kode           string  `json:"kode"`
	StartTime      string  `json:"start_time" binding:"required"`
	EndTime        string  `json:"end_time" binding:"required"`
	OwnerPct       float64 `json:"owner_pct" binding:"required"`
	BaristaPoolPct float64 `json:"barista_pool_pct" binding:"required"`
	IsActive       bool    `json:"is_active"`
	SortOrder      int     `json:"sort_order"`
}

// writeDomainError maps domain errors to appropriate HTTP status codes.
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func writeDomainError(c *gin.Context, err error, fallback ...string) {
	fb := "Operation failed"
	if len(fallback) > 0 && fallback[0] != "" {
		fb = fallback[0]
	}
	var de *domainErrors.DomainError
	if errors.As(err, &de) {
		switch {
		case errors.Is(err, domainErrors.ErrNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": de.Message})
			return
		case errors.Is(err, domainErrors.ErrUnauthorized):
			c.JSON(http.StatusUnauthorized, gin.H{"error": de.Message})
			return
		case errors.Is(err, domainErrors.ErrInsufficientStock),
			errors.Is(err, domainErrors.ErrOrderAlreadyVoided):
			c.JSON(http.StatusConflict, gin.H{"error": de.Message})
			return
		default:
			c.JSON(http.StatusBadRequest, gin.H{"error": de.Message})
			return
		}
	}

	// Error tak dikenal (DB/driver/infra): catat detailnya ke
	// ~/singgah-pos/logs/backend.log lalu kirim pesan yang bisa ditindaklanjuti
	// untuk masalah skema/koneksi yang umum di shared hosting.
	log.Printf("[ERROR] %s %s: %v", c.Request.Method, c.Request.URL.Path, err)
	msg, status := describeInfraError(err, fb)
	c.JSON(status, gin.H{"error": msg})
}

// describeInfraError menerjemahkan error infrastruktur yang sering muncul
// menjadi pesan yang bisa langsung ditindaklanjuti kasir/operator.
func describeInfraError(err error, fallback string) (string, int) {
	msg := strings.ToLower(err.Error())
	switch {
	case strings.Contains(msg, "unknown column"), strings.Contains(msg, "no such column"):
		return "Skema database belum diperbarui (kolom tidak ditemukan). Jalankan migrasi lalu coba lagi. Detail ada di log server.", http.StatusInternalServerError
	case strings.Contains(msg, "doesn't exist"), strings.Contains(msg, "table") && strings.Contains(msg, "not found"):
		return "Tabel database belum tersedia. Jalankan migrasi/setup database. Detail ada di log server.", http.StatusInternalServerError
	case strings.Contains(msg, "access denied"):
		return "Server tidak punya akses ke database. Periksa kredensial DB.", http.StatusInternalServerError
	case strings.Contains(msg, "connection refused"),
		strings.Contains(msg, "connection reset"),
		strings.Contains(msg, "invalid connection"),
		strings.Contains(msg, "bad connection"),
		strings.Contains(msg, "can't connect"),
		strings.Contains(msg, "broken pipe"):
		return "Koneksi database terputus. Coba lagi sebentar.", http.StatusServiceUnavailable
	case strings.Contains(msg, "deadlock"), strings.Contains(msg, "lock wait timeout"):
		return "Data sedang diproses transaksi lain. Coba lagi.", http.StatusConflict
	}
	return fallback, http.StatusInternalServerError
}