package handler

import (
	"errors"
	"net/http"
	"strconv"

	"singgah-pos-backend/internal/usecase"
	domainErrors "singgah-pos-backend/internal/domain/errors"

	"github.com/gin-gonic/gin"
)

type WebhookHandler struct {
	webhookUsecase *usecase.WebhookUsecase
}

func NewWebhookHandler(webhookUsecase *usecase.WebhookUsecase) *WebhookHandler {
	return &WebhookHandler{webhookUsecase: webhookUsecase}
}

func (h *WebhookHandler) GetWebhookLogs(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	logs, err := h.webhookUsecase.GetWebhookLogs(limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch logs"})
		return
	}
	c.JSON(http.StatusOK, logs)
}

func (h *WebhookHandler) HandleXenditWebhook(c *gin.Context) {
	var callback usecase.XenditCallback
	if err := c.ShouldBindJSON(&callback); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid webhook payload"})
		return
	}

	callbackToken := c.GetHeader("X-Callback-Token")

	if err := h.webhookUsecase.ProcessXenditWebhook(callbackToken, callback); err != nil {
		var de *domainErrors.DomainError
		if errors.As(err, &de) {
			switch {
			case errors.Is(err, domainErrors.ErrUnauthorized):
				c.JSON(http.StatusUnauthorized, gin.H{"error": de.Message})
				return
			case errors.Is(err, domainErrors.ErrInvalidInput):
				c.JSON(http.StatusBadRequest, gin.H{"error": de.Message})
				return
			}
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process webhook"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}
