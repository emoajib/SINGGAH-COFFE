package postgres

import (
	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/models"

	"gorm.io/gorm"
)

type cashRegisterRepository struct {
	db *gorm.DB
}

func NewCashRegisterRepository(db *gorm.DB) *cashRegisterRepository {
	return &cashRegisterRepository{db: db}
}

func (r *cashRegisterRepository) FindByID(id uint) (*entity.CashRegister, error) {
	var m models.CashRegister
	err := r.db.First(&m, id).Error
	if err != nil {
		return nil, err
	}
	return toDomainCashRegister(&m), nil
}

func (r *cashRegisterRepository) FindOpenByUserID(userID uint) (*entity.CashRegister, error) {
	var m models.CashRegister
	err := r.db.Where("user_id = ? AND status = 'open'", userID).Order("opened_at desc").First(&m).Error
	if err != nil {
		return nil, err
	}
	return toDomainCashRegister(&m), nil
}

func (r *cashRegisterRepository) FindAll(outletID uint, cashierName string, dateFrom string, dateTo string, status string, limit int, offset int) ([]entity.CashRegister, error) {
	tx := r.db.Order("opened_at desc").Limit(limit).Offset(offset)
	if outletID > 0 {
		tx = tx.Where("outlet_id = ?", outletID)
	}
	if cashierName != "" {
		tx = tx.Where("cashier_name LIKE ?", "%"+cashierName+"%")
	}
	if dateFrom != "" {
		tx = tx.Where("DATE(opened_at) >= ?", dateFrom)
	}
	if dateTo != "" {
		tx = tx.Where("DATE(opened_at) <= ?", dateTo)
	}
	if status != "" {
		tx = tx.Where("status = ?", status)
	}
	var ms []models.CashRegister
	err := tx.Find(&ms).Error
	if err != nil {
		return nil, err
	}
	result := make([]entity.CashRegister, len(ms))
	for i, m := range ms {
		result[i] = *toDomainCashRegister(&m)
	}
	return result, nil
}

func (r *cashRegisterRepository) CountOpenByOutlet(outletID uint) (int64, error) {
	var count int64
	err := r.db.Model(&models.CashRegister{}).Where("outlet_id = ? AND status = 'open'", outletID).Count(&count).Error
	return count, err
}

func (r *cashRegisterRepository) Create(cashRegister *entity.CashRegister) error {
	m := &models.CashRegister{
		UserID:        cashRegister.UserID,
		CashierName:   cashRegister.CashierName,
		OutletID:      cashRegister.OutletID,
		OpeningAmount: cashRegister.OpeningAmount,
		Notes:         cashRegister.Notes,
		OpenedAt:      cashRegister.OpenedAt,
		Status:        cashRegister.Status,
	}
	if err := r.db.Create(m).Error; err != nil {
		return err
	}
	cashRegister.ID = m.ID
	return nil
}

func (r *cashRegisterRepository) Update(cashRegister *entity.CashRegister) error {
	return r.db.Model(&models.CashRegister{}).Where("id = ?", cashRegister.ID).Updates(map[string]interface{}{
		"notes": cashRegister.Notes,
	}).Error
}

func (r *cashRegisterRepository) Delete(id uint) error {
	return r.db.Where("id = ?", id).Delete(&models.CashRegister{}).Error
}

func toDomainCashRegister(m *models.CashRegister) *entity.CashRegister {
	return &entity.CashRegister{
		ID:            m.ID,
		UserID:        m.UserID,
		CashierName:   m.CashierName,
		OutletID:      m.OutletID,
		OpeningAmount: m.OpeningAmount,
		Notes:         m.Notes,
		OpenedAt:      m.OpenedAt,
		ClosedAt:      m.ClosedAt,
		ClosingAmount: m.ClosingAmount,
		Status:        m.Status,
	}
}