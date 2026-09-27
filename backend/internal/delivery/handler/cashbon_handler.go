// Vetted by AI - Manual Review Required by Senior Engineer/Manager
package handler

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"singgah-pos-backend/internal/delivery/request"
	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/usecase"

	"github.com/gin-gonic/gin"
)

type CashbonHandler struct {
	cashbonUsecase *usecase.CashbonUsecase
}

func NewCashbonHandler(cashbonUsecase *usecase.CashbonUsecase) *CashbonHandler {
	return &CashbonHandler{cashbonUsecase: cashbonUsecase}
}

func (h *CashbonHandler) GetCashbons(c *gin.Context) {
	outletID := getOutletID(c)
	status := c.Query("status")
	periodIDStr := c.Query("period_id")

	if periodIDStr != "" {
		pid, err := strconv.ParseUint(periodIDStr, 10, 64)
		if err == nil && pid > 0 {
			list, err := h.cashbonUsecase.GetByPeriod(uint(pid), outletID)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data kasbon periode"})
				return
			}
			c.JSON(http.StatusOK, list)
			return
		}
	}

	list, err := h.cashbonUsecase.GetByOutlet(outletID, status)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil daftar kasbon"})
		return
	}
	c.JSON(http.StatusOK, list)
}

func (h *CashbonHandler) GetCashbonByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID kasbon tidak valid"})
		return
	}
	outletID := getOutletID(c)
	item, err := h.cashbonUsecase.GetByID(uint(id), outletID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Data kasbon tidak ditemukan"})
		return
	}
	c.JSON(http.StatusOK, item)
}

func (h *CashbonHandler) CreateCashbon(c *gin.Context) {
	var req request.CreateCashbonRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Input tidak valid: %v", err)})
		return
	}

	outletID := getOutletID(c)
	date := time.Now()
	if req.CashbonDate != "" {
		if parsed, err := time.Parse(time.RFC3339, req.CashbonDate); err == nil {
			date = parsed
		} else if parsed, err := time.Parse("2006-01-02", req.CashbonDate); err == nil {
			date = parsed
		}
	}

	paymentMethod := req.PaymentMethod
	if paymentMethod == "" {
		paymentMethod = "Cash"
	}

	cashbon := &entity.BaristaCashbon{
		OutletID:      outletID,
		PersonID:      req.PersonID,
		BaristaName:   req.BaristaName,
		Amount:        req.Amount,
		CashbonDate:   date,
		PaymentMethod: paymentMethod,
		Reason:        req.Reason,
		Status:        "pending",
	}

	res, err := h.cashbonUsecase.Create(cashbon, outletID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, res)
}

func (h *CashbonHandler) UpdateCashbon(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID kasbon tidak valid"})
		return
	}

	var req request.UpdateCashbonRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Input tidak valid: %v", err)})
		return
	}

	outletID := getOutletID(c)
	var date time.Time
	if req.CashbonDate != "" {
		if parsed, err := time.Parse(time.RFC3339, req.CashbonDate); err == nil {
			date = parsed
		} else if parsed, err := time.Parse("2006-01-02", req.CashbonDate); err == nil {
			date = parsed
		}
	}

	cashbon := &entity.BaristaCashbon{
		ID:            uint(id),
		OutletID:      outletID,
		PersonID:      req.PersonID,
		BaristaName:   req.BaristaName,
		Amount:        req.Amount,
		CashbonDate:   date,
		PaymentMethod: req.PaymentMethod,
		Reason:        req.Reason,
	}

	res, err := h.cashbonUsecase.Update(cashbon, outletID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, res)
}

func (h *CashbonHandler) DeleteCashbon(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID kasbon tidak valid"})
		return
	}

	outletID := getOutletID(c)
	if err := h.cashbonUsecase.Delete(uint(id), outletID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Data kasbon berhasil dihapus"})
}
