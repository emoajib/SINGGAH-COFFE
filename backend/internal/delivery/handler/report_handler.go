package handler

import (
	"net/http"

	"singgah-pos-backend/internal/usecase"

	"github.com/gin-gonic/gin"
)

type ReportHandler struct {
	reportUsecase *usecase.ReportUsecase
}

func NewReportHandler(reportUsecase *usecase.ReportUsecase) *ReportHandler {
	return &ReportHandler{reportUsecase: reportUsecase}
}

func (h *ReportHandler) GetDashboardSummary(c *gin.Context) {
	summary, err := h.reportUsecase.GetDashboardSummary()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch dashboard summary"})
		return
	}

	c.JSON(http.StatusOK, summary)
}
