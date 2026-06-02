package handler

import (
	"bytes"
	"encoding/csv"
	"fmt"
	"net/http"
	"time"

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

func (h *ReportHandler) GetProfitLoss(c *gin.Context) {
	start := c.Query("start")
	end := c.Query("end")

	if start == "" || end == "" {
		now := time.Now()
		start = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location()).Format("2006-01-02")
		end = now.Format("2006-01-02")
	}

	report, err := h.reportUsecase.GetProfitLossReport(start, end)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate report"})
		return
	}

	c.JSON(http.StatusOK, report)
}

func (h *ReportHandler) ExportProfitLossCSV(c *gin.Context) {
	start := c.Query("start")
	end := c.Query("end")

	if start == "" || end == "" {
		now := time.Now()
		start = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location()).Format("2006-01-02")
		end = now.Format("2006-01-02")
	}

	report, err := h.reportUsecase.GetProfitLossReport(start, end)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate report"})
		return
	}

	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="profit_loss_%s_%s.csv"`, start, end))
	c.Status(http.StatusOK)

	var buf bytes.Buffer
	writer := csv.NewWriter(&buf)

	writer.Write([]string{"Kategori", "Jumlah"})

	writer.Write([]string{"Revenue", fmt.Sprintf("%.2f", report.Revenue)})
	writer.Write([]string{"COGS", fmt.Sprintf("%.2f", report.Cogs)})
	writer.Write([]string{"Gross Profit", fmt.Sprintf("%.2f", report.GrossProfit)})

	for _, exp := range report.Expenses {
		writer.Write([]string{exp.Category, fmt.Sprintf("%.2f", exp.Amount)})
	}

	writer.Write([]string{"Total Expenses", fmt.Sprintf("%.2f", report.TotalExpenses)})
	writer.Write([]string{"Net Profit", fmt.Sprintf("%.2f", report.NetProfit)})

	writer.Flush()
	if err := writer.Error(); err != nil {
		return
	}

	c.Writer.Write(buf.Bytes())
}

func (h *ReportHandler) GetSalesSummary(c *gin.Context) {
	summary := h.reportUsecase.GetSalesSummary()
	c.JSON(http.StatusOK, summary)
}
