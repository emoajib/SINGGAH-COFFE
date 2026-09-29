package postgres

import (
	"strings"

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

func (r *expenseRepository) FindAllRange(start, end, category string, outletID ...uint) ([]entity.Expense, error) {
	tx := r.db.Order("date desc, id desc")
	if start != "" {
		if len(start) == 10 {
			tx = tx.Where("DATE(date) >= ?", start)
		} else {
			tx = tx.Where("date >= ?", start)
		}
	}
	if end != "" {
		if len(end) == 10 {
			tx = tx.Where("DATE(date) <= ?", end)
		} else {
			tx = tx.Where("date <= ?", end)
		}
	}
	if category != "" {
		aliases := getCategoryAliases(category)
		if len(aliases) > 1 {
			tx = tx.Where("category IN ?", aliases)
		} else {
			tx = tx.Where("category = ?", category)
		}
	}
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
	method := expense.PaymentMethod
	if method == "" {
		method = "Cash"
	}
	m := &models.Expense{
		Title:         expense.Title,
		Amount:        expense.Amount,
		Category:      expense.Category,
		CostType:      expense.CostType,
		PaymentMethod: method,
		Date:          expense.Date,
		Description:   expense.Description,
		Notes:         expense.Notes,
		OutletID:      expense.OutletID,
	}
	if err := r.db.Create(m).Error; err != nil {
		return err
	}
	expense.ID = m.ID
	expense.PaymentMethod = method
	return nil
}

func (r *expenseRepository) Update(expense *entity.Expense) error {
	method := expense.PaymentMethod
	if method == "" {
		method = "Cash"
	}
	return r.db.Model(&models.Expense{}).Where("id = ?", expense.ID).Updates(map[string]interface{}{
		"title":          expense.Title,
		"amount":         expense.Amount,
		"category":       expense.Category,
		"cost_type":      expense.CostType,
		"payment_method": method,
		"date":           expense.Date,
		"description":    expense.Description,
		"notes":          expense.Notes,
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

func (r *expenseRepository) GetTotalSince(since string, outletID ...uint) (float64, error) {
	tx := r.db.Model(&models.Expense{}).Where("date >= ?", since).Select("COALESCE(SUM(amount), 0)")
	tx = scopeOutlet(tx, "expenses", outletID...)
	var total float64
	err := tx.Row().Scan(&total)
	return total, err
}

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (r *expenseRepository) GetBreakdownRange(start, end string, outletID ...uint) ([]entity.ExpenseDetail, error) {
	tx := r.db.Model(&models.Expense{}).
		Where("DATE(date) BETWEEN DATE(?) AND DATE(?)", start, end)
	tx = scopeOutlet(tx, "expenses", outletID...)
	var results []entity.ExpenseDetail
	err := tx.Select("category, SUM(amount) as amount").
		Group("category").
		Scan(&results).Error
	return results, err
}

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (r *expenseRepository) GetTotalByCostType(costType, start, end string, outletID ...uint) (float64, error) {
	tx := r.db.Model(&models.Expense{}).
		Where("DATE(date) BETWEEN DATE(?) AND DATE(?) AND cost_type = ?", start, end, costType)
	tx = scopeOutlet(tx, "expenses", outletID...)
	var total float64
	err := tx.Select("COALESCE(SUM(amount), 0)").Row().Scan(&total)
	return total, err
}

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (r *expenseRepository) GetTotalVariableExcludingCategories(start, end string, excludeCategories []string, outletID ...uint) (float64, error) {
	tx := r.db.Model(&models.Expense{}).
		Where("DATE(date) BETWEEN DATE(?) AND DATE(?) AND cost_type = 'variable'", start, end)
	if len(excludeCategories) > 0 {
		tx = tx.Where("category NOT IN (?)", excludeCategories)
	}
	tx = scopeOutlet(tx, "expenses", outletID...)
	var total float64
	err := tx.Select("COALESCE(SUM(amount), 0)").Row().Scan(&total)
	return total, err
}

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (r *expenseRepository) GetFixedCostBreakdown(start, end string, outletID ...uint) ([]entity.FixedCostItem, error) {
	tx := r.db.Model(&models.Expense{}).
		Where("DATE(date) BETWEEN DATE(?) AND DATE(?) AND cost_type = ?", start, end, "fixed")
	tx = scopeOutlet(tx, "expenses", outletID...)
	var results []entity.FixedCostItem
	err := tx.Select("title as name, SUM(amount) as amount").
		Group("title").
		Scan(&results).Error
	return results, err
}

func toDomainExpense(m *models.Expense) *entity.Expense {
	method := m.PaymentMethod
	if method == "" {
		method = "Cash"
	}
	return &entity.Expense{
		ID:            m.ID,
		Title:         m.Title,
		Amount:        m.Amount,
		Category:      m.Category,
		CostType:      m.CostType,
		PaymentMethod: method,
		Date:          m.Date,
		Description:   m.Description,
		Notes:         m.Notes,
		OutletID:      m.OutletID,
		CreatedAt:     m.CreatedAt,
	}
}

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func getCategoryAliases(cat string) []string {
	clean := strings.ToLower(strings.TrimSpace(cat))
	switch clean {
	case "operasional", "operational", "biaya tetap", "fixed", "beban operasional", "operasional rutin":
		return []string{"Operasional", "Operational", "operasional", "operational", "Biaya Tetap", "biaya tetap", "Fixed", "fixed"}
	case "bahan baku", "bahan baku (hpp)", "hpp", "cogs", "raw material":
		return []string{"Bahan Baku (HPP)", "Bahan Baku", "bahan baku", "bahan baku (hpp)", "hpp", "HPP", "cogs", "COGS"}
	case "gaji & upah", "gaji", "salary", "upah", "honor", "bagi hasil":
		return []string{"Gaji & Upah", "Salary", "Gaji", "salary", "gaji", "upah", "Upah", "honor", "Honor"}
	case "pemeliharaan & servis", "pemeliharaan", "maintenance", "servis", "perawatan":
		return []string{"Pemeliharaan & Servis", "Maintenance", "Pemeliharaan", "maintenance", "servis", "Servis", "perawatan"}
	case "pemasaran / marketing", "pemasaran", "marketing", "promosi", "iklan":
		return []string{"Pemasaran / Marketing", "Marketing", "Pemasaran", "marketing", "promosi", "Promosi"}
	case "lainnya", "other", "misc", "":
		return []string{"Lainnya", "Other", "lainnya", "other", "misc", "Misc", ""}
	default:
		return []string{cat}
	}
}
