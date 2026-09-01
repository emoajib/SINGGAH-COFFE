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

func outletWhere(table string, outletID ...uint) (string, []interface{}) {
	if len(outletID) > 0 && outletID[0] > 0 {
		return " AND " + table + ".outlet_id = ?", []interface{}{outletID[0]}
	}
	return "", nil
}

func (r *orderItemRepository) GetTotalCogsByStatus(status string, outletID ...uint) (float64, error) {
	ow, args := outletWhere("orders", outletID...)
	var total float64
	err := r.db.Model(&models.OrderItem{}).
		Joins("JOIN orders ON orders.id = order_items.order_id").
		Where("orders.status = ?"+ow, append([]interface{}{status}, args...)...).
		Select("COALESCE(SUM(order_items.cost * order_items.quantity), 0)").
		Row().Scan(&total)
	return total, err
}

func (r *orderItemRepository) GetTotalCogsSince(status, since string, outletID ...uint) (float64, error) {
	ow, args := outletWhere("orders", outletID...)
	var total float64
	err := r.db.Model(&models.OrderItem{}).
		Joins("JOIN orders ON orders.id = order_items.order_id").
		Where("orders.status = ? AND orders.created_at >= ?"+ow, append([]interface{}{status, since}, args...)...).
		Select("COALESCE(SUM(order_items.cost * order_items.quantity), 0)").
		Row().Scan(&total)
	return total, err
}

func (r *orderItemRepository) GetTotalCogsRange(start, end string, outletID ...uint) (float64, error) {
	ow, args := outletWhere("orders", outletID...)
	baseArgs := []interface{}{start, end, "Completed"}
	var total float64
	err := r.db.Model(&models.OrderItem{}).
		Joins("JOIN orders ON orders.id = order_items.order_id").
		Where("orders.created_at BETWEEN ? AND ? AND orders.status = ?"+ow, append(baseArgs, args...)...).
		Select("COALESCE(SUM(order_items.cost * order_items.quantity), 0)").
		Row().Scan(&total)
	return total, err
}

func (r *orderItemRepository) GetCategoryBreakdown(outletID ...uint) ([]entity.CatBreakdown, error) {
	ow, args := outletWhere("o", outletID...)
	var results []entity.CatBreakdown
	err := r.db.Raw(`
		SELECT p.category, SUM(oi.price * oi.quantity) as total
		FROM order_items oi
		JOIN products p ON p.id = oi.product_id
		JOIN orders o ON o.id = oi.order_id
		WHERE o.status = 'Completed'`+ow+`
		GROUP BY p.category
	`, args...).Scan(&results).Error
	return results, err
}

func (r *orderItemRepository) GetTopProducts(limit int, outletID ...uint) ([]entity.TopProduct, error) {
	ow, args := outletWhere("o", outletID...)
	allArgs := append(args, limit)
	var results []entity.TopProduct
	err := r.db.Raw(`
		SELECT p.name, p.category, SUM(oi.quantity) as sales
		FROM order_items oi
		JOIN products p ON p.id = oi.product_id
		JOIN orders o ON o.id = oi.order_id
		WHERE o.status = 'Completed'`+ow+`
		GROUP BY p.name, p.category
		ORDER BY sales DESC
		LIMIT ?
	`, allArgs...).Scan(&results).Error
	return results, err
}

// ⚠️ Vetted by SOSIOMEN - Manual Review Required by Senior Engineer/Manager
func (r *orderItemRepository) GetProductSalesVolume(start, end string, outletID ...uint) ([]entity.ProductSalesVolume, error) {
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
		ORDER BY quantity DESC
	`, allArgs...).Scan(&results).Error
	return results, err
}
