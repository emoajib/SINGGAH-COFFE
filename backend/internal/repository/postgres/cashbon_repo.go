// Vetted by AI - Manual Review Required by Senior Engineer/Manager
package postgres

import (
	"time"

	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/models"
	"singgah-pos-backend/internal/repository"

	"gorm.io/gorm"
)

type baristaCashbonRepository struct {
	db *gorm.DB
}

func NewBaristaCashbonRepository(db *gorm.DB) repository.BaristaCashbonRepository {
	return &baristaCashbonRepository{db: db}
}

func (r *baristaCashbonRepository) Create(c *entity.BaristaCashbon) error {
	m := toModelCashbon(c)
	if err := r.db.Create(m).Error; err != nil {
		return err
	}
	c.ID = m.ID
	c.CreatedAt = m.CreatedAt
	c.UpdatedAt = m.UpdatedAt
	return nil
}

func (r *baristaCashbonRepository) FindByID(id uint, outletID uint) (*entity.BaristaCashbon, error) {
	var m models.BaristaCashbon
	query := r.db.Where("id = ?", id)
	if outletID > 0 {
		query = query.Where("outlet_id = ?", outletID)
	}
	if err := query.First(&m).Error; err != nil {
		return nil, err
	}
	res := toDomainCashbon(&m)
	return &res, nil
}

func (r *baristaCashbonRepository) FindByOutlet(outletID uint, status string) ([]entity.BaristaCashbon, error) {
	var list []models.BaristaCashbon
	query := r.db.Order("cashbon_date DESC")
	if outletID > 0 {
		query = query.Where("outlet_id = ?", outletID)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if err := query.Find(&list).Error; err != nil {
		return nil, err
	}
	result := make([]entity.BaristaCashbon, len(list))
	for i, item := range list {
		result[i] = toDomainCashbon(&item)
	}
	return result, nil
}

func (r *baristaCashbonRepository) FindByPeriodID(periodID uint, outletID uint) ([]entity.BaristaCashbon, error) {
	var list []models.BaristaCashbon
	query := r.db.Where("period_id = ?", periodID).Order("cashbon_date ASC")
	if outletID > 0 {
		query = query.Where("outlet_id = ?", outletID)
	}
	if err := query.Find(&list).Error; err != nil {
		return nil, err
	}
	result := make([]entity.BaristaCashbon, len(list))
	for i, item := range list {
		result[i] = toDomainCashbon(&item)
	}
	return result, nil
}

func (r *baristaCashbonRepository) FindPendingByDateRange(start, end string, outletID uint) ([]entity.BaristaCashbon, error) {
	var list []models.BaristaCashbon
	query := r.db.Where("status = ?", "pending").
		Where("cashbon_date BETWEEN ? AND ?", start, end).
		Order("cashbon_date ASC")
	if outletID > 0 {
		query = query.Where("outlet_id = ?", outletID)
	}
	if err := query.Find(&list).Error; err != nil {
		return nil, err
	}
	result := make([]entity.BaristaCashbon, len(list))
	for i, item := range list {
		result[i] = toDomainCashbon(&item)
	}
	return result, nil
}

func (r *baristaCashbonRepository) Update(c *entity.BaristaCashbon) error {
	m := toModelCashbon(c)
	return r.db.Model(&models.BaristaCashbon{}).
		Where("id = ? AND outlet_id = ?", c.ID, c.OutletID).
		Updates(map[string]interface{}{
			"barista_name":   m.BaristaName,
			"amount":         m.Amount,
			"cashbon_date":   m.CashbonDate,
			"payment_method": m.PaymentMethod,
			"reason":         m.Reason,
			"status":         m.Status,
			"period_id":      m.PeriodID,
			"person_id":      m.PersonID,
			"updated_at":     time.Now(),
		}).Error
}

func (r *baristaCashbonRepository) Delete(id uint, outletID uint) error {
	query := r.db.Where("id = ?", id)
	if outletID > 0 {
		query = query.Where("outlet_id = ?", outletID)
	}
	return query.Delete(&models.BaristaCashbon{}).Error
}

func (r *baristaCashbonRepository) MarkSettledByPeriodID(periodID uint, outletID uint, txList ...*gorm.DB) error {
	db := r.db
	if len(txList) > 0 && txList[0] != nil {
		db = txList[0]
	}
	query := db.Model(&models.BaristaCashbon{}).Where("period_id = ?", periodID)
	if outletID > 0 {
		query = query.Where("outlet_id = ?", outletID)
	}
	return query.Updates(map[string]interface{}{
		"status":     "settled",
		"updated_at": time.Now(),
	}).Error
}

func toDomainCashbon(m *models.BaristaCashbon) entity.BaristaCashbon {
	return entity.BaristaCashbon{
		ID:            m.ID,
		OutletID:      m.OutletID,
		PersonID:      m.PersonID,
		BaristaName:   m.BaristaName,
		Amount:        m.Amount,
		CashbonDate:   m.CashbonDate,
		PaymentMethod: m.PaymentMethod,
		Reason:        m.Reason,
		Status:        m.Status,
		PeriodID:      m.PeriodID,
		CreatedAt:     m.CreatedAt,
		UpdatedAt:     m.UpdatedAt,
	}
}

func toModelCashbon(e *entity.BaristaCashbon) *models.BaristaCashbon {
	return &models.BaristaCashbon{
		ID:            e.ID,
		OutletID:      e.OutletID,
		PersonID:      e.PersonID,
		BaristaName:   e.BaristaName,
		Amount:        e.Amount,
		CashbonDate:   e.CashbonDate,
		PaymentMethod: e.PaymentMethod,
		Reason:        e.Reason,
		Status:        e.Status,
		PeriodID:      e.PeriodID,
		CreatedAt:     e.CreatedAt,
		UpdatedAt:     e.UpdatedAt,
	}
}
