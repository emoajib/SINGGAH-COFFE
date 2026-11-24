package handler

import (
	"fmt"
	"net/http"
	"strconv"

	"singgah-pos-backend/internal/delivery/request"
	"singgah-pos-backend/internal/usecase"

	"github.com/gin-gonic/gin"
	"github.com/jung-kurt/gofpdf"
)

type StockOpnameHandler struct {
	uc *usecase.StockOpnameUsecase
}

func NewStockOpnameHandler(uc *usecase.StockOpnameUsecase) *StockOpnameHandler {
	return &StockOpnameHandler{uc: uc}
}

func (h *StockOpnameHandler) Create(c *gin.Context) {
	var req request.CreateStockOpnameRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}
	userID, ok := getUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	opname, err := h.uc.Create(req, getOutletID(c), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create stock opname"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"opname": opname})
}

func (h *StockOpnameHandler) List(c *gin.Context) {
	opnames, err := h.uc.List(getOutletID(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch stock opname"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"opnames": opnames})
}

func (h *StockOpnameHandler) Get(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	opname, err := h.uc.Get(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Stock opname not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"opname": opname})
}

func (h *StockOpnameHandler) ExportPDF(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	opname, err := h.uc.Get(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Stock opname not found"})
		return
	}
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.AddPage()
	pdf.SetFont("Helvetica", "B", 14)
	pdf.Cell(0, 10, "STOK OPNAME - SINGGAH COFFEE")
	pdf.Ln(12)
	pdf.SetFont("Helvetica", "", 10)
	pdf.Cell(0, 6, fmt.Sprintf("Periode: %s - %s", opname.PeriodFrom.Format("2006-01-02"), opname.PeriodTo.Format("2006-01-02")))
	pdf.Ln(6)
	pdf.Cell(0, 6, fmt.Sprintf("Outlet ID: %d", opname.OutletID))
	pdf.Ln(10)

	pdf.SetFont("Helvetica", "B", 9)
	pdf.CellFormat(60, 7, "Bahan", "1", 0, "L", false, 0, "")
	pdf.CellFormat(25, 7, "Sistem", "1", 0, "C", false, 0, "")
	pdf.CellFormat(25, 7, "Fisik", "1", 0, "C", false, 0, "")
	pdf.CellFormat(25, 7, "Selisih", "1", 0, "C", false, 0, "")
	pdf.CellFormat(55, 7, "Catatan", "1", 1, "L", false, 0, "")

	pdf.SetFont("Helvetica", "", 9)
	for _, it := range opname.Items {
		pdf.CellFormat(60, 7, it.IngredientName, "1", 0, "L", false, 0, "")
		pdf.CellFormat(25, 7, fmt.Sprintf("%.2f", it.SystemStock), "1", 0, "C", false, 0, "")
		pdf.CellFormat(25, 7, fmt.Sprintf("%.2f", it.PhysicalStock), "1", 0, "C", false, 0, "")
		pdf.CellFormat(25, 7, fmt.Sprintf("%.2f", it.Difference), "1", 0, "C", false, 0, "")
		pdf.CellFormat(55, 7, it.Note, "1", 1, "L", false, 0, "")
	}

	pdf.Ln(10)
	pdf.Cell(0, 6, "Tanda tangan barista: ____________________")
	pdf.Ln(12)
	pdf.Cell(0, 6, "Tanda tangan manager: ____________________")

	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=stock-opname-%d.pdf", id))
	if err := pdf.Output(c.Writer); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate PDF"})
	}
}
