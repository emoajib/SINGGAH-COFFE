package postgres

import (
	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/models"

	"gorm.io/gorm"
)

type outletRepository struct {
	db *gorm.DB
}

func NewOutletRepository(db *gorm.DB) *outletRepository {
	return &outletRepository{db: db}
}

func (r *outletRepository) FindAll() ([]entity.Outlet, error) {
	var ms []models.Outlet
	if err := r.db.Find(&ms).Error; err != nil {
		return nil, err
	}
	result := make([]entity.Outlet, len(ms))
	for i, m := range ms {
		result[i] = *toDomainOutlet(&m)
	}
	return result, nil
}

func (r *outletRepository) FindByID(id uint) (*entity.Outlet, error) {
	var m models.Outlet
	if err := r.db.First(&m, id).Error; err != nil {
		return nil, err
	}
	return toDomainOutlet(&m), nil
}

func (r *outletRepository) Create(outlet *entity.Outlet) error {
	m := &models.Outlet{
		Name:    outlet.Name,
		Address: outlet.Address,
		Phone:   outlet.Phone,
		Code:    outlet.Code,
	}
	if err := r.db.Create(m).Error; err != nil {
		return err
	}
	outlet.ID = m.ID
	return nil
}

func (r *outletRepository) Update(outlet *entity.Outlet) error {
	return r.db.Model(&models.Outlet{}).Where("id = ?", outlet.ID).Updates(map[string]interface{}{
		"name":    outlet.Name,
		"address": outlet.Address,
		"phone":   outlet.Phone,
		"code":    outlet.Code,
	}).Error
}

func (r *outletRepository) Delete(id uint) error {
	return r.db.Delete(&models.Outlet{}, id).Error
}

func toDomainOutlet(m *models.Outlet) *entity.Outlet {
	return &entity.Outlet{
		ID:      m.ID,
		Name:    m.Name,
		Address: m.Address,
		Phone:   m.Phone,
		Code:    m.Code,
	}
}
