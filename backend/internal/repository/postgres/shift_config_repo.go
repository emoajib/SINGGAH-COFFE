package postgres

import (
	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/models"
	"singgah-pos-backend/internal/repository"

	"gorm.io/gorm"
)

// shiftConfigRepository implements repository.ShiftConfigRepository
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
type shiftConfigRepository struct {
	db *gorm.DB
}

func NewShiftConfigRepository(db *gorm.DB) repository.ShiftConfigRepository {
	return &shiftConfigRepository{db: db}
}

func (r *shiftConfigRepository) Create(s *entity.ShiftConfig) error {
	m := toModelShiftConfig(s)
	if err := r.db.Create(m).Error; err != nil {
		return err
	}
	s.ID = m.ID
	s.CreatedAt = m.CreatedAt
	s.UpdatedAt = m.UpdatedAt
	return nil
}

func (r *shiftConfigRepository) FindByID(id uint) (*entity.ShiftConfig, error) {
	var m models.ShiftConfig
	if err := r.db.Where("id = ?", id).First(&m).Error; err != nil {
		return nil, err
	}
	res := toDomainShiftConfig(&m)
	return &res, nil
}

func (r *shiftConfigRepository) FindByOutletID(outletID uint, activeOnly bool) ([]entity.ShiftConfig, error) {
	var list []models.ShiftConfig
	query := r.db.Order("sort_order ASC, start_time ASC")
	if outletID > 0 {
		query = query.Where("outlet_id = ?", outletID)
	}
	if activeOnly {
		query = query.Where("is_active = ?", true)
	}
	if err := query.Find(&list).Error; err != nil {
		return nil, err
	}
	result := make([]entity.ShiftConfig, len(list))
	for i := range list {
		result[i] = toDomainShiftConfig(&list[i])
	}
	return result, nil
}

func (r *shiftConfigRepository) Update(s *entity.ShiftConfig) error {
	m := toModelShiftConfig(s)
	return r.db.Model(&models.ShiftConfig{}).Where("id = ?", s.ID).Updates(map[string]interface{}{
		"name":             m.Name,
		"start_time":       m.StartTime,
		"end_time":         m.EndTime,
		"owner_pct":        m.OwnerPct,
		"barista_pool_pct": m.BaristaPoolPct,
		"is_active":        m.IsActive,
		"sort_order":       m.SortOrder,
		"updated_at":       m.UpdatedAt,
	}).Error
}

func (r *shiftConfigRepository) Delete(id uint) error {
	return r.db.Delete(&models.ShiftConfig{}, id).Error
}

func toDomainShiftConfig(m *models.ShiftConfig) entity.ShiftConfig {
	return entity.ShiftConfig{
		ID:             m.ID,
		OutletID:       m.OutletID,
		Name:           m.Name,
		StartTime:      m.StartTime,
		EndTime:        m.EndTime,
		OwnerPct:       m.OwnerPct,
		BaristaPoolPct: m.BaristaPoolPct,
		IsActive:       m.IsActive,
		SortOrder:      m.SortOrder,
		CreatedAt:      m.CreatedAt,
		UpdatedAt:      m.UpdatedAt,
	}
}

func toModelShiftConfig(s *entity.ShiftConfig) *models.ShiftConfig {
	return &models.ShiftConfig{
		ID:             s.ID,
		OutletID:       s.OutletID,
		Name:           s.Name,
		StartTime:      s.StartTime,
		EndTime:        s.EndTime,
		OwnerPct:       s.OwnerPct,
		BaristaPoolPct: s.BaristaPoolPct,
		IsActive:       s.IsActive,
		SortOrder:      s.SortOrder,
		CreatedAt:      s.CreatedAt,
		UpdatedAt:      s.UpdatedAt,
	}
}
