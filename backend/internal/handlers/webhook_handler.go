package handlers

import (
	"net/http"
	"singgah-pos-backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type WebhookHandler struct {
	DB *gorm.DB
}

func NewWebhookHandler(db *gorm.DB) *WebhookHandler {
	return &WebhookHandler{DB: db}
}

type XenditInvoiceCallback struct {
	ID         string  `json:"id"`
	ExternalID string  `json:"external_id"`
	Status     string  `json:"status"`
	PaidAmount float64 `json:"paid_amount"`
}

func (h *WebhookHandler) HandleXenditWebhook(c *gin.Context) {
	// 1. Verification
	callbackToken := c.GetHeader("x-callback-token")
	var tokenSetting models.Setting
	if err := h.DB.Where("key = ?", "xendit_callback_token").First(&tokenSetting).Error; err == nil {
		if callbackToken != tokenSetting.Value {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid callback token"})
			return
		}
	}

	var payload XenditInvoiceCallback
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload"})
		return
	}

	// 2. Idempotency: Skip if already processed
	var existing models.ProcessedWebhook
	if err := h.DB.Where("webhook_id = ?", payload.ID).First(&existing).Error; err == nil {
		c.JSON(http.StatusOK, gin.H{"status": "already_processed"})
		return
	}

	// 3. Process in transaction
	err := h.DB.Transaction(func(tx *gorm.DB) error {
		// Mark webhook as processed
		if err := tx.Create(&models.ProcessedWebhook{
			WebhookID: payload.ID,
			Status:    payload.Status,
		}).Error; err != nil {
			return err
		}

		// Find order
		var order models.Order
		if err := tx.Where("order_number = ?", payload.ExternalID).First(&order).Error; err != nil {
			return err
		}

		switch payload.Status {
		case "PAID", "SETTLED":
			if order.PaymentStatus == "Paid" {
				return nil
			}
			if payload.PaidAmount > 0 && payload.PaidAmount < order.TotalAmount {
				return nil
			}
			order.PaymentStatus = "Paid"
			order.Status = "Completed"

		case "FAILED", "EXPIRED":
			if order.PaymentStatus == "Paid" {
				return nil
			}
			order.PaymentStatus = "Cancelled"
			order.Status = "Void"

		default:
			return nil
		}

		return tx.Save(&order).Error
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process webhook"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "received"})
}
