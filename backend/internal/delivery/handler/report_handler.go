package handler

import (
	"bytes"
	"encoding/csv"
	"fmt"
	"net/http"
	"time"

	"singgah-pos-backend/internal/usecase"

	"github.com/gin-gonic/gin"
	"github.com/jung-kurt/gofpdf"
)

type ReportHandler struct {
	reportUsecase *usecase.ReportUsecase
}

func NewReportHandler(reportUsecase *usecase.ReportUsecase) *ReportHandler {
	return &ReportHandler{reportUsecase: reportUsecase}
}

func (h *ReportHandler) GetDashboardSummary(c *gin.Context) {
	summary, err := h.reportUsecase.GetDashboardSummary(getOutletID(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch dashboard summary"})
		return
	}

	// FIX-3: zero the financial fields for cashier (BFLA protection)
	if c.GetString("user_role") == "cashier" {
		summary.TotalCogs = 0
		summary.TotalExpenses = 0
		summary.NetProfit = 0
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

	report, err := h.reportUsecase.GetProfitLossReport(start, end, getOutletID(c))
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

	report, err := h.reportUsecase.GetProfitLossReport(start, end, getOutletID(c))
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
	for _, p := range report.PaymentBreakdown {
		writer.Write([]string{"  Pendapatan " + p.PaymentMethod, fmt.Sprintf("%.2f", p.Total)})
		writer.Write([]string{"  Transaksi " + p.PaymentMethod, fmt.Sprintf("%d", p.Count)})
	}
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

func (h *ReportHandler) ExportProfitLossPDF(c *gin.Context) {
	start := c.Query("start")
	end := c.Query("end")

	if start == "" || end == "" {
		now := time.Now()
		start = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location()).Format("2006-01-02")
		end = now.Format("2006-01-02")
	}

	report, err := h.reportUsecase.GetProfitLossReport(start, end, getOutletID(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate report"})
		return
	}

	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(20, 20, 20)
	pdf.AddPage()

	pdf.SetFont("Helvetica", "B", 18)
	pdf.CellFormat(0, 15, "SINGGAH COFFEE", "", 1, "C", false, 0, "")
	pdf.SetFont("Helvetica", "B", 12)
	pdf.CellFormat(0, 8, "LAPORAN LABA RUGI", "", 1, "C", false, 0, "")
	pdf.SetFont("Helvetica", "", 9)
	pdf.CellFormat(0, 6, fmt.Sprintf("Periode: %s s/d %s", start, end), "", 1, "C", false, 0, "")

	pdf.Ln(8)

	left := 20
	right := 190
	col2 := 160

	pdf.SetFont("Helvetica", "B", 10)
	pdf.SetFillColor(245, 245, 245)
	pdf.Rect(float64(left), pdf.GetY(), float64(right-left), 7, "F")
	pdf.CellFormat(40, 7, "KETERANGAN", "", 0, "L", false, 0, "")
	pdf.CellFormat(0, 7, "JUMLAH (IDR)", "", 1, "R", false, 0, "")
	pdf.Ln(2)

	row := func(label string, value float64, bold bool, textColor string) {
		if bold {
			pdf.SetFont("Helvetica", "B", 10)
		} else {
			pdf.SetFont("Helvetica", "", 10)
		}
		switch textColor {
		case "red":
			pdf.SetTextColor(200, 50, 50)
		case "green":
			pdf.SetTextColor(30, 150, 80)
		case "blue":
			pdf.SetTextColor(40, 80, 180)
		default:
			pdf.SetTextColor(40, 40, 40)
		}

		valStr := fmt.Sprintf("Rp %s", formatNumberInt(int64(value)))
		if value < 0 {
			valStr = fmt.Sprintf("(Rp %s)", formatNumberInt(int64(-value)))
		}

		pdf.CellFormat(float64(left), 8, label, "", 0, "L", false, 0, "")
		pdf.CellFormat(float64(col2-left), 8, valStr, "", 1, "R", false, 0, "")
		pdf.SetTextColor(40, 40, 40)
	}

	row("I. PENDAPATAN", report.Revenue, true, "green")
	for _, p := range report.PaymentBreakdown {
		row("   • "+p.PaymentMethod, p.Total, false, "")
	}
	row("II. HPP (Beban Pokok)", report.Cogs, false, "red")
	pdf.Ln(1)
	row("LABA KOTOR", report.GrossProfit, true, "blue")
	pdf.Ln(3)

	pdf.SetFont("Helvetica", "B", 9)
	pdf.SetTextColor(100, 100, 100)
	pdf.CellFormat(0, 6, "III. BEBAN OPERASIONAL", "", 1, "L", false, 0, "")
	pdf.SetTextColor(40, 40, 40)

	for _, exp := range report.Expenses {
		row(exp.Category, exp.Amount, false, "red")
	}
	row("Total Beban", report.TotalExpenses, true, "red")
	pdf.Ln(4)

	pdf.SetDrawColor(40, 40, 40)
	pdf.SetLineWidth(0.5)
	lineY := pdf.GetY()
	pdf.Line(float64(left), lineY, float64(right), lineY)
	pdf.Ln(3)

	row("LABA BERSIH", report.NetProfit, true, "green")

	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="profit_loss_%s_%s.pdf"`, start, end))

	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate PDF"})
		return
	}
	c.Writer.Write(buf.Bytes())
}

func (h *ReportHandler) GetSalesSummary(c *gin.Context) {
	summary := h.reportUsecase.GetSalesSummary(getOutletID(c))
	c.JSON(http.StatusOK, summary)
}

func formatNumberInt(n int64) string {
	if n == 0 {
		return "0"
	}
	isNegative := n < 0
	if isNegative {
		n = -n
	}
	s := ""
	digits := 0
	for n > 0 {
		if digits > 0 && digits%3 == 0 {
			s = "." + s
		}
		s = string(rune('0'+n%10)) + s
		n /= 10
		digits++
	}
	if isNegative {
		s = "-" + s
	}
	return s
}

