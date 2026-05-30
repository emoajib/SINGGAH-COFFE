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

func (r *expenseRepository) FindAll() ([]entity.Expense, error) {
	var ms []models.Expense
	err := r.db.Order("date desc, id desc").Find(&ms).Error
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
		Date:        expense.Date,
		Description: expense.Description,
		Notes:       expense.Notes,
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
		"date":        expense.Date,
		"description": expense.Description,
		"notes":       expense.Notes,
	}).Error
}

func (r *expenseRepository) Delete(id uint) error {
	return r.db.Delete(&models.Expense{}, id).Error
}

func (r *expenseRepository) GetTotal() (float64, error) {
	var total float64
	err := r.db.Model(&models.Expense{}).
		Select("COALESCE(SUM(amount), 0)").
		Row().Scan(&total)
	return total, err
}

func (r *expenseRepository) GetBreakdownRange(start, end string) ([]entity.ExpenseDetail, error) {
	var results []entity.ExpenseDetail
	err := r.db.Model(&models.Expense{}).
		Where("date BETWEEN ? AND ?", start, end).
		Select("category, SUM(amount) as amount").
		Group("category").
		Scan(&results).Error
	return results, err
}

func toDomainExpense(m *models.Expense) *entity.Expense {
	return &entity.Expense{
		ID:          m.ID,
		Title:       m.Title,
		Amount:      m.Amount,
		Category:    m.Category,
		Date:        m.Date,
		Description: m.Description,
		Notes:       m.Notes,
	}
}
