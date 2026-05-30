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

func (r *orderRepository) FindAll(limit, offset int) ([]entity.Order, error) {
	var ms []models.Order
	if err := r.db.Preload("OrderItems").Preload("OrderItems.Product").Order("created_at desc").Limit(limit).Offset(offset).Find(&ms).Error; err != nil {
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

func (r *orderRepository) GetTotalSalesSince(since string) (float64, error) {
	var total float64
	err := r.db.Model(&models.Order{}).
		Where("created_at >= ? AND status = ?", since, "Completed").
		Select("COALESCE(SUM(total_amount), 0)").
		Row().Scan(&total)
	return total, err
}

func (r *orderRepository) GetTotalSalesRange(start, end string) (float64, error) {
	var total float64
	err := r.db.Model(&models.Order{}).
		Where("created_at BETWEEN ? AND ? AND status = ?", start, end, "Completed").
		Select("COALESCE(SUM(total_amount), 0)").
		Row().Scan(&total)
	return total, err
}

func (r *orderRepository) CountSince(since string) (int64, error) {
	var count int64
	err := r.db.Model(&models.Order{}).
		Where("created_at >= ?", since).
		Count(&count).Error
	return count, err
}

func (r *orderRepository) CountByStatus(status string) (int64, error) {
	var count int64
	err := r.db.Model(&models.Order{}).
		Where("status = ?", status).
		Count(&count).Error
	return count, err
}

func (r *orderRepository) GetSumByStatusSince(status, since, timeFormat string) ([]entity.TrendPoint, error) {
	var results []entity.TrendPoint
	err := r.db.Raw(`
		SELECT TO_CHAR(created_at, '`+timeFormat+`') as name, SUM(total_amount) as total
		FROM orders
		WHERE created_at >= ? AND status = ?
		GROUP BY TO_CHAR(created_at, '`+timeFormat+`'), DATE_TRUNC('day', created_at)
		ORDER BY DATE_TRUNC('day', created_at) ASC
	`, since, status).Scan(&results).Error
	return results, err
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
	}
}
