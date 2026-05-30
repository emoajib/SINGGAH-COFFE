package postgres

import (
	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/models"

	"gorm.io/gorm"
)

type webhookRepository struct {
	db *gorm.DB
}

func NewWebhookRepository(db *gorm.DB) *webhookRepository {
	return &webhookRepository{db: db}
}

func (r *webhookRepository) FindByWebhookID(webhookID string) (*entity.ProcessedWebhook, error) {
	var m models.ProcessedWebhook
	if err := r.db.Where("webhook_id = ?", webhookID).First(&m).Error; err != nil {
		return nil, err
	}
	return &entity.ProcessedWebhook{
		ID:        m.ID,
		WebhookID: m.WebhookID,
		Status:    m.Status,
	}, nil
}

func (r *webhookRepository) Create(webhook *entity.ProcessedWebhook) error {
	m := &models.ProcessedWebhook{
		WebhookID: webhook.WebhookID,
		Status:    webhook.Status,
	}
	return r.db.Create(m).Error
}

func (r *webhookRepository) Update(order *entity.Order) error {
	return r.db.Model(&models.Order{}).Where("id = ?", order.ID).Updates(map[string]interface{}{
		"payment_status": order.PaymentStatus,
		"status":         order.Status,
	}).Error
}
