package postgres

import (
	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/models"
	"singgah-pos-backend/internal/repository"
	"time"

	"gorm.io/gorm"
)

type profitSharingPeopleRepository struct {
	db *gorm.DB
}

func NewProfitSharingPeopleRepository(db *gorm.DB) repository.ProfitSharingPersonRepository {
	return &profitSharingPeopleRepository{db: db}
}

func (r *profitSharingPeopleRepository) GetByPeriodID(periodID uint) ([]entity.ProfitSharingPerson, error) {
	var models []models.ProfitSharingPerson
	if err := r.db.Where("period_id = ?", periodID).Order("id ASC").Find(&models).Error; err != nil {
		return nil, err
	}
	result := make([]entity.ProfitSharingPerson, len(models))
	for i, m := range models {
		result[i] = toDomainPerson(&m)
	}
	return result, nil
}

func (r *profitSharingPeopleRepository) GetByID(id uint) (*entity.ProfitSharingPerson, error) {
	var m models.ProfitSharingPerson
	if err := r.db.Where("id = ?", id).First(&m).Error; err != nil {
		return nil, err
	}
	result := toDomainPerson(&m)
	return &result, nil
}

func (r *profitSharingPeopleRepository) BulkUpsert(people []entity.ProfitSharingPerson) error {
	for _, p := range people {
		m := toModelPerson(p)
		if m.ID > 0 {
			if err := r.db.Save(m).Error; err != nil {
				return err
			}
		} else {
			if err := r.db.Create(m).Error; err != nil {
				return err
			}
		}
	}
	return nil
}

func (r *profitSharingPeopleRepository) DeleteByPeriodID(periodID uint) error {
	return r.db.Where("period_id = ?", periodID).Delete(&models.ProfitSharingPerson{}).Error
}

func (r *profitSharingPeopleRepository) UpdateLeaveStatus(id uint, isOnLeave bool, reduction float64) error {
	return r.db.Model(&models.ProfitSharingPerson{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"is_on_leave":       isOnLeave,
			"leave_reduction":   reduction,
			"updated_at":        time.Now(),
		}).Error
}

func toDomainPerson(m *models.ProfitSharingPerson) entity.ProfitSharingPerson {
	return entity.ProfitSharingPerson{
		ID:             m.ID,
		PeriodID:       m.PeriodID,
		Name:           m.Name,
		Role:           m.Role,
		SharePct:       m.SharePct,
		Amount:         m.Amount,
		IsOnLeave:      m.IsOnLeave,
		LeaveReduction: m.LeaveReduction,
		CreatedAt:      m.CreatedAt,
		UpdatedAt:      m.UpdatedAt,
	}
}

func toModelPerson(p entity.ProfitSharingPerson) *models.ProfitSharingPerson {
	return &models.ProfitSharingPerson{
		ID:             p.ID,
		PeriodID:       p.PeriodID,
		Name:           p.Name,
		Role:           p.Role,
		SharePct:       p.SharePct,
		Amount:         p.Amount,
		IsOnLeave:      p.IsOnLeave,
		LeaveReduction: p.LeaveReduction,
		CreatedAt:      p.CreatedAt,
		UpdatedAt:      p.UpdatedAt,
	}
}
