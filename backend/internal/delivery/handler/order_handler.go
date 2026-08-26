package handler

import (
	"net/http"
	"strconv"

	"singgah-pos-backend/internal/delivery/request"
	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/usecase"

	"github.com/gin-gonic/gin"
)

type OrderHandler struct {
	orderUsecase *usecase.OrderUsecase
}

func NewOrderHandler(orderUsecase *usecase.OrderUsecase) *OrderHandler {
	return &OrderHandler{orderUsecase: orderUsecase}
}

func (h *OrderHandler) GetOrders(c *gin.Context) {
	outletID := getOutletID(c)
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	start := c.Query("start")
	end := c.Query("end")
	status := c.Query("status")

	var orders []entity.OrderResponse
	var err error
	if start != "" || end != "" || status != "" {
		orders, err = h.orderUsecase.GetAllFiltered(start, end, status, limit, offset, outletID)
	} else {
		orders, err = h.orderUsecase.GetAll(limit, offset, outletID)
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch orders"})
		return
	}

	c.JSON(http.StatusOK, orders)
}

func (h *OrderHandler) CreateOrder(c *gin.Context) {
	var req request.CreateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	userID, ok := getUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized user session"})
		return
	}
	cashierName := req.CashierName
	if cashierName == "" {
		cashierName = getUserName(c)
	}

	ucReq := usecase.CreateOrderRequest{
		OrderNumber:   req.OrderNumber,
		PaymentMethod: req.PaymentMethod,
		CashierName:   cashierName,
		CustomerEmail: req.CustomerEmail,
	}
	for _, item := range req.Items {
		ucReq.Items = append(ucReq.Items, struct {
			ProductID uint `json:"product_id"`
			Quantity  int  `json:"quantity"`
		}{ProductID: item.ProductID, Quantity: item.Quantity})
	}

	result, err := h.orderUsecase.Create(ucReq, userID, cashierName, getOutletID(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process order"})
		return
	}

	c.JSON(http.StatusCreated, result)
}

func (h *OrderHandler) VoidOrder(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid order ID"})
		return
	}

	result, err := h.orderUsecase.Void(uint(id), getOutletID(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to void order"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Order voided successfully and stock restored", "order": result})
}

func (h *OrderHandler) CompleteOrder(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid order ID"})
		return
	}

	result, err := h.orderUsecase.CompletePayment(uint(id), getOutletID(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to complete order payment: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Order marked as completed and paid", "order": result})
}


