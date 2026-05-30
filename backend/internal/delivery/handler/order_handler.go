package handler

import (
	"net/http"
	"strconv"

	"singgah-pos-backend/internal/delivery/request"
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
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	orders, err := h.orderUsecase.GetAll(limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch orders"})
		return
	}

	c.JSON(http.StatusOK, orders)
}

func (h *OrderHandler) CreateOrder(c *gin.Context) {
	var req request.CreateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, _ := c.Get("user_id")
	cashierName := ""
	if user, err := h.getCurrentUser(c); err == nil {
		cashierName = user
	}

	ucReq := usecase.CreateOrderRequest{
		OrderNumber:   req.OrderNumber,
		PaymentMethod: req.PaymentMethod,
		CashierName:   req.CashierName,
		CustomerEmail: req.CustomerEmail,
	}
	for _, item := range req.Items {
		ucReq.Items = append(ucReq.Items, struct {
			ProductID uint `json:"product_id"`
			Quantity  int  `json:"quantity"`
		}{ProductID: item.ProductID, Quantity: item.Quantity})
	}

	result, err := h.orderUsecase.Create(ucReq, userID.(uint), cashierName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process order: " + err.Error()})
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

	result, err := h.orderUsecase.Void(uint(id))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to void order: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Order voided successfully and stock restored", "order": result})
}

func (h *OrderHandler) getCurrentUser(c *gin.Context) (string, error) {
	userID, _ := c.Get("user_id")
	_ = userID
	name, _ := c.Get("user_email")
	return name.(string), nil
}
