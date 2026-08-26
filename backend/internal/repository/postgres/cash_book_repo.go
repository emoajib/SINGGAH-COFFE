package postgres

import (
	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/models"

	"gorm.io/gorm"
)

type cashBookRepository struct {
	db *gorm.DB
}

func NewCashBookRepository(db *gorm.DB) *cashBookRepository {
	return &cashBookRepository{db: db}
}

func (r *cashBookRepository) FindAllRange(start, end, method, tipe string, outletID ...uint) ([]entity.CashBook, error) {
	tx := r.db.Order("date desc, id desc")
	if start != "" {
		tx = tx.Where("date >= ?", start)
	}
	if end != "" {
		tx = tx.Where("date <= ?", end)
	}
	if method != "" {
		tx = tx.Where("method = ?", method)
	}
	if tipe != "" {
		tx = tx.Where("type = ?", tipe)
	}
	tx = scopeOutlet(tx, "cash_books", outletID...)
	var ms []models.CashBook
	if err := tx.Find(&ms).Error; err != nil {
		return nil, err
	}
	result := make([]entity.CashBook, len(ms))
	for i, m := range ms {
		result[i] = *toDomainCashBook(&m)
	}
	return result, nil
}

func (r *cashBookRepository) FindByID(id uint) (*entity.CashBook, error) {
	var m models.CashBook
	if err := r.db.First(&m, id).Error; err != nil {
		return nil, err
	}
	return toDomainCashBook(&m), nil
}

func (r *cashBookRepository) Create(c *entity.CashBook) error {
	m := &models.CashBook{
		OutletID:    c.OutletID,
		Date:        c.Date,
		Method:      c.Method,
		Type:        c.Type,
		Amount:      c.Amount,
		Description: c.Description,
		Reference:   c.Reference,
		CreatedBy:   c.CreatedBy,
	}
	if err := r.db.Create(m).Error; err != nil {
		return err
	}
	c.ID = m.ID
	return nil
}

func (r *cashBookRepository) Update(c *entity.CashBook) error {
	return r.db.Model(&models.CashBook{}).Where("id = ?", c.ID).Updates(map[string]interface{}{
		"date":        c.Date,
		"method":      c.Method,
		"type":        c.Type,
		"amount":      c.Amount,
		"description": c.Description,
		"reference":   c.Reference,
	}).Error
}

func (r *cashBookRepository) Delete(id uint) error {
	return r.db.Delete(&models.CashBook{}, id).Error
}

func (r *cashBookRepository) GetTotalsSince(since string, outletID ...uint) (income float64, expense float64, err error) {
	tx := r.db.Model(&models.CashBook{}).Where("date >= ?", since)
	tx = scopeOutlet(tx, "cash_books", outletID...)
	var incomeTotal, expenseTotal float64
	if err = tx.Where("type = ?", "income").Select("COALESCE(SUM(amount), 0)").Row().Scan(&incomeTotal); err != nil {
		return 0, 0, err
	}
	tx2 := r.db.Model(&models.CashBook{}).Where("date >= ?", since)
	tx2 = scopeOutlet(tx2, "cash_books", outletID...)
	if err = tx2.Where("type = ?", "expense").Select("COALESCE(SUM(amount), 0)").Row().Scan(&expenseTotal); err != nil {
		return 0, 0, err
	}
	return incomeTotal, expenseTotal, nil
}

func toDomainCashBook(m *models.CashBook) *entity.CashBook {
	return &entity.CashBook{
		ID:          m.ID,
		OutletID:    m.OutletID,
		Date:        m.Date,
		Method:      m.Method,
		Type:        m.Type,
		Amount:      m.Amount,
		Description: m.Description,
		Reference:   m.Reference,
		CreatedBy:   m.CreatedBy,
		CreatedAt:   m.CreatedAt,
	}
}
