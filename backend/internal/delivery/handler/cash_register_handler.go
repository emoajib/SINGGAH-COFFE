package handler

import (
	"net/http"
	"strconv"

	"singgah-pos-backend/internal/delivery/request"
	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/usecase"

	"github.com/gin-gonic/gin"
)

type CashRegisterHandler struct {
	cashRegisterUsecase *usecase.CashRegisterUsecase
}

func NewCashRegisterHandler(cashRegisterUsecase *usecase.CashRegisterUsecase) *CashRegisterHandler {
	return &CashRegisterHandler{cashRegisterUsecase: cashRegisterUsecase}
}

func (h *CashRegisterHandler) OpenCashRegister(c *gin.Context) {
	var req request.OpenCashRegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	userID, _ := c.Get("user_id")
	outletID := getOutletID(c)

	cashRegister := &entity.CashRegister{
		OpeningAmount: req.OpeningAmount,
		Notes:         req.Notes,
	}

	result, err := h.cashRegisterUsecase.OpenCashRegister(userID.(uint), outletID, cashRegister)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, result.ToResponse())
}

func (h *CashRegisterHandler) GetCashRegisters(c *gin.Context) {
	outletIDStr := c.Query("outlet_id")
	var outletID uint
	if outletIDStr != "" {
		if id, err := strconv.ParseUint(outletIDStr, 10, 64); err == nil {
			outletID = uint(id)
		}
	}

	cashierName := c.Query("cashier_name")
	dateFrom := c.Query("date_from")
	dateTo := c.Query("date_to")
	status := c.Query("status")

	limit, _ := strconv.Atoi(c.Query("limit"))
	if limit <= 0 {
		limit = 50
	}
	offset, _ := strconv.Atoi(c.Query("offset"))

	records, err := h.cashRegisterUsecase.GetCashRegisters(outletID, cashierName, dateFrom, dateTo, status, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch cash registers"})
		return
	}

	result := make([]entity.CashRegisterResponse, len(records))
	for i, r := range records {
		result[i] = r.ToResponse()
	}

	c.JSON(http.StatusOK, result)
}