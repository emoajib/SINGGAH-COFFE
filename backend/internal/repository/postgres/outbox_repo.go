package postgres

import (
	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/models"

	"gorm.io/gorm"
)

type outboxRepository struct {
	db *gorm.DB
}

func NewOutboxRepository(db *gorm.DB) *outboxRepository {
	return &outboxRepository{db: db}
}

func (r *outboxRepository) Create(event *entity.EventOutbox) error {
	m := toModelEventOutbox(event)
	if err := r.db.Create(m).Error; err != nil {
		return err
	}
	event.ID = m.ID
	event.SequenceNumber = m.SequenceNumber
	event.CreatedAt = m.CreatedAt
	return nil
}

func (r *outboxRepository) FindPending(limit int) ([]entity.EventOutbox, error) {
	var ms []models.PSAKEventOutbox
	if err := r.db.Where("status = ?", "pending").
		Order("sequence_number asc").
		Limit(limit).
		Find(&ms).Error; err != nil {
		return nil, err
	}
	result := make([]entity.EventOutbox, len(ms))
	for i, m := range ms {
		result[i] = *toDomainEventOutbox(&m)
	}
	return result, nil
}

func (r *outboxRepository) Claim(id uint) error {
	return r.db.Model(&models.PSAKEventOutbox{}).
		Where("id = ? AND status = ?", id, "pending").
		Update("status", "processing").Error
}

func (r *outboxRepository) MarkSuccess(id uint) error {
	return r.db.Model(&models.PSAKEventOutbox{}).Where("id = ?", id).
		Updates(map[string]interface{}{
			"status":      "success",
			"processed_at": gorm.Expr("NOW()"),
		}).Error
}

func (r *outboxRepository) MarkFailed(id uint, errMsg string) error {
	return r.db.Model(&models.PSAKEventOutbox{}).Where("id = ?", id).
		Updates(map[string]interface{}{
			"status":     "failed",
			"last_error": errMsg,
			"retry_count": gorm.Expr("retry_count + 1"),
		}).Error
}

func (r *outboxRepository) MoveToDeadLetter(id uint) error {
	return r.db.Model(&models.PSAKEventOutbox{}).Where("id = ?", id).
		Update("status", "dead_letter").Error
}

func (r *outboxRepository) Cleanup(olderThanDays int) (int64, error) {
	result := r.db.Where("status = ? AND processed_at < NOW() - INTERVAL ? DAY", "success", olderThanDays).
		Delete(&models.PSAKEventOutbox{})
	return result.RowsAffected, result.Error
}

func (r *outboxRepository) ExistsByEventRef(eventType, referenceType string, referenceID uint) (bool, error) {
	var count int64
	if err := r.db.Model(&models.PSAKEventOutbox{}).
		Where("event_type = ? AND reference_type = ? AND reference_id = ?", eventType, referenceType, referenceID).
		Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}

func toDomainEventOutbox(m *models.PSAKEventOutbox) *entity.EventOutbox {
	return &entity.EventOutbox{
		ID:             m.ID,
		EventType:      m.EventType,
		ReferenceType:  m.ReferenceType,
		ReferenceID:    m.ReferenceID,
		Payload:        m.Payload,
		Status:         m.Status,
		RetryCount:     m.RetryCount,
		MaxRetries:     m.MaxRetries,
		LastError:      m.LastError,
		ProcessedAt:    m.ProcessedAt,
		SequenceNumber: m.SequenceNumber,
		CreatedAt:      m.CreatedAt,
		UpdatedAt:      m.UpdatedAt,
	}
}

func toModelEventOutbox(e *entity.EventOutbox) *models.PSAKEventOutbox {
	return &models.PSAKEventOutbox{
		EventType:      e.EventType,
		ReferenceType:  e.ReferenceType,
		ReferenceID:    e.ReferenceID,
		Payload:        e.Payload,
		Status:         e.Status,
		RetryCount:     e.RetryCount,
		MaxRetries:     e.MaxRetries,
		LastError:      e.LastError,
		ProcessedAt:    e.ProcessedAt,
		SequenceNumber: e.SequenceNumber,
	}
}
