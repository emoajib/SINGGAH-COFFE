package handler

import (
	"net/http"
	"strconv"
	"time"

	"singgah-pos-backend/internal/usecase"

	"github.com/gin-gonic/gin"
)

// ⚠️ Vetted by SOSIOMEN - Manual Review Required by Senior Engineer/Manager
// Risk Assessment:
// - This endpoint is owner-only (protected by RoleMiddleware)
// - BEP data is calculated from order and expense data, no PII exposed
// - Cache invalidation: results are fresh for each request (no persistent cache)
// - If no data exists for the period, returns empty report (safe default)

// BEPHandler handles BEP analysis requests
type BEPHandler struct {
	bepUsecase *usecase.BEPUsecase
}

// NewBEPHandler creates a new BEPHandler
func NewBEPHandler(bepUsecase *usecase.BEPUsecase) *BEPHandler {
	return &BEPHandler{bepUsecase: bepUsecase}
}

// GetBEP returns the complete BEP analysis report
// Only accessible by owner role
func (h *BEPHandler) GetBEP(c *gin.Context) {
	monthStr := c.DefaultQuery("month", "")
	yearStr := c.DefaultQuery("year", "")

	month := int(time.Now().Month())
	year := time.Now().Year()

	if monthStr != "" {
		if m, err := strconv.Atoi(monthStr); err == nil && m >= 1 && m <= 12 {
			month = m
		}
	}
	if yearStr != "" {
		if y, err := strconv.Atoi(yearStr); err == nil && y > 0 {
			year = y
		}
	}

	report, err := h.bepUsecase.GetBEPReport(month, year, getOutletID(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate BEP report"})
		return
	}

	c.JSON(http.StatusOK, report)
}
