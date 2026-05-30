package handler

import (
	"net/http"

	"singgah-pos-backend/internal/usecase"

	"github.com/gin-gonic/gin"
)

type WebhookHandler struct {
	webhookUsecase *usecase.WebhookUsecase
}

func NewWebhookHandler(webhookUsecase *usecase.WebhookUsecase) *WebhookHandler {
	return &WebhookHandler{webhookUsecase: webhookUsecase}
}

func (h *WebhookHandler) HandleXenditWebhook(c *gin.Context) {
	var callback usecase.XenditCallback
	if err := c.ShouldBindJSON(&callback); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid webhook payload"})
		return
	}

	callbackToken := c.GetHeader("X-Callback-Token")

	if err := h.webhookUsecase.ProcessXenditWebhook(callbackToken, callback); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process webhook"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}
