package postgres

import (
	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/models"

	"gorm.io/gorm"
)

type accountRepository struct {
	db *gorm.DB
}

func NewAccountRepository(db *gorm.DB) *accountRepository {
	return &accountRepository{db: db}
}

func (r *accountRepository) FindAll(outletID ...uint) ([]entity.Account, error) {
	tx := r.db.Order("code asc")
	if len(outletID) > 0 && outletID[0] > 0 {
		tx = tx.Where("outlet_id = ? OR outlet_id = 0", outletID[0])
	}
	var ms []models.PSAKAccount
	if err := tx.Find(&ms).Error; err != nil {
		return nil, err
	}
	result := make([]entity.Account, len(ms))
	for i, m := range ms {
		result[i] = *toDomainAccount(&m)
	}
	return result, nil
}
func (r *accountRepository) FindByID(id uint) (*entity.Account, error) {
	var m models.PSAKAccount
	if err := r.db.First(&m, id).Error; err != nil {
		return nil, err
	}
	return toDomainAccount(&m), nil
}
func (r *accountRepository) FindByCode(code string, outletID ...uint) (*entity.Account, error) {
	tx := r.db.Where("code = ?", code)
	if len(outletID) > 0 && outletID[0] > 0 {
		tx = tx.Where("outlet_id = ? OR outlet_id = 0", outletID[0])
	}
	var m models.PSAKAccount
	if err := tx.First(&m).Error; err != nil {
		return nil, err
	}
	return toDomainAccount(&m), nil
}
func (r *accountRepository) Create(account *entity.Account) error {
	m := toModelAccount(account)
	if err := r.db.Create(m).Error; err != nil {
		return err
	}
	account.ID = m.ID
	account.CreatedAt = m.CreatedAt
	account.UpdatedAt = m.UpdatedAt
	return nil
}
func (r *accountRepository) Update(account *entity.Account) error {
	return r.db.Model(&models.PSAKAccount{}).Where("id = ?", account.ID).Updates(map[string]interface{}{
		"code":        account.Code,
		"name":        account.Name,
		"type":        account.Type,
		"parent_id":   account.ParentID,
		"is_active":   account.IsActive,
		"description": account.Description,
		"outlet_id":   account.OutletID,
	}).Error
}
func (r *accountRepository) Delete(id uint) error {
	return r.db.Delete(&models.PSAKAccount{}, id).Error
}
func (r *accountRepository) CountByCode(code string, outletID ...uint) (int64, error) {
	tx := r.db.Model(&models.PSAKAccount{}).Where("code = ?", code)
	if len(outletID) > 0 && outletID[0] > 0 {
		tx = tx.Where("outlet_id = ? OR outlet_id = 0", outletID[0])
	}
	var count int64
	if err := tx.Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}

func toDomainAccount(m *models.PSAKAccount) *entity.Account {
	return &entity.Account{
		ID:          m.ID,
		Code:        m.Code,
		Name:        m.Name,
		Type:        m.Type,
		ParentID:    m.ParentID,
		IsActive:    m.IsActive,
		Description: m.Description,
		OutletID:    m.OutletID,
		CreatedAt:   m.CreatedAt,
		UpdatedAt:   m.UpdatedAt,
	}
}

func toModelAccount(e *entity.Account) *models.PSAKAccount {
	return &models.PSAKAccount{
		Code:        e.Code,
		Name:        e.Name,
		Type:        e.Type,
		ParentID:    e.ParentID,
		IsActive:    e.IsActive,
		Description: e.Description,
		OutletID:    e.OutletID,
	}
}
