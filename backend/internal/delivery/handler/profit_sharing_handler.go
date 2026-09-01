package handler

import (
	"net/http"
	"strconv"

	"singgah-pos-backend/internal/usecase"

	"github.com/gin-gonic/gin"
)

type ProfitSharingHandler struct {
	usecase *usecase.ProfitSharingUsecase
}

func NewProfitSharingHandler(uc *usecase.ProfitSharingUsecase) *ProfitSharingHandler {
	return &ProfitSharingHandler{usecase: uc}
}

func (h *ProfitSharingHandler) Preview(c *gin.Context) {
	start := c.Query("start")
	end := c.Query("end")
	outletID := getOutletID(c)
	ratioStr := c.DefaultQuery("ratio", "50")
	ratio, _ := strconv.ParseFloat(ratioStr, 64)

	preview, err := h.usecase.Preview(start, end, outletID, ratio)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, preview)
}

func (h *ProfitSharingHandler) Finalize(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid period ID"})
		return
	}
	outletID := getOutletID(c)
	ratioStr := c.DefaultQuery("ratio", "50")
	ratio, _ := strconv.ParseFloat(ratioStr, 64)

	if err := h.usecase.Finalize(uint(id), ratio, outletID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "periode berhasil di-finalize"})
}

func (h *ProfitSharingHandler) MarkAsPaid(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid period ID"})
		return
	}
	outletID := getOutletID(c)

	if err := h.usecase.MarkAsPaid(uint(id), outletID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "periode berhasil ditandai sebagai dibayar"})
}

func (h *ProfitSharingHandler) Recalculate(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid period ID"})
		return
	}
	outletID := getOutletID(c)
	ratioStr := c.DefaultQuery("ratio", "50")
	ratio, _ := strconv.ParseFloat(ratioStr, 64)

	if err := h.usecase.Recalculate(uint(id), ratio, outletID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "periode berhasil dihitung ulang"})
}

func (h *ProfitSharingHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid period ID"})
		return
	}
	outletID := getOutletID(c)

	if err := h.usecase.Delete(uint(id), outletID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "periode berhasil dihapus"})
}

func (h *ProfitSharingHandler) GetAll(c *gin.Context) {
	outletID := getOutletID(c)
	periods, err := h.usecase.GetAll(outletID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, periods)
}
