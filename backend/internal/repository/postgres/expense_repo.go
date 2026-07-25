package postgres

import (
	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/models"

	"gorm.io/gorm"
)

type expenseRepository struct {
	db *gorm.DB
}

func NewExpenseRepository(db *gorm.DB) *expenseRepository {
	return &expenseRepository{db: db}
}

func (r *expenseRepository) FindAll(outletID ...uint) ([]entity.Expense, error) {
	tx := r.db.Order("date desc, id desc")
	tx = scopeOutlet(tx, "expenses", outletID...)
	var ms []models.Expense
	err := tx.Find(&ms).Error
	if err != nil {
		return nil, err
	}
	result := make([]entity.Expense, len(ms))
	for i, m := range ms {
		result[i] = *toDomainExpense(&m)
	}
	return result, nil
}

func (r *expenseRepository) FindByID(id uint) (*entity.Expense, error) {
	var m models.Expense
	if err := r.db.First(&m, id).Error; err != nil {
		return nil, err
	}
	return toDomainExpense(&m), nil
}

func (r *expenseRepository) Create(expense *entity.Expense) error {
	m := &models.Expense{
		Title:       expense.Title,
		Amount:      expense.Amount,
		Category:    expense.Category,
		CostType:    expense.CostType,
		Date:        expense.Date,
		Description: expense.Description,
		Notes:       expense.Notes,
		OutletID:    expense.OutletID,
	}
	if err := r.db.Create(m).Error; err != nil {
		return err
	}
	expense.ID = m.ID
	return nil
}

func (r *expenseRepository) Update(expense *entity.Expense) error {
	return r.db.Model(&models.Expense{}).Where("id = ?", expense.ID).Updates(map[string]interface{}{
		"title":       expense.Title,
		"amount":      expense.Amount,
		"category":    expense.Category,
		"cost_type":   expense.CostType,
		"date":        expense.Date,
		"description": expense.Description,
		"notes":       expense.Notes,
	}).Error
}

func (r *expenseRepository) Delete(id uint) error {
	return r.db.Delete(&models.Expense{}, id).Error
}

func (r *expenseRepository) GetTotal(outletID ...uint) (float64, error) {
	tx := r.db.Model(&models.Expense{}).Select("COALESCE(SUM(amount), 0)")
	tx = scopeOutlet(tx, "expenses", outletID...)
	var total float64
	err := tx.Row().Scan(&total)
	return total, err
}

func (r *expenseRepository) GetBreakdownRange(start, end string, outletID ...uint) ([]entity.ExpenseDetail, error) {
	tx := r.db.Model(&models.Expense{}).
		Where("date BETWEEN ? AND ?", start, end)
	tx = scopeOutlet(tx, "expenses", outletID...)
	var results []entity.ExpenseDetail
	err := tx.Select("category, SUM(amount) as amount").
		Group("category").
		Scan(&results).Error
	return results, err
}

// ⚠️ Vetted by SOSIOMEN - Manual Review Required by Senior Engineer/Manager
func (r *expenseRepository) GetTotalByCostType(costType, start, end string, outletID ...uint) (float64, error) {
	tx := r.db.Model(&models.Expense{}).
		Where("date BETWEEN ? AND ? AND cost_type = ?", start, end, costType)
	tx = scopeOutlet(tx, "expenses", outletID...)
	var total float64
	err := tx.Select("COALESCE(SUM(amount), 0)").Row().Scan(&total)
	return total, err
}

// ⚠️ Vetted by SOSIOMEN - Manual Review Required by Senior Engineer/Manager
func (r *expenseRepository) GetFixedCostBreakdown(start, end string, outletID ...uint) ([]entity.FixedCostItem, error) {
	tx := r.db.Model(&models.Expense{}).
		Where("date BETWEEN ? AND ? AND cost_type = ?", start, end, "fixed")
	tx = scopeOutlet(tx, "expenses", outletID...)
	var results []entity.FixedCostItem
	err := tx.Select("title as name, SUM(amount) as amount").
		Group("title").
		Scan(&results).Error
	return results, err
}

func toDomainExpense(m *models.Expense) *entity.Expense {
	return &entity.Expense{
		ID:          m.ID,
		Title:       m.Title,
		Amount:      m.Amount,
		Category:    m.Category,
		CostType:    m.CostType,
		Date:        m.Date,
		Description: m.Description,
		Notes:       m.Notes,
		OutletID:    m.OutletID,
		CreatedAt:   m.CreatedAt,
	}
}
