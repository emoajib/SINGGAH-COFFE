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

func (r *profitSharingPeriodRepository) FindByID(id uint) (*entity.ProfitSharingPeriod, error) {
	var m models.ProfitSharingPeriod
	if err := r.db.First(&m, id).Error; err != nil {
		return nil, err
	}
	return toDomainProfitSharing(&m), nil
}

func (r *profitSharingPeriodRepository) FindByIDForUpdate(id uint, tx *gorm.DB) (*entity.ProfitSharingPeriod, error) {
	var m models.ProfitSharingPeriod
	if err := tx.Set("gorm:query_option", "FOR UPDATE").First(&m, id).Error; err != nil {
		return nil, err
	}
	return toDomainProfitSharing(&m), nil
}

func (r *profitSharingPeriodRepository) FindAll(outletID ...uint) ([]entity.ProfitSharingPeriod, error) {
	var models []models.ProfitSharingPeriod
	tx := r.db.Order("period_start DESC")
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
		OutletID:      period.OutletID,
		PeriodStart:   period.PeriodStart,
		PeriodEnd:     period.PeriodEnd,
		BasisAmount:   period.BasisAmount,
		TotalExpenses: period.TotalExpenses,
		TotalCogs:     period.TotalCogs,
		NetProfit:     period.NetProfit,
		Ratio:         period.Ratio,
		KeeperAmount:  period.KeeperAmount,
		OwnerAmount:   period.OwnerAmount,
		Status:        period.Status,
		PerProduct:    period.PerProduct,
		PaymentNote:   period.PaymentNote,
		TaxNote:       period.TaxNote,
	}
	if err := r.db.Create(m).Error; err != nil {
		return err
	}
	period.ID = m.ID
	return nil
}

func (r *profitSharingPeriodRepository) Update(period *entity.ProfitSharingPeriod) error {
	return r.db.Model(&models.ProfitSharingPeriod{}).Where("id = ?", period.ID).Updates(map[string]interface{}{
		"period_start":   period.PeriodStart,
		"period_end":     period.PeriodEnd,
		"basis_amount":   period.BasisAmount,
		"total_expenses": period.TotalExpenses,
		"total_cogs":     period.TotalCogs,
		"net_profit":     period.NetProfit,
		"ratio":          period.Ratio,
		"keeper_amount":  period.KeeperAmount,
		"owner_amount":   period.OwnerAmount,
		"status":         period.Status,
		"per_product":    period.PerProduct,
		"payment_note":   period.PaymentNote,
		"tax_note":       period.TaxNote,
	}).Error
}

func (r *profitSharingPeriodRepository) Delete(id uint) error {
	return r.db.Delete(&models.ProfitSharingPeriod{}, id).Error
}

func (r *profitSharingPeriodRepository) GetTotalRevenue(start, end string, outletID ...uint) (float64, error) {
	ow, args := outletWhere("o", outletID...)
	baseArgs := []interface{}{start, end, "Completed"}
	var total float64
	err := r.db.Model(&models.OrderItem{}).
		Joins("JOIN orders o ON o.id = order_items.order_id").
		Where("o.created_at BETWEEN ? AND ? AND o.status = ?"+ow, append(baseArgs, args...)...).
		Select("COALESCE(SUM(order_items.price * order_items.quantity), 0)").
		Row().Scan(&total)
	return total, err
}

func (r *profitSharingPeriodRepository) GetTotalExpensesExcluding(start, end string, excluded []string, outletID ...uint) (float64, error) {
	tx := r.db.Model(&models.Expense{}).
		Where("date BETWEEN ? AND ?", start, end)
	tx = scopeOutlet(tx, "expenses", outletID...)
	if len(excluded) > 0 {
		tx = tx.Where("category NOT IN ?", excluded)
	}
	var total float64
	err := tx.Select("COALESCE(SUM(amount), 0)").Row().Scan(&total)
	return total, err
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
			SUM(oi.price * oi.quantity) as revenue
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
	return &entity.ProfitSharingPeriod{
		ID:            m.ID,
		OutletID:      m.OutletID,
		PeriodStart:   m.PeriodStart,
		PeriodEnd:     m.PeriodEnd,
		BasisAmount:   m.BasisAmount,
		TotalExpenses: m.TotalExpenses,
		TotalCogs:     m.TotalCogs,
		NetProfit:     m.NetProfit,
		Ratio:         m.Ratio,
		KeeperAmount:  m.KeeperAmount,
		OwnerAmount:   m.OwnerAmount,
		Status:        m.Status,
		PerProduct:    m.PerProduct,
		PaymentNote:   m.PaymentNote,
		TaxNote:       m.TaxNote,
		CreatedAt:     m.CreatedAt,
		UpdatedAt:     m.UpdatedAt,
	}
}
