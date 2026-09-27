package postgres

import (
	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/models"
	"singgah-pos-backend/internal/repository"

	"gorm.io/gorm"
)

// baristaRepository implements repository.BaristaRepository
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
type baristaRepository struct {
	db *gorm.DB
}

func NewBaristaRepository(db *gorm.DB) repository.BaristaRepository {
	return &baristaRepository{db: db}
}

func (r *baristaRepository) Create(b *entity.Barista) error {
	m := toModelBarista(b)
	if err := r.db.Create(m).Error; err != nil {
		return err
	}
	b.ID = m.ID
	b.CreatedAt = m.CreatedAt
	b.UpdatedAt = m.UpdatedAt
	return nil
}

func (r *baristaRepository) FindByID(id uint, outletID uint) (*entity.Barista, error) {
	var m models.Barista
	query := r.db.Where("id = ?", id)
	if outletID > 0 {
		query = query.Where("outlet_id = ?", outletID)
	}
	if err := query.First(&m).Error; err != nil {
		return nil, err
	}
	res := toDomainBarista(&m)
	return &res, nil
}

func (r *baristaRepository) FindByOutlet(outletID uint, status string) ([]entity.Barista, error) {
	var list []models.Barista
	query := r.db.Order("name ASC")
	if outletID > 0 {
		query = query.Where("outlet_id = ?", outletID)
	}
	if status != "" && status != "all" {
		query = query.Where("status = ?", status)
	}
	if err := query.Find(&list).Error; err != nil {
		return nil, err
	}
	result := make([]entity.Barista, len(list))
	for i := range list {
		result[i] = toDomainBarista(&list[i])
	}
	return result, nil
}

func (r *baristaRepository) Update(b *entity.Barista) error {
	m := toModelBarista(b)
	return r.db.Model(&models.Barista{}).
		Where("id = ? AND outlet_id = ?", b.ID, b.OutletID).
		Updates(map[string]interface{}{
			"name":              m.Name,
			"phone":             m.Phone,
			"default_share_pct": m.DefaultSharePct,
			"bank_account":     m.BankAccount,
			"status":           m.Status,
			"notes":            m.Notes,
		}).Error
}

func (r *baristaRepository) Delete(id uint, outletID uint) error {
	query := r.db.Where("id = ?", id)
	if outletID > 0 {
		query = query.Where("outlet_id = ?", outletID)
	}
	return query.Delete(&models.Barista{}).Error
}

func toDomainBarista(m *models.Barista) entity.Barista {
	return entity.Barista{
		ID:              m.ID,
		OutletID:        m.OutletID,
		Name:            m.Name,
		Phone:           m.Phone,
		DefaultSharePct: m.DefaultSharePct,
		BankAccount:     m.BankAccount,
		Status:          m.Status,
		Notes:           m.Notes,
		CreatedAt:       m.CreatedAt,
		UpdatedAt:       m.UpdatedAt,
	}
}

func toModelBarista(e *entity.Barista) *models.Barista {
	return &models.Barista{
		ID:              e.ID,
		OutletID:        e.OutletID,
		Name:            e.Name,
		Phone:           e.Phone,
		DefaultSharePct: e.DefaultSharePct,
		BankAccount:     e.BankAccount,
		Status:          e.Status,
		Notes:           e.Notes,
	}
}
