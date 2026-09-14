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
	start := c.Query("start")
	end := c.Query("end")
	summary, err := h.reportUsecase.GetDashboardSummary(start, end, getOutletID(c))
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

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
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

	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="Laporan_Keuangan_%s_sd_%s.csv"`, start, end))
	c.Status(http.StatusOK)

	var buf bytes.Buffer
	// UTF-8 BOM agar terbaca sempurna di Microsoft Excel
	buf.WriteString("\xef\xbb\xbf")
	writer := csv.NewWriter(&buf)

	// Header Perusahaan & Dokumen
	writer.Write([]string{"SINGGAH COFFEE - LAPORAN LABA RUGI & KEUANGAN RESMI"})
	writer.Write([]string{"Periode Pembukuan:", fmt.Sprintf("%s s/d %s", start, end)})
	writer.Write([]string{"Tanggal Unduh:", time.Now().Format("02/01/2006 15:04:05 WIB")})
	writer.Write([]string{"Standar:", "SAK EMKM / PSAK - Akuntansi POS"})
	writer.Write([]string{}) // Baris kosong

	// Header Kolom Tabel
	writer.Write([]string{"No", "Kategori Akun", "Kode Akun", "Uraian / Deskripsi", "Jumlah (IDR)", "Rasio Omzet (%)"})

	no := 1
	rev := report.Revenue
	pct := func(val float64) string {
		if rev == 0 {
			return "0.0%"
		}
		return fmt.Sprintf("%.1f%%", (val/rev)*100)
	}

	// 1. Pendapatan
	writer.Write([]string{fmt.Sprintf("%d", no), "Pendapatan Operasional", "4101", "Total Pendapatan Penjualan", fmt.Sprintf("%.0f", report.Revenue), "100.0%"})
	no++
	for _, p := range report.PaymentBreakdown {
		writer.Write([]string{"", "  Rincian Pembayaran", "-", fmt.Sprintf("  • %s (%d Transaksi)", p.PaymentMethod, p.Count), fmt.Sprintf("%.0f", p.Total), pct(p.Total)})
	}

	// 2. HPP
	writer.Write([]string{fmt.Sprintf("%d", no), "Beban Pokok (HPP)", "5101", "Beban Pokok Penjualan (Modal Bahan)", fmt.Sprintf("%.0f", report.Cogs), pct(report.Cogs)})
	no++

	// 3. Laba Kotor
	writer.Write([]string{"-", "Laba Kotor", "-", "Margin Penjualan Bersih (Gross Profit)", fmt.Sprintf("%.0f", report.GrossProfit), pct(report.GrossProfit)})

	// 4. Beban Operasional
	for _, exp := range report.Expenses {
		writer.Write([]string{fmt.Sprintf("%d", no), "Beban Operasional", "5201", exp.Category, fmt.Sprintf("%.0f", exp.Amount), pct(exp.Amount)})
		no++
	}
	writer.Write([]string{"-", "Total Beban", "-", "Akumulasi Beban Operasional", fmt.Sprintf("%.0f", report.TotalExpenses), pct(report.TotalExpenses)})

	// 5. Laba Bersih
	writer.Write([]string{"-", "Laba Bersih Akhir", "3102", "LABA BERSIH PERIODE BERJALAN", fmt.Sprintf("%.0f", report.NetProfit), pct(report.NetProfit)})

	writer.Flush()
	if err := writer.Error(); err != nil {
		return
	}

	c.Writer.Write(buf.Bytes())
}

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
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
	pdf.SetMargins(15, 15, 15)
	pdf.AddPage()

	// 1. KOP SURAT FORMAL
	pdf.SetFont("Helvetica", "B", 18)
	pdf.SetTextColor(50, 30, 20)
	pdf.CellFormat(0, 7, "SINGGAH COFFEE", "", 1, "C", false, 0, "")

	pdf.SetFont("Helvetica", "B", 9)
	pdf.SetTextColor(100, 100, 100)
	pdf.CellFormat(0, 5, "SPECIALTY COFFEE & EATERY", "", 1, "C", false, 0, "")

	pdf.SetFont("Helvetica", "", 8)
	pdf.SetTextColor(120, 120, 120)
	pdf.CellFormat(0, 4, "Sistem Manajemen Kasir & Akuntansi Terintegrasi • Dokumen Resmi Internal", "", 1, "C", false, 0, "")

	pdf.Ln(2)
	// Garis Ganda Kop Surat (Double Line)
	pdf.SetDrawColor(50, 30, 20)
	pdf.SetLineWidth(0.8)
	pdf.Line(15, pdf.GetY(), 195, pdf.GetY())
	pdf.SetLineWidth(0.2)
	pdf.Line(15, pdf.GetY()+1.2, 195, pdf.GetY()+1.2)
	pdf.Ln(5)

	// 2. METADATA SURAT RESMI
	pdf.SetFont("Helvetica", "B", 13)
	pdf.SetTextColor(30, 41, 59)
	pdf.CellFormat(0, 7, "LAPORAN LABA RUGI OPERASIONAL", "", 1, "C", false, 0, "")

	startYear := "2026"
	startMonth := "09"
	if len(start) >= 7 {
		startYear = start[:4]
		startMonth = start[5:7]
	}
	docNo := fmt.Sprintf("No: SC/FIN-LR/%s/%s/014", startYear, startMonth)
	pdf.SetFont("Helvetica", "", 8)
	pdf.SetTextColor(80, 80, 80)
	pdf.CellFormat(0, 4, docNo, "", 1, "C", false, 0, "")
	pdf.Ln(3)

	// Kotak Metadata Surat
	pdf.SetFillColor(248, 250, 252)
	pdf.SetDrawColor(226, 232, 240)
	pdf.Rect(15, pdf.GetY(), 180, 14, "FD")
	curY := pdf.GetY() + 2

	pdf.SetXY(18, curY)
	pdf.SetFont("Helvetica", "B", 8)
	pdf.Cell(25, 4, "Periode Buku:")
	pdf.SetFont("Helvetica", "", 8)
	pdf.Cell(60, 4, fmt.Sprintf("%s s/d %s", start, end))

	pdf.SetFont("Helvetica", "B", 8)
	pdf.Cell(25, 4, "Tanggal Cetak:")
	pdf.SetFont("Helvetica", "", 8)
	pdf.Cell(50, 4, time.Now().Format("02 Jan 2006, 15:04 WIB"))

	pdf.SetXY(18, curY+5)
	pdf.SetFont("Helvetica", "B", 8)
	pdf.Cell(25, 4, "Status Dokumen:")
	pdf.SetFont("Helvetica", "", 8)
	pdf.Cell(60, 4, "Official Executive Financial Statement")

	pdf.SetFont("Helvetica", "B", 8)
	pdf.Cell(25, 4, "Mata Uang:")
	pdf.SetFont("Helvetica", "", 8)
	pdf.Cell(50, 4, "IDR (Rupiah Indonesia)")

	pdf.SetY(curY + 14)
	pdf.Ln(3)

	// 3. TABEL UTAMA LAPORAN KEUANGAN
	pdf.SetFont("Helvetica", "B", 8)
	pdf.SetFillColor(241, 245, 249)
	pdf.SetDrawColor(203, 213, 225)
	pdf.SetTextColor(51, 65, 85)

	pdf.CellFormat(10, 6, "NO", "1", 0, "C", true, 0, "")
	pdf.CellFormat(18, 6, "KODE", "1", 0, "C", true, 0, "")
	pdf.CellFormat(90, 6, "URAIAN AKUN / KETERANGAN", "1", 0, "L", true, 0, "")
	pdf.CellFormat(42, 6, "JUMLAH (IDR)", "1", 0, "R", true, 0, "")
	pdf.CellFormat(20, 6, "% OMZET", "1", 1, "R", true, 0, "")

	rev := report.Revenue
	calcPct := func(val float64) string {
		if rev == 0 {
			return "0.0%"
		}
		return fmt.Sprintf("%.1f%%", (val/rev)*100)
	}

	renderRow := func(no, kode, desc string, val float64, isBold bool, bgType string, textCol string) {
		if isBold {
			pdf.SetFont("Helvetica", "B", 8)
		} else {
			pdf.SetFont("Helvetica", "", 8)
		}

		if bgType == "subtotal" {
			pdf.SetFillColor(248, 250, 252)
		} else if bgType == "highlight" {
			pdf.SetFillColor(238, 242, 255)
		} else if bgType == "total" {
			pdf.SetFillColor(236, 253, 245)
		} else {
			pdf.SetFillColor(255, 255, 255)
		}

		switch textCol {
		case "green":
			pdf.SetTextColor(22, 101, 52)
		case "red":
			pdf.SetTextColor(185, 28, 28)
		case "blue":
			pdf.SetTextColor(30, 64, 175)
		default:
			pdf.SetTextColor(30, 41, 59)
		}

		valStr := fmt.Sprintf("Rp %s", formatNumberInt(int64(val)))
		if val < 0 {
			valStr = fmt.Sprintf("(Rp %s)", formatNumberInt(int64(-val)))
		}

		hasFill := bgType != "none"
		pdf.CellFormat(10, 5.5, no, "1", 0, "C", hasFill, 0, "")
		pdf.CellFormat(18, 5.5, kode, "1", 0, "C", hasFill, 0, "")
		pdf.CellFormat(90, 5.5, " "+desc, "1", 0, "L", hasFill, 0, "")
		pdf.CellFormat(42, 5.5, valStr+" ", "1", 0, "R", hasFill, 0, "")
		pdf.CellFormat(20, 5.5, calcPct(val)+" ", "1", 1, "R", hasFill, 0, "")
		pdf.SetTextColor(30, 41, 59)
	}

	// I. Pendapatan
	renderRow("1", "4101", "I. PENDAPATAN OPERASIONAL", report.Revenue, true, "subtotal", "green")
	for _, p := range report.PaymentBreakdown {
		renderRow("", "-", fmt.Sprintf("     • Penjualan %s (%d Transaksi)", p.PaymentMethod, p.Count), p.Total, false, "none", "normal")
	}

	// II. HPP
	renderRow("2", "5101", "II. BEBAN POKOK PENJUALAN (HPP / COGS)", report.Cogs, true, "subtotal", "red")
	renderRow("", "-", "     • Pemakaian Modal Bahan Baku & Resep Minuman", report.Cogs, false, "none", "normal")

	// III. Laba Kotor
	renderRow("", "-", "III. LABA KOTOR (GROSS PROFIT)", report.GrossProfit, true, "highlight", "blue")

	// IV. Beban Operasional
	renderRow("3", "5201", "IV. BEBAN OPERASIONAL TOKO", report.TotalExpenses, true, "subtotal", "red")
	for _, exp := range report.Expenses {
		renderRow("", "-", "     • "+exp.Category, exp.Amount, false, "none", "normal")
	}

	// V. Laba Bersih
	renderRow("", "3102", "V. LABA BERSIH OPERASIONAL (NET PROFIT)", report.NetProfit, true, "total", "green")

	pdf.Ln(8)

	// 4. LEMBAR PENGESAHAN RESMI (SIGN-OFF BLOCK)
	yPos := pdf.GetY()
	if yPos > 225 {
		pdf.AddPage()
		yPos = pdf.GetY()
	}

	pdf.SetFont("Helvetica", "B", 8)
	pdf.SetTextColor(71, 85, 105)

	// Kolom Kiri
	pdf.SetXY(25, yPos)
	pdf.Cell(60, 4, "Dibuat & Diverifikasi Oleh:")
	pdf.SetXY(25, yPos+4)
	pdf.SetFont("Helvetica", "", 7.5)
	pdf.Cell(60, 4, "Bagian Administrasi Keuangan / Kasir")

	pdf.SetXY(25, yPos+22)
	pdf.SetFont("Helvetica", "B", 8)
	pdf.Cell(60, 4, "( ___________________________ )")
	pdf.SetXY(25, yPos+26)
	pdf.SetFont("Helvetica", "", 7.5)
	pdf.Cell(60, 4, "Tanggal: _____________________")

	// Kolom Kanan
	pdf.SetXY(125, yPos)
	pdf.SetFont("Helvetica", "B", 8)
	pdf.Cell(60, 4, "Mengetahui & Menyetujui:")
	pdf.SetXY(125, yPos+4)
	pdf.SetFont("Helvetica", "", 7.5)
	pdf.Cell(60, 4, "Owner / Pimpinan Usaha")

	pdf.SetXY(125, yPos+22)
	pdf.SetFont("Helvetica", "B", 8)
	pdf.Cell(60, 4, "( ___________________________ )")
	pdf.SetXY(125, yPos+26)
	pdf.SetFont("Helvetica", "", 7.5)
	pdf.Cell(60, 4, "Tanggal: _____________________")

	// Footer Note
	pdf.SetXY(15, yPos+35)
	pdf.SetFont("Helvetica", "I", 7)
	pdf.SetTextColor(148, 163, 184)
	pdf.Cell(180, 4, "* Dokumen ini dihasilkan secara otomatis oleh Sistem Singgah POS dan sah sebagai bukti audit operasional internal.")

	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="Laporan_Laba_Rugi_%s_sd_%s.pdf"`, start, end))

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

// GetProductPerformance returns per-product sales volume & revenue for a date range.
func (h *ReportHandler) GetProductPerformance(c *gin.Context) {
	start := c.Query("start")
	end := c.Query("end")
	vol, err := h.reportUsecase.GetProductPerformance(start, end, getOutletID(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load product performance"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"products": vol})
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

