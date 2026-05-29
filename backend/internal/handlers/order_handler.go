package handlers

import (
	"net/http"
	"singgah-pos-backend/internal/models"
	"singgah-pos-backend/internal/services"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type OrderHandler struct {
	DB               *gorm.DB
	InventoryService *services.InventoryService
	PaymentService   *services.PaymentService
}

func NewOrderHandler(db *gorm.DB, inventoryService *services.InventoryService, paymentService *services.PaymentService) *OrderHandler {
	return &OrderHandler{
		DB:               db,
		InventoryService: inventoryService,
		PaymentService:   paymentService,
	}
}

func (h *OrderHandler) GetOrders(c *gin.Context) {
	var orders []models.Order
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	h.DB.Preload("OrderItems").
		Preload("OrderItems.Product").
		Order("created_at desc").
		Limit(limit).
		Offset(offset).
		Find(&orders)
	c.JSON(http.StatusOK, orders)
}

type CreateOrderInput struct {
	OrderNumber   string `json:"order_number"`
	PaymentMethod string `json:"payment_method"`
	CashierName   string `json:"cashier_name"`
	CustomerEmail string `json:"customer_email"`
	Items         []struct {
		ProductID uint `json:"product_id"`
		Quantity  int  `json:"quantity"`
	} `json:"items"`
}

func (h *OrderHandler) CreateOrder(c *gin.Context) {
	var input CreateOrderInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Staff synchronization: Get authenticated user from context
	userIDValue, _ := c.Get("user_id")
	userID := userIDValue.(uint)

	var authenticatedUser models.User
	h.DB.First(&authenticatedUser, userID)

	var order models.Order
	var invoiceURL string

	err := h.DB.Transaction(func(tx *gorm.DB) error {
		// 1. Guard Rail: Validate Stock BEFORE any deduction
		if err := h.InventoryService.ValidateStockAvailability(tx, input.Items); err != nil {
			return err
		}

		var totalAmount float64 = 0
		var orderItems []models.OrderItem

		for _, itemInput := range input.Items {
			var product models.Product
			if err := tx.First(&product, itemInput.ProductID).Error; err != nil {
				return err
			}

			itemTotal := product.Price * float64(itemInput.Quantity)
			totalAmount += itemTotal

			orderItems = append(orderItems, models.OrderItem{
				ProductID: product.ID,
				Quantity:  itemInput.Quantity,
				Price:     product.Price,
				Cost:      product.Cost,
			})

			var productWithRecipe models.Product
			tx.Preload("Recipe").First(&productWithRecipe, itemInput.ProductID)

			if len(productWithRecipe.Recipe) > 0 {
				if err := h.InventoryService.DeductStockForRecipe(tx, productWithRecipe.Recipe, itemInput.Quantity, input.OrderNumber); err != nil {
					return err
				}
			} else {
				if err := h.InventoryService.DeductDirectStock(tx, productWithRecipe.ID, itemInput.Quantity); err != nil {
					return err
				}
			}
		}

		// 3. Apply Tax & Service from Settings
		var taxRate, serviceRate float64
		var taxSetting, serviceSetting models.Setting

		if err := tx.Where("key = ?", "tax_percentage").First(&taxSetting).Error; err == nil {
			taxRate, _ = strconv.ParseFloat(taxSetting.Value, 64)
		}
		if err := tx.Where("key = ?", "service_charge").First(&serviceSetting).Error; err == nil {
			serviceRate, _ = strconv.ParseFloat(serviceSetting.Value, 64)
		}

		serviceAmount := totalAmount * (serviceRate / 100)
		taxableAmount := totalAmount + serviceAmount
		taxAmount := taxableAmount * (taxRate / 100)
		finalTotal := totalAmount + serviceAmount + taxAmount

		// Create Order
		status := "Completed"
		payStatus := "Paid"
		orderNumber := input.OrderNumber
		if orderNumber == "" {
			orderNumber = "ORD-" + time.Now().Format("20060102150405")
		}

		if input.PaymentMethod == "QRIS" {
			payStatus = "Unpaid"
			status = "Pending"

			// Trigger Integration (Xendit)
			var err error
			invoiceURL, err = h.PaymentService.CreateQRISInvoice(orderNumber, finalTotal, input.CustomerEmail)
			if err != nil {
				return err
			}
		}

		order = models.Order{
			OrderNumber:   orderNumber,
			TotalAmount:   finalTotal,
			PaymentMethod: input.PaymentMethod,
			PaymentStatus: payStatus,
			Status:        status,
			UserID:        authenticatedUser.ID,
			CashierName:   authenticatedUser.Name,
			OrderItems:    orderItems,
			OrderTime:     time.Now(),
			PaymentRef:    invoiceURL, // Use PaymentRef to store Invoice URL
		}

		if err := tx.Create(&order).Error; err != nil {
			return err
		}

		return tx.Preload("OrderItems").Preload("OrderItems.Product").First(&order, order.ID).Error
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process order: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"order":       order,
		"invoice_url": invoiceURL,
	})
}

func (h *OrderHandler) VoidOrder(c *gin.Context) {
	id := c.Param("id")
	var order models.Order
	if err := h.DB.Preload("OrderItems").First(&order, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	if order.Status == "Void" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Order is already voided"})
		return
	}

	err := h.DB.Transaction(func(tx *gorm.DB) error {
		if err := h.InventoryService.RestoreStockForOrder(tx, order); err != nil {
			return err
		}
		order.Status = "Void"
		return tx.Save(&order).Error
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to void order: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Order voided successfully and stock restored"})
}
