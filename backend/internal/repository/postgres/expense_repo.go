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
	if err := r.db.Order("date desc").Find(&ms).Error; err != nil {
		return nil, err
	}
	result := make([]entity.Expense, len(ms))
	for i, m := range ms {
		result[i] = entity.Expense{
			ID:          m.ID,
			Title:       m.Title,
			Amount:      m.Amount,
			Category:    m.Category,
			Date:        m.Date,
			Description: m.Description,
			Notes:       m.Notes,
			CreatedAt:   m.CreatedAt,
		}
	}
	return result, nil
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
	return r.db.Create(m).Error
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
