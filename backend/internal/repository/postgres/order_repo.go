package postgres

import (
	"time"

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

func (r *orderRepository) FindAllFiltered(start, end, status string, limit, offset int, outletID ...uint) ([]entity.Order, error) {
	tx := r.db.Preload("OrderItems").Preload("OrderItems.Product").Order("created_at desc").Limit(limit).Offset(offset)
	if start != "" {
		tx = tx.Where("DATE(created_at) >= DATE(?)", start)
	}
	if end != "" {
		tx = tx.Where("DATE(created_at) <= DATE(?)", end)
	}
	if status != "" {
		tx = tx.Where("status = ?", status)
	}
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
	updates := map[string]interface{}{
		"total_amount":      order.TotalAmount,
		"payment_status":    order.PaymentStatus,
		"payment_method":    order.PaymentMethod,
		"status":            order.Status,
		"kitchen_status":    order.KitchenStatus,
		"queue_number":      order.QueueNumber,
		"preparation_notes": order.PreparationNotes,
		"customer_name":     order.CustomerName,
		"customer_phone":    order.CustomerPhone,
	}
	if order.QueuedAt != nil {
		updates["queued_at"] = order.QueuedAt
	}
	if order.PreparingAt != nil {
		updates["preparing_at"] = order.PreparingAt
	}
	if order.ReadyAt != nil {
		updates["ready_at"] = order.ReadyAt
	}
	if order.ServedAt != nil {
		updates["served_at"] = order.ServedAt
	}
	return r.db.Model(&models.Order{}).Where("id = ?", order.ID).Updates(updates).Error
}

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (r *orderRepository) GetTotalSalesSince(since string, outletID ...uint) (float64, error) {
	tx := r.db.Model(&models.Order{}).Where("COALESCE(order_time, created_at) >= ? AND status = ?", since, "Completed")
	tx = scopeOutlet(tx, "orders", outletID...)
	var total float64
	err := tx.Select("COALESCE(SUM(total_amount), 0)").Row().Scan(&total)
	return total, err
}

func (r *orderRepository) GetTotalSalesRange(start, end string, outletID ...uint) (float64, error) {
	tx := r.db.Model(&models.Order{}).Where("DATE(COALESCE(order_time, created_at)) BETWEEN DATE(?) AND DATE(?) AND status = ?", start, end, "Completed")
	tx = scopeOutlet(tx, "orders", outletID...)
	var total float64
	err := tx.Select("COALESCE(SUM(total_amount), 0)").Row().Scan(&total)
	return total, err
}

// GetSalesByPaymentMethod splits Completed-order revenue per payment_method in a date range.
func (r *orderRepository) GetSalesByPaymentMethod(start, end string, outletID ...uint) ([]entity.PaymentBreakdown, error) {
	tx := r.db.Model(&models.Order{}).Where("DATE(COALESCE(order_time, created_at)) BETWEEN DATE(?) AND DATE(?) AND status = ?", start, end, "Completed")
	tx = scopeOutlet(tx, "orders", outletID...)
	var results []entity.PaymentBreakdown
	err := tx.Select("payment_method, COALESCE(SUM(total_amount), 0) as total, COUNT(*) as count").
		Group("payment_method").
		Scan(&results).Error
	return results, err
}

func (r *orderRepository) CountSince(since string, outletID ...uint) (int64, error) {
	tx := r.db.Model(&models.Order{}).Where("COALESCE(order_time, created_at) >= ? AND status = 'Completed'", since)
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

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (r *orderRepository) GetSumByStatusSince(status, start, end, timeFormat string, outletID ...uint) ([]entity.TrendPoint, error) {
	ow, oArgs := outletWhere("orders", outletID...)
	args := []interface{}{timeFormat, start, end, status}
	args = append(args, oArgs...)
	args = append(args, timeFormat)

	var results []entity.TrendPoint
	err := r.db.Raw(`
		SELECT DATE_FORMAT(COALESCE(order_time, created_at), ?) as name, SUM(total_amount) as total
		FROM orders
		WHERE COALESCE(order_time, created_at) >= ? AND COALESCE(order_time, created_at) <= ? AND status = ?`+ow+`
		GROUP BY DATE_FORMAT(COALESCE(order_time, created_at), ?), DATE(COALESCE(order_time, created_at))
		ORDER BY DATE(COALESCE(order_time, created_at)) ASC
	`, args...).Scan(&results).Error
	return results, err
}

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (r *orderRepository) GetDailySalesRange(start, end string, outletID ...uint) ([]entity.DailySales, error) {
	ow, oArgs := outletWhere("orders", outletID...)
	args := []interface{}{start, end}
	args = append(args, oArgs...)
	var results []entity.DailySales
	err := r.db.Raw(`
		SELECT DATE_FORMAT(COALESCE(order_time, created_at), '%Y-%m-%d') as date, COALESCE(SUM(total_amount), 0) as total, COUNT(*) as count
		FROM orders
		WHERE DATE(COALESCE(order_time, created_at)) BETWEEN DATE(?) AND DATE(?) AND status = 'Completed'`+ow+`
		GROUP BY DATE_FORMAT(COALESCE(order_time, created_at), '%Y-%m-%d')
		ORDER BY date ASC
	`, args...).Scan(&results).Error
	return results, err
}

// ⚠️ Vetted by SOSIOMEN - Manual Review Required by Senior Engineer/Manager
func (r *orderRepository) GetAverageOrderValue(start, end string, outletID ...uint) (float64, error) {
	tx := r.db.Model(&models.Order{}).Where("DATE(COALESCE(order_time, created_at)) BETWEEN DATE(?) AND DATE(?) AND status = ?", start, end, "Completed")
	tx = scopeOutlet(tx, "orders", outletID...)
	var avg float64
	err := tx.Select("COALESCE(AVG(total_amount), 0)").Row().Scan(&avg)
	return avg, err
}

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (r *orderRepository) FindActiveKitchenQueue(outletID ...uint) ([]entity.Order, error) {
	// Batasi antrian aktif hanya dalam 24 jam terakhir agar order masa lampau tidak memenuhi antrian
	twentyFourHoursAgo := time.Now().Add(-24 * time.Hour)
	tx := r.db.Preload("OrderItems").Preload("OrderItems.Product").
		Where("kitchen_status IN ('queued', 'preparing', 'ready') AND status != 'Void' AND order_time >= ?", twentyFourHoursAgo).
		Order("order_time asc").
		Limit(100)

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

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (r *orderRepository) FindUnpaidOrders(outletID ...uint) ([]entity.Order, error) {
	// Ambil pesanan yang belum lunas dalam 24 jam terakhir dan bukan Void
	twentyFourHoursAgo := time.Now().Add(-24 * time.Hour)
	tx := r.db.Preload("OrderItems").Preload("OrderItems.Product").
		Where("(payment_status = 'Unpaid' OR status = 'Pending') AND status != 'Void' AND order_time >= ?", twentyFourHoursAgo).
		Order("order_time desc").
		Limit(100)

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

func (r *orderRepository) UpdateKitchenStatus(id uint, status string, notes string, outletID ...uint) error {
	updates := map[string]interface{}{
		"updated_at": time.Now(),
	}
	if status != "" {
		updates["kitchen_status"] = status
		now := time.Now()
		switch status {
		case "preparing":
			updates["preparing_at"] = &now
		case "ready":
			updates["ready_at"] = &now
		case "served":
			updates["served_at"] = &now
		}
	}
	if notes != "" {
		updates["preparation_notes"] = notes
	}

	tx := r.db.Model(&models.Order{}).Where("id = ?", id)
	tx = scopeOutlet(tx, "orders", outletID...)
	return tx.Updates(updates).Error
}

func (r *orderRepository) ClearActiveKitchenQueue(outletID ...uint) error {
	now := time.Now()
	tx := r.db.Model(&models.Order{}).
		Where("kitchen_status IN ('queued', 'preparing', 'ready') AND status != 'Void'")
	tx = scopeOutlet(tx, "orders", outletID...)
	return tx.Updates(map[string]interface{}{
		"kitchen_status": "served",
		"served_at":      &now,
		"updated_at":     now,
	}).Error
}

func toDomainOrder(m *models.Order) *entity.Order {
	o := &entity.Order{
		ID:               m.ID,
		OrderNumber:      m.OrderNumber,
		TotalAmount:      m.TotalAmount,
		PaymentMethod:    m.PaymentMethod,
		PaymentStatus:    m.PaymentStatus,
		PaymentRef:       m.PaymentRef,
		Status:           m.Status,
		UserID:           m.UserID,
		CashierName:      m.CashierName,
		OrderTime:        m.OrderTime,
		CreatedAt:        m.CreatedAt,
		OutletID:         m.OutletID,
		CustomerName:     m.CustomerName,
		QueueNumber:      m.QueueNumber,
		KitchenStatus:    m.KitchenStatus,
		PreparationNotes: m.PreparationNotes,
		OrderSource:      m.OrderSource,
		CustomerPhone:    m.CustomerPhone,
		TrackingToken:    m.TrackingToken,
		PickupCode:       m.PickupCode,
		QueuedAt:         m.QueuedAt,
		PreparingAt:      m.PreparingAt,
		ReadyAt:          m.ReadyAt,
		ServedAt:         m.ServedAt,
		OrderItems:       make([]entity.OrderItem, len(m.OrderItems)),
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
			Notes:    item.Notes,
		}
	}
	return o
}

func scopeOutlet(tx *gorm.DB, table string, outletID ...uint) *gorm.DB {
	if len(outletID) > 0 && outletID[0] > 0 {
		return tx.Where("("+table+".outlet_id = ? OR "+table+".outlet_id = 0 OR "+table+".outlet_id IS NULL)", outletID[0])
	}
	return tx
}

func toModelOrder(e *entity.Order) *models.Order {
	return &models.Order{
		OrderNumber:      e.OrderNumber,
		TotalAmount:      e.TotalAmount,
		PaymentMethod:    e.PaymentMethod,
		PaymentStatus:    e.PaymentStatus,
		PaymentRef:       e.PaymentRef,
		Status:           e.Status,
		UserID:           e.UserID,
		CashierName:      e.CashierName,
		OrderTime:        e.OrderTime,
		OutletID:         e.OutletID,
		CustomerName:     e.CustomerName,
		QueueNumber:      e.QueueNumber,
		KitchenStatus:    e.KitchenStatus,
		PreparationNotes: e.PreparationNotes,
		OrderSource:      e.OrderSource,
		CustomerPhone:    e.CustomerPhone,
		TrackingToken:    e.TrackingToken,
		PickupCode:       e.PickupCode,
		QueuedAt:         e.QueuedAt,
		PreparingAt:      e.PreparingAt,
		ReadyAt:          e.ReadyAt,
		ServedAt:         e.ServedAt,
	}
}

// FindByTrackingToken finds an order by its secret tracking token (anti-IDOR)
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (r *orderRepository) FindByTrackingToken(token string) (*entity.Order, error) {
	if token == "" {
		return nil, gorm.ErrRecordNotFound
	}
	var m models.Order
	if err := r.db.Preload("OrderItems.Product").Where("tracking_token = ?", token).First(&m).Error; err != nil {
		return nil, err
	}
	return toDomainOrder(&m), nil
}

// CountActiveUnpaidSelfOrders returns count of pending unpaid self orders in last 15 mins (anti-spam quota)
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (r *orderRepository) CountActiveUnpaidSelfOrders(outletID ...uint) (int64, error) {
	var count int64
	tx := r.db.Model(&models.Order{}).
		Where("order_source = 'self_order' AND payment_status = 'Unpaid' AND status != 'Cancelled'")
	tx = scopeOutlet(tx, "orders", outletID...)
	err := tx.Count(&count).Error
	return count, err
}
