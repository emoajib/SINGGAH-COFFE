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

	userID, ok := getUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized user session"})
		return
	}
	outletID := getOutletID(c)

	cashRegister := &entity.CashRegister{
		OpeningAmount: req.OpeningAmount,
		Notes:         req.Notes,
	}

	result, err := h.cashRegisterUsecase.OpenCashRegister(userID, outletID, cashRegister)
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

	outletMap := make(map[uint]string)
	allOutlets, err := h.cashRegisterUsecase.GetAllOutlets()
	if err == nil {
		for _, o := range allOutlets {
			outletMap[o.ID] = o.Name
		}
	}

	result := make([]entity.CashRegisterResponse, len(records))
	for i, r := range records {
		resp := r.ToResponse()
		resp.OutletName = outletMap[r.OutletID]
		result[i] = resp
	}

	c.JSON(http.StatusOK, result)
}

func (h *CashRegisterHandler) UpdateCashRegister(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid cash register ID"})
		return
	}

	var req request.UpdateCashRegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	cashRegister := &entity.CashRegister{
		ID:     uint(id),
		Notes:  req.Notes,
	}

	result, err := h.cashRegisterUsecase.UpdateCashRegister(cashRegister)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result.ToResponse())
}

func (h *CashRegisterHandler) DeleteCashRegister(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid cash register ID"})
		return
	}

	if err := h.cashRegisterUsecase.DeleteCashRegister(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Cash register deleted"})
}

func (h *CashRegisterHandler) CloseCashRegister(c *gin.Context) {
	var req request.CloseCashRegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "closing_amount harus lebih dari 0"})
		return
	}

	userID, ok := getUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized user session"})
		return
	}

	if err := h.cashRegisterUsecase.CloseCashRegister(userID, req.ClosingAmount); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Cash register closed"})
}