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
		CreatedAt: m.CreatedAt,
	}, nil
}

func (r *webhookRepository) FindAll(limit int) ([]entity.ProcessedWebhook, error) {
	var ms []models.ProcessedWebhook
	err := r.db.Order("id desc").Limit(limit).Find(&ms).Error
	if err != nil {
		return nil, err
	}
	result := make([]entity.ProcessedWebhook, len(ms))
	for i, m := range ms {
		result[i] = entity.ProcessedWebhook{
			ID:        m.ID,
			WebhookID: m.WebhookID,
			Status:    m.Status,
			CreatedAt: m.CreatedAt,
		}
	}
	return result, nil
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
