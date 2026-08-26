package handler

import (
	"net/http"

	"singgah-pos-backend/internal/delivery/request"
	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/usecase"

	"github.com/gin-gonic/gin"
)

type ProductionTargetHandler struct {
	uc *usecase.ProductionTargetUsecase
}

func NewProductionTargetHandler(uc *usecase.ProductionTargetUsecase) *ProductionTargetHandler {
	return &ProductionTargetHandler{uc: uc}
}

// GetTargets returns all production targets with product names.
func (h *ProductionTargetHandler) GetTargets(c *gin.Context) {
	targets, err := h.uc.GetTargets(getOutletID(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch production targets"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"targets": targets})
}

// SaveTargets saves production targets and planning period.
func (h *ProductionTargetHandler) SaveTargets(c *gin.Context) {
	var req request.SaveProductionTargetsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}
	targets := make([]entity.ProductionTarget, len(req.Targets))
	for i, t := range req.Targets {
		targets[i] = entity.ProductionTarget{
			ProductID: t.ProductID,
			TargetCup: t.TargetCup,
		}
	}
	if err := h.uc.SaveTargets(req.PeriodDays, targets, getOutletID(c)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save production targets"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Production targets saved"})
}

// GetRequirements returns the full ingredient requirement breakdown.
func (h *ProductionTargetHandler) GetRequirements(c *gin.Context) {
	req, err := h.uc.GetRequirements(getOutletID(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to calculate requirements"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"requirements": req})
}

// GetDailyTarget returns the per-product daily target vs the realized sales for a date.
func (h *ProductionTargetHandler) GetDailyTarget(c *gin.Context) {
	date := c.Query("date")
	resp, err := h.uc.GetDailyTargetRealization(getOutletID(c), date)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to calculate daily target"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"daily_target": resp})
}
