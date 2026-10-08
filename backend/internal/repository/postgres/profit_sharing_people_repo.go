package postgres

import (
	"encoding/json"
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

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (r *profitSharingPeopleRepository) WithTx(tx *gorm.DB) repository.ProfitSharingPersonRepository {
	return &profitSharingPeopleRepository{db: tx}
}

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (r *profitSharingPeopleRepository) DeleteByID(id uint) error {
	return r.db.Delete(&models.ProfitSharingPerson{}, id).Error
}

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (r *profitSharingPeopleRepository) UpdateLeaveStatus(id uint, isOnLeave bool, leaveDays int, leaveDates string, reduction float64) error {
	return r.db.Model(&models.ProfitSharingPerson{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"is_on_leave":       isOnLeave,
			"leave_days":        leaveDays,
			"leave_dates":       leaveDates,
			"leave_reduction":   reduction,
			"updated_at":        time.Now(),
		}).Error
}

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (r *profitSharingPeopleRepository) UpdateAttendance(id uint, attendance string) error {
	return r.db.Model(&models.ProfitSharingPerson{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"attendance": attendance,
			"updated_at": time.Now(),
		}).Error
}

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func toDomainPerson(m *models.ProfitSharingPerson) entity.ProfitSharingPerson {
	var shiftIDs []uint
	var shiftNames []string
	var shiftPoolPcts []float64

	if m.ShiftIDs != "" {
		_ = json.Unmarshal([]byte(m.ShiftIDs), &shiftIDs)
	}
	if m.ShiftNames != "" {
		_ = json.Unmarshal([]byte(m.ShiftNames), &shiftNames)
	}
	if m.ShiftPoolPcts != "" {
		_ = json.Unmarshal([]byte(m.ShiftPoolPcts), &shiftPoolPcts)
	}

	return entity.ProfitSharingPerson{
		ID:               m.ID,
		PeriodID:         m.PeriodID,
		Name:             m.Name,
		Role:             m.Role,
		SharePct:         m.SharePct,
		GrossAmount:      m.GrossAmount,
		LeaveReduction:   m.LeaveReduction,
		CashbonReduction: m.CashbonReduction,
		Amount:           m.Amount,
		IsOnLeave:        m.IsOnLeave,
		LeaveDays:        m.LeaveDays,
		LeaveDates:       m.LeaveDates,
		Attendance:       m.Attendance,
		ShiftIDs:         shiftIDs,
		ShiftNames:       shiftNames,
		ShiftPoolPcts:    shiftPoolPcts,
		CreatedAt:        m.CreatedAt,
		UpdatedAt:        m.UpdatedAt,
	}
}

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func toModelPerson(p entity.ProfitSharingPerson) *models.ProfitSharingPerson {
	shiftIDsJSON, _ := json.Marshal(p.ShiftIDs)
	shiftNamesJSON, _ := json.Marshal(p.ShiftNames)
	shiftPoolPctsJSON, _ := json.Marshal(p.ShiftPoolPcts)

	return &models.ProfitSharingPerson{
		ID:               p.ID,
		PeriodID:         p.PeriodID,
		Name:             p.Name,
		Role:             p.Role,
		SharePct:         p.SharePct,
		GrossAmount:      p.GrossAmount,
		LeaveReduction:   p.LeaveReduction,
		CashbonReduction: p.CashbonReduction,
		Amount:           p.Amount,
		IsOnLeave:        p.IsOnLeave,
		LeaveDays:        p.LeaveDays,
		LeaveDates:       p.LeaveDates,
		Attendance:       p.Attendance,
		ShiftIDs:         string(shiftIDsJSON),
		ShiftNames:       string(shiftNamesJSON),
		ShiftPoolPcts:    string(shiftPoolPctsJSON),
		CreatedAt:        p.CreatedAt,
		UpdatedAt:        p.UpdatedAt,
	}
}
