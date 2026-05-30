package postgres

import (
	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/models"

	"gorm.io/gorm"
)

type orderItemRepository struct {
	db *gorm.DB
}

func NewOrderItemRepository(db *gorm.DB) *orderItemRepository {
	return &orderItemRepository{db: db}
}

func (r *orderItemRepository) Create(items []entity.OrderItem) error {
	ms := make([]models.OrderItem, len(items))
	for i, item := range items {
		ms[i] = models.OrderItem{
			OrderID:   item.OrderID,
			ProductID: item.ProductID,
			Quantity:  item.Quantity,
			Price:     item.Price,
			Cost:      item.Cost,
		}
	}
	return r.db.Create(&ms).Error
}

func (r *orderItemRepository) GetTotalCogsByStatus(status string) (float64, error) {
	var total float64
	err := r.db.Model(&models.OrderItem{}).
		Joins("JOIN orders ON orders.id = order_items.order_id").
		Where("orders.status = ?", status).
		Select("COALESCE(SUM(order_items.cost * order_items.quantity), 0)").
		Row().Scan(&total)
	return total, err
}

func (r *orderItemRepository) GetCategoryBreakdown() ([]entity.CatBreakdown, error) {
	var results []entity.CatBreakdown
	err := r.db.Raw(`
		SELECT p.category, SUM(oi.price * oi.quantity) as total
		FROM order_items oi
		JOIN products p ON p.id = oi.product_id
		JOIN orders o ON o.id = oi.order_id
		WHERE o.status = 'Completed'
		GROUP BY p.category
	`).Scan(&results).Error
	return results, err
}

func (r *orderItemRepository) GetTopProducts(limit int) ([]entity.TopProduct, error) {
	var results []entity.TopProduct
	err := r.db.Raw(`
		SELECT p.name, p.category, SUM(oi.quantity) as sales
		FROM order_items oi
		JOIN products p ON p.id = oi.product_id
		JOIN orders o ON o.id = oi.order_id
		WHERE o.status = 'Completed'
		GROUP BY p.name, p.category
		ORDER BY sales DESC
		LIMIT ?
	`, limit).Scan(&results).Error
	return results, err
}
