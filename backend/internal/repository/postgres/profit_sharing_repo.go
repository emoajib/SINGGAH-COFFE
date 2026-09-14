package postgres

import (
	"time"

	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/models"

	"gorm.io/gorm"
)

type profitSharingPeriodRepository struct {
	db *gorm.DB
}

func NewProfitSharingPeriodRepository(db *gorm.DB) *profitSharingPeriodRepository {
	return &profitSharingPeriodRepository{db: db}
}

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (r *profitSharingPeriodRepository) FindByID(id uint) (*entity.ProfitSharingPeriod, error) {
	var m models.ProfitSharingPeriod
	if err := r.db.Preload("People").First(&m, id).Error; err != nil {
		return nil, err
	}
	return toDomainProfitSharing(&m), nil
}

func (r *profitSharingPeriodRepository) FindByIDForUpdate(id uint, tx *gorm.DB) (*entity.ProfitSharingPeriod, error) {
	var m models.ProfitSharingPeriod
	if err := tx.Set("gorm:query_option", "FOR UPDATE").Preload("People").First(&m, id).Error; err != nil {
		return nil, err
	}
	return toDomainProfitSharing(&m), nil
}

func (r *profitSharingPeriodRepository) FindAll(outletID ...uint) ([]entity.ProfitSharingPeriod, error) {
	var models []models.ProfitSharingPeriod
	tx := r.db.Preload("People").Order("period_start DESC")
	tx = scopeOutlet(tx, "profit_sharing_periods", outletID...)
	if err := tx.Find(&models).Error; err != nil {
		return nil, err
	}
	result := make([]entity.ProfitSharingPeriod, len(models))
	for i, m := range models {
		result[i] = *toDomainProfitSharing(&m)
	}
	return result, nil
}

func (r *profitSharingPeriodRepository) FindOverlappingPeriod(outletID uint, start, end time.Time, excludeID uint) (*entity.ProfitSharingPeriod, error) {
	var m models.ProfitSharingPeriod
	query := r.db.Where(
		"outlet_id = ? AND deleted_at IS NULL AND period_start <= ? AND period_end >= ?",
		outletID, end, start,
	)
	if excludeID > 0 {
		query = query.Where("id != ?", excludeID)
	}
	if err := query.First(&m).Error; err != nil {
		return nil, err
	}
	return toDomainProfitSharing(&m), nil
}

func (r *profitSharingPeriodRepository) Create(period *entity.ProfitSharingPeriod) error {
	m := &models.ProfitSharingPeriod{
		OutletID:          period.OutletID,
		PeriodStart:       period.PeriodStart,
		PeriodEnd:         period.PeriodEnd,
		BasisAmount:       period.BasisAmount,
		TotalExpenses:     period.TotalExpenses,
		TotalCogs:         period.TotalCogs,
		NetProfit:         period.NetProfit,
		Ratio:             period.Ratio,
		KeeperAmount:      period.KeeperAmount,
		OwnerAmount:       period.OwnerAmount,
		Status:            period.Status,
		PerProduct:        period.PerProduct,
		ExpensesBreakdown: period.ExpensesBreakdown,
		PaymentNote:       period.PaymentNote,
		TaxNote:           period.TaxNote,
		BasisType:         period.BasisType,
		OwnerPct:          period.OwnerPct,
	}
	if err := r.db.Create(m).Error; err != nil {
		return err
	}
	period.ID = m.ID
	return nil
}

func (r *profitSharingPeriodRepository) Update(period *entity.ProfitSharingPeriod) error {
	return r.db.Model(&models.ProfitSharingPeriod{}).Where("id = ?", period.ID).Updates(map[string]interface{}{
		"period_start":       period.PeriodStart,
		"period_end":         period.PeriodEnd,
		"basis_amount":       period.BasisAmount,
		"total_expenses":     period.TotalExpenses,
		"total_cogs":         period.TotalCogs,
		"net_profit":         period.NetProfit,
		"ratio":              period.Ratio,
		"keeper_amount":      period.KeeperAmount,
		"owner_amount":       period.OwnerAmount,
		"status":             period.Status,
		"per_product":        period.PerProduct,
		"expenses_breakdown": period.ExpensesBreakdown,
		"payment_note":       period.PaymentNote,
		"tax_note":           period.TaxNote,
		"basis_type":         period.BasisType,
		"owner_pct":          period.OwnerPct,
	}).Error
}

func (r *profitSharingPeriodRepository) Delete(id uint) error {
	return r.db.Delete(&models.ProfitSharingPeriod{}, id).Error
}

func (r *profitSharingPeriodRepository) GetTotalRevenue(start, end string, outletID ...uint) (float64, error) {
	ow, args := outletWhere("orders", outletID...)
	baseArgs := []interface{}{start, end, "Completed"}
	var total float64
	err := r.db.Model(&models.Order{}).
		Where("DATE(orders.created_at) BETWEEN DATE(?) AND DATE(?) AND orders.status = ?"+ow, append(baseArgs, args...)...).
		Select("COALESCE(SUM(orders.total_amount), 0)").
		Row().Scan(&total)
	return total, err
}

func (r *profitSharingPeriodRepository) GetTotalExpensesExcluding(start, end string, excluded []string, outletID ...uint) (float64, error) {
	ow, args := outletWhere("expenses", outletID...)
	query := "date BETWEEN ? AND ?" + ow
	params := []interface{}{start, end}
	params = append(params, args...)
	if len(excluded) > 0 {
		query += " AND category NOT IN ?"
		params = append(params, excluded)
	}
	var total float64
	err := r.db.Model(&models.Expense{}).Where(query, params...).
		Select("COALESCE(SUM(amount), 0)").Row().Scan(&total)
	return total, err
}

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (r *profitSharingPeriodRepository) GetExpensesList(start, end string, excluded []string, outletID ...uint) ([]entity.ExpenseBreakdown, error) {
	ow, args := outletWhere("expenses", outletID...)
	query := "date BETWEEN ? AND ?" + ow
	params := []interface{}{start, end}
	params = append(params, args...)
	if len(excluded) > 0 {
		query += " AND category NOT IN ?"
		params = append(params, excluded)
	}
	var list []models.Expense
	err := r.db.Where(query, params...).Order("date ASC, id ASC").Find(&list).Error
	if err != nil {
		return nil, err
	}
	results := make([]entity.ExpenseBreakdown, len(list))
	for i, item := range list {
		results[i] = entity.ExpenseBreakdown{
			ID:            item.ID,
			Date:          item.Date.Format("02/01/2006"),
			Title:         item.Title,
			Category:      item.Category,
			Amount:        item.Amount,
			PaymentMethod: item.PaymentMethod,
			Note:          item.Description,
		}
	}
	return results, nil
}

func (r *profitSharingPeriodRepository) GetProductSales(start, end string, outletID ...uint) ([]entity.ProductSalesVolume, error) {
	ow, args := outletWhere("o", outletID...)
	baseArgs := []interface{}{start, end}
	allArgs := append(baseArgs, args...)
	var results []entity.ProductSalesVolume
	err := r.db.Raw(`
		SELECT
			p.id as product_id,
			p.name,
			p.category,
			SUM(oi.quantity) as quantity,
			AVG(oi.price) as avg_price,
			AVG(oi.cost) as avg_cost,
			SUM(oi.price * oi.quantity) as revenue,
			SUM(oi.cost * oi.quantity) as total_cogs
		FROM order_items oi
		JOIN products p ON p.id = oi.product_id
		JOIN orders o ON o.id = oi.order_id
		WHERE DATE(o.created_at) BETWEEN DATE(?) AND DATE(?) AND o.status = 'Completed'`+ow+`
		GROUP BY p.id, p.name, p.category
		ORDER BY revenue DESC
	`, allArgs...).Scan(&results).Error
	return results, err
}

func toDomainProfitSharing(m *models.ProfitSharingPeriod) *entity.ProfitSharingPeriod {
	var people []entity.ProfitSharingPerson
	for _, p := range m.People {
		people = append(people, entity.ProfitSharingPerson{
			ID:             p.ID,
			PeriodID:       p.PeriodID,
			Name:           p.Name,
			Role:           p.Role,
			SharePct:       p.SharePct,
			Amount:         p.Amount,
			IsOnLeave:      p.IsOnLeave,
			LeaveReduction: p.LeaveReduction,
			LeaveDays:      p.LeaveDays,
			LeaveDates:     p.LeaveDates,
			CreatedAt:      p.CreatedAt,
			UpdatedAt:      p.UpdatedAt,
		})
	}

	return &entity.ProfitSharingPeriod{
		ID:                m.ID,
		OutletID:          m.OutletID,
		PeriodStart:       m.PeriodStart,
		PeriodEnd:         m.PeriodEnd,
		BasisAmount:       m.BasisAmount,
		TotalExpenses:     m.TotalExpenses,
		TotalCogs:         m.TotalCogs,
		NetProfit:         m.NetProfit,
		Ratio:             m.Ratio,
		KeeperAmount:      m.KeeperAmount,
		OwnerAmount:       m.OwnerAmount,
		Status:            m.Status,
		PerProduct:        m.PerProduct,
		ExpensesBreakdown: m.ExpensesBreakdown,
		PaymentNote:       m.PaymentNote,
		TaxNote:           m.TaxNote,
		BasisType:         m.BasisType,
		OwnerPct:          m.OwnerPct,
		People:            people,
		CreatedAt:         m.CreatedAt,
		UpdatedAt:         m.UpdatedAt,
	}
}
