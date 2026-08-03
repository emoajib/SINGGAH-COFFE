package postgres

import (
	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/models"

	"gorm.io/gorm"
)

type orderRepository struct {
	db *gorm.DB
}

func NewOrderRepository(db *gorm.DB) *orderRepository {
	return &orderRepository{db: db}
}

func (r *orderRepository) FindByID(id uint) (*entity.Order, error) {
	var m models.Order
	if err := r.db.First(&m, id).Error; err != nil {
		return nil, err
	}
	return toDomainOrder(&m), nil
}

func (r *orderRepository) FindByIDWithItems(id uint) (*entity.Order, error) {
	var m models.Order
	if err := r.db.Preload("OrderItems").Preload("OrderItems.Product").First(&m, id).Error; err != nil {
		return nil, err
	}
	return toDomainOrder(&m), nil
}

func (r *orderRepository) FindAll(limit, offset int, outletID ...uint) ([]entity.Order, error) {
	tx := r.db.Preload("OrderItems").Preload("OrderItems.Product").Order("created_at desc").Limit(limit).Offset(offset)
	tx = scopeOutlet(tx, "orders", outletID...)
	var ms []models.Order
	if err := tx.Find(&ms).Error; err != nil {
		return nil, err
	}
	result := make([]entity.Order, len(ms))
	for i, m := range ms {
		result[i] = *toDomainOrder(&m)
	}
	return result, nil
}

func (r *orderRepository) Create(order *entity.Order) error {
	m := toModelOrder(order)
	if err := r.db.Create(m).Error; err != nil {
		return err
	}
	order.ID = m.ID
	return nil
}

func (r *orderRepository) Update(order *entity.Order) error {
	return r.db.Model(&models.Order{}).Where("id = ?", order.ID).Updates(map[string]interface{}{
		"total_amount":   order.TotalAmount,
		"payment_status": order.PaymentStatus,
		"status":         order.Status,
	}).Error
}

func (r *orderRepository) GetTotalSalesSince(since string, outletID ...uint) (float64, error) {
	tx := r.db.Model(&models.Order{}).Where("created_at >= ? AND status = ?", since, "Completed")
	tx = scopeOutlet(tx, "orders", outletID...)
	var total float64
	err := tx.Select("COALESCE(SUM(total_amount), 0)").Row().Scan(&total)
	return total, err
}

func (r *orderRepository) GetTotalSalesRange(start, end string, outletID ...uint) (float64, error) {
	tx := r.db.Model(&models.Order{}).Where("created_at BETWEEN ? AND ? AND status = ?", start, end, "Completed")
	tx = scopeOutlet(tx, "orders", outletID...)
	var total float64
	err := tx.Select("COALESCE(SUM(total_amount), 0)").Row().Scan(&total)
	return total, err
}

func (r *orderRepository) CountSince(since string, outletID ...uint) (int64, error) {
	tx := r.db.Model(&models.Order{}).Where("created_at >= ?", since)
	tx = scopeOutlet(tx, "orders", outletID...)
	var count int64
	err := tx.Count(&count).Error
	return count, err
}

func (r *orderRepository) CountByStatus(status string, outletID ...uint) (int64, error) {
	tx := r.db.Model(&models.Order{}).Where("status = ?", status)
	tx = scopeOutlet(tx, "orders", outletID...)
	var count int64
	err := tx.Count(&count).Error
	return count, err
}

func (r *orderRepository) GetSumByStatusSince(status, since, timeFormat string, outletID ...uint) ([]entity.TrendPoint, error) {
	outletWhere := ""
	args := []interface{}{timeFormat, since, status}
	if len(outletID) > 0 && outletID[0] > 0 {
		outletWhere = " AND outlet_id = ?"
		args = append(args, outletID[0])
	}
	args = append(args, timeFormat)

	var results []entity.TrendPoint
	err := r.db.Raw(`
		SELECT DATE_FORMAT(created_at, ?) as name, SUM(total_amount) as total
		FROM orders
		WHERE created_at >= ? AND status = ?`+outletWhere+`
		GROUP BY DATE_FORMAT(created_at, ?), DATE(created_at)
		ORDER BY DATE(created_at) ASC
	`, args...).Scan(&results).Error
	return results, err
}

// ⚠️ Vetted by SOSIOMEN - Manual Review Required by Senior Engineer/Manager
func (r *orderRepository) GetDailySalesRange(start, end string, outletID ...uint) ([]entity.DailySales, error) {
	outletWhere := ""
	args := []interface{}{start, end}
	if len(outletID) > 0 && outletID[0] > 0 {
		outletWhere = " AND outlet_id = ?"
		args = append(args, outletID[0])
	}
	var results []entity.DailySales
	err := r.db.Raw(`
		SELECT DATE_FORMAT(created_at, '%Y-%m-%d') as date, COALESCE(SUM(total_amount), 0) as total, COUNT(*) as count
		FROM orders
		WHERE created_at BETWEEN ? AND ? AND status = 'Completed'`+outletWhere+`
		GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
		ORDER BY date ASC
	`, args...).Scan(&results).Error
	return results, err
}

// ⚠️ Vetted by SOSIOMEN - Manual Review Required by Senior Engineer/Manager
func (r *orderRepository) GetAverageOrderValue(start, end string, outletID ...uint) (float64, error) {
	tx := r.db.Model(&models.Order{}).Where("created_at BETWEEN ? AND ? AND status = ?", start, end, "Completed")
	tx = scopeOutlet(tx, "orders", outletID...)
	var avg float64
	err := tx.Select("COALESCE(AVG(total_amount), 0)").Row().Scan(&avg)
	return avg, err
}

func toDomainOrder(m *models.Order) *entity.Order {
	o := &entity.Order{
		ID:            m.ID,
		OrderNumber:   m.OrderNumber,
		TotalAmount:   m.TotalAmount,
		PaymentMethod: m.PaymentMethod,
		PaymentStatus: m.PaymentStatus,
		PaymentRef:    m.PaymentRef,
		Status:        m.Status,
		UserID:        m.UserID,
		CashierName:   m.CashierName,
		OrderTime:     m.OrderTime,
		CreatedAt:     m.CreatedAt,
		OutletID:      m.OutletID,
		OrderItems:    make([]entity.OrderItem, len(m.OrderItems)),
	}
	for i, item := range m.OrderItems {
		o.OrderItems[i] = entity.OrderItem{
			ID:        item.ID,
			OrderID:   item.OrderID,
			ProductID: item.ProductID,
			Product: entity.Product{
				ID:          item.Product.ID,
				Name:        item.Product.Name,
				Category:    item.Product.Category,
				Price:       item.Product.Price,
				Cost:        item.Product.Cost,
				Stock:       item.Product.Stock,
				Sku:         item.Product.Sku,
				Description: item.Product.Description,
				ImageURL:    item.Product.ImageURL,
			},
			Quantity: item.Quantity,
			Price:    item.Price,
			Cost:     item.Cost,
		}
	}
	return o
}

func scopeOutlet(tx *gorm.DB, table string, outletID ...uint) *gorm.DB {
	if len(outletID) > 0 && outletID[0] > 0 {
		return tx.Where(table+".outlet_id = ?", outletID[0])
	}
	return tx
}

func toModelOrder(e *entity.Order) *models.Order {
	return &models.Order{
		OrderNumber:   e.OrderNumber,
		TotalAmount:   e.TotalAmount,
		PaymentMethod: e.PaymentMethod,
		PaymentStatus: e.PaymentStatus,
		PaymentRef:    e.PaymentRef,
		Status:        e.Status,
		UserID:        e.UserID,
		CashierName:   e.CashierName,
		OrderTime:     e.OrderTime,
		OutletID:      e.OutletID,
	}
}
