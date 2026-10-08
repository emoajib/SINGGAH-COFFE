package postgres

import (
	"encoding/json"
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
		PoolPct:           period.PoolPct,
		RatioEffectiveDate: period.RatioEffectiveDate,
		RatioLockedAt:     period.RatioLockedAt,
		RoundingRemainder: period.RoundingRemainder,
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
		"pool_pct":           period.PoolPct,
		"ratio_effective_date": period.RatioEffectiveDate,
		"ratio_locked_at":    period.RatioLockedAt,
		"rounding_remainder": period.RoundingRemainder,
	}).Error
}

func (r *profitSharingPeriodRepository) Delete(id uint) error {
	return r.db.Delete(&models.ProfitSharingPeriod{}, id).Error
}

// GetTotalRevenue menghitung pendapatan murni menu: SUM(order_items.price * qty)
// untuk order Completed. BUKAN SUM(orders.total_amount) yang sudah mencakup
// service charge + pajak (order_usecase.go:203-205). B1: revenue pre-tax/service.
func (r *profitSharingPeriodRepository) GetTotalRevenue(start, end string, outletID ...uint) (float64, error) {
	ow, args := outletWhere("orders", outletID...)
	baseArgs := []interface{}{start, end, "Completed"}
	var total float64
	err := r.db.Model(&models.OrderItem{}).
		Joins("JOIN orders ON orders.id = order_items.order_id").
		Where("DATE(COALESCE(orders.order_time, orders.created_at)) BETWEEN DATE(?) AND DATE(?) AND orders.status = ?"+ow, append(baseArgs, args...)...).
		Select("COALESCE(SUM(order_items.price * order_items.quantity), 0)").
		Row().Scan(&total)
	return total, err
}

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
// GetShiftRevenue seperti GetTotalRevenue tetapi dibatasi jam shift
// (mendukung shift overnight). B1: revenue pre-tax/service per shift.
func (r *profitSharingPeriodRepository) GetShiftRevenue(start, end, startTime, endTime string, outletID ...uint) (float64, error) {
	ow, args := outletWhere("orders", outletID...)
	var timeClause string
	var timeArgs []interface{}
	if startTime <= endTime {
		timeClause = " AND TIME(COALESCE(NULLIF(orders.order_time, '0001-01-01 00:00:00'), orders.created_at)) >= ? AND TIME(COALESCE(NULLIF(orders.order_time, '0001-01-01 00:00:00'), orders.created_at)) < ?"
		timeArgs = []interface{}{startTime, endTime}
	} else {
		// Overnight shift (e.g. 21:00 to 03:00)
		timeClause = " AND (TIME(COALESCE(NULLIF(orders.order_time, '0001-01-01 00:00:00'), orders.created_at)) >= ? OR TIME(COALESCE(NULLIF(orders.order_time, '0001-01-01 00:00:00'), orders.created_at)) < ?)"
		timeArgs = []interface{}{startTime, endTime}
	}

	whereQuery := "DATE(COALESCE(orders.order_time, orders.created_at)) BETWEEN DATE(?) AND DATE(?) AND orders.status = ?" + timeClause + ow
	allArgs := []interface{}{start, end, "Completed"}
	allArgs = append(allArgs, timeArgs...)
	allArgs = append(allArgs, args...)

	var total float64
	err := r.db.Model(&models.OrderItem{}).
		Joins("JOIN orders ON orders.id = order_items.order_id").
		Where(whereQuery, allArgs...).
		Select("COALESCE(SUM(order_items.price * order_items.quantity), 0)").
		Row().Scan(&total)
	return total, err
}

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (r *profitSharingPeriodRepository) GetTotalExpensesExcluding(start, end string, excluded []string, outletID ...uint) (float64, error) {
	ow, args := outletWhere("expenses", outletID...)
	query := "DATE(date) BETWEEN DATE(?) AND DATE(?)" + ow
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
	query := "DATE(date) BETWEEN DATE(?) AND DATE(?)" + ow
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

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (r *profitSharingPeriodRepository) GetShiftProductSales(start, end, startTime, endTime string, outletID ...uint) ([]entity.ProductSalesVolume, error) {
	ow, args := outletWhere("o", outletID...)
	var timeClause string
	var timeArgs []interface{}
	if startTime <= endTime {
		timeClause = " AND TIME(COALESCE(NULLIF(o.order_time, '0001-01-01 00:00:00'), o.created_at)) >= ? AND TIME(COALESCE(NULLIF(o.order_time, '0001-01-01 00:00:00'), o.created_at)) < ?"
		timeArgs = []interface{}{startTime, endTime}
	} else {
		// Overnight shift
		timeClause = " AND (TIME(COALESCE(NULLIF(o.order_time, '0001-01-01 00:00:00'), o.created_at)) >= ? OR TIME(COALESCE(NULLIF(o.order_time, '0001-01-01 00:00:00'), o.created_at)) < ?)"
		timeArgs = []interface{}{startTime, endTime}
	}

	baseArgs := []interface{}{start, end}
	baseArgs = append(baseArgs, timeArgs...)
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
		WHERE DATE(o.created_at) BETWEEN DATE(?) AND DATE(?) AND o.status = 'Completed'`+timeClause+ow+`
		GROUP BY p.id, p.name, p.category
		ORDER BY revenue DESC
	`, allArgs...).Scan(&results).Error
	return results, err
}

func toDomainProfitSharing(m *models.ProfitSharingPeriod) *entity.ProfitSharingPeriod {
	var people []entity.ProfitSharingPerson
	for _, p := range m.People {
		var shiftIDs []uint
		var shiftNames []string
		var shiftPoolPcts []float64

		if p.ShiftIDs != "" {
			_ = json.Unmarshal([]byte(p.ShiftIDs), &shiftIDs)
		}
		if p.ShiftNames != "" {
			_ = json.Unmarshal([]byte(p.ShiftNames), &shiftNames)
		}
		if p.ShiftPoolPcts != "" {
			_ = json.Unmarshal([]byte(p.ShiftPoolPcts), &shiftPoolPcts)
		}

		people = append(people, entity.ProfitSharingPerson{
			ID:             p.ID,
			PeriodID:       p.PeriodID,
			Name:           p.Name,
			Role:           p.Role,
			SharePct:       p.SharePct,
			Amount:           p.Amount,
			GrossAmount:      p.GrossAmount,
			LeaveReduction:   p.LeaveReduction,
			CashbonReduction: p.CashbonReduction,
			IsOnLeave:        p.IsOnLeave,
			LeaveDays:        p.LeaveDays,
			LeaveDates:       p.LeaveDates,
			ShiftIDs:         shiftIDs,
			ShiftNames:       shiftNames,
			ShiftPoolPcts:    shiftPoolPcts,
			CreatedAt:        p.CreatedAt,
			UpdatedAt:        p.UpdatedAt,
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
		PoolPct:           m.PoolPct,
		RatioEffectiveDate: m.RatioEffectiveDate,
		RatioLockedAt:     m.RatioLockedAt,
		RoundingRemainder: m.RoundingRemainder,
		People:            people,
		CreatedAt:         m.CreatedAt,
		UpdatedAt:         m.UpdatedAt,
	}
}
