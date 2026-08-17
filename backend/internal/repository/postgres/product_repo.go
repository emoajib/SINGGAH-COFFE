package postgres

import (
	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type productRepository struct {
	db *gorm.DB
}

func NewProductRepository(db *gorm.DB) *productRepository {
	return &productRepository{db: db}
}

func (r *productRepository) FindByID(id uint) (*entity.Product, error) {
	var m models.Product
	if err := r.db.First(&m, id).Error; err != nil {
		return nil, err
	}
	return toDomainProduct(&m), nil
}

func (r *productRepository) FindByIDWithRecipe(id uint) (*entity.Product, error) {
	var m models.Product
	if err := r.db.Preload("Recipe").Preload("Recipe.Ingredient").First(&m, id).Error; err != nil {
		return nil, err
	}
	return toDomainProduct(&m), nil
}

func (r *productRepository) FindByIDWithRecipeForUpdate(id uint) (*entity.Product, error) {
	var m models.Product
	if err := r.db.Clauses(clause.Locking{Strength: "UPDATE"}).Preload("Recipe").Preload("Recipe.Ingredient").First(&m, id).Error; err != nil {
		return nil, err
	}
	return toDomainProduct(&m), nil
}

func (r *productRepository) UpdateStockAtomic(id uint, delta float64, operator string) error {
	expr := gorm.Expr("stock + ?", int(delta))
	if operator == "sub" {
		expr = gorm.Expr("stock - ?", int(delta))
	}
	return r.db.Model(&models.Product{}).Where("id = ?", id).UpdateColumn("stock", expr).Error
}

func (r *productRepository) FindAll(limit, offset int) ([]entity.Product, error) {
	var ms []models.Product
	query := r.db.Preload("Recipe").Preload("Recipe.Ingredient")
	if limit > 0 {
		query = query.Limit(limit)
	}
	if offset > 0 {
		query = query.Offset(offset)
	}
	if err := query.Find(&ms).Error; err != nil {
		return nil, err
	}
	result := make([]entity.Product, len(ms))
	for i, m := range ms {
		result[i] = *toDomainProduct(&m)
	}
	return result, nil
}

func (r *productRepository) Create(product *entity.Product) error {
	m := toModelProduct(product)
	if err := r.db.Create(m).Error; err != nil {
		return err
	}
	product.ID = m.ID
	return nil
}

func (r *productRepository) Update(product *entity.Product) error {
	m := toModelProduct(product)
	return r.db.Model(&models.Product{}).Where("id = ?", product.ID).Updates(map[string]interface{}{
		"name":        m.Name,
		"category":    m.Category,
		"price":       m.Price,
		"cost":        m.Cost,
		"stock":       m.Stock,
		"sku":         m.Sku,
		"description": m.Description,
		"image_url":   m.ImageURL,
	}).Error
}

func (r *productRepository) Delete(id uint) error {
	return r.db.Delete(&models.Product{}, id).Error
}

func (r *productRepository) DeleteRecipeByProductID(productID uint) error {
	return r.db.Where("product_id = ?", productID).Delete(&models.RecipeItem{}).Error
}

func (r *productRepository) CreateRecipeItems(items []entity.RecipeItem) error {
	ms := make([]models.RecipeItem, len(items))
	for i, item := range items {
		ms[i] = models.RecipeItem{
			ProductID:    item.ProductID,
			IngredientID: item.IngredientID,
			Quantity:     item.Quantity,
		}
	}
	return r.db.Create(&ms).Error
}

// RecalculateCosts recalculates and updates the HPP (Cost) for products using specific ingredients (or all if omitted).
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (r *productRepository) RecalculateCosts(ingredientID ...uint) error {
	query := r.db.Model(&models.RecipeItem{}).Where("deleted_at IS NULL")
	if len(ingredientID) > 0 && ingredientID[0] > 0 {
		query = query.Where("ingredient_id = ?", ingredientID[0])
	}
	var productIDs []uint
	if err := query.Distinct().Pluck("product_id", &productIDs).Error; err != nil {
		return err
	}
	if len(productIDs) == 0 {
		return nil
	}

	for _, pid := range productIDs {
		type itemCost struct {
			Quantity    float64 `gorm:"column:quantity"`
			CostPerUnit float64 `gorm:"column:cost_per_unit"`
		}
		var items []itemCost
		err := r.db.Table("recipe_items AS ri").
			Select("ri.quantity, i.cost_per_unit").
			Joins("JOIN ingredients AS i ON i.id = ri.ingredient_id AND i.deleted_at IS NULL").
			Where("ri.product_id = ? AND ri.deleted_at IS NULL", pid).
			Scan(&items).Error
		if err != nil {
			continue
		}

		var totalCost float64
		for _, it := range items {
			totalCost += it.Quantity * it.CostPerUnit
		}
		r.db.Model(&models.Product{}).Where("id = ?", pid).Update("cost", totalCost)
	}
	return nil
}

func toDomainProduct(m *models.Product) *entity.Product {
	p := &entity.Product{
		ID:          m.ID,
		Name:        m.Name,
		Category:    m.Category,
		Price:       m.Price,
		Cost:        m.Cost,
		Stock:       m.Stock,
		Sku:         m.Sku,
		Description: m.Description,
		ImageURL:    m.ImageURL,
		Recipe:      make([]entity.RecipeItem, len(m.Recipe)),
	}
	for i, r := range m.Recipe {
		p.Recipe[i] = entity.RecipeItem{
			ID:           r.ID,
			ProductID:    r.ProductID,
			IngredientID: r.IngredientID,
			Ingredient:   *toDomainIngredient(&r.Ingredient),
			Quantity:     r.Quantity,
		}
	}
	return p
}

func toModelProduct(e *entity.Product) *models.Product {
	return &models.Product{
		Name:        e.Name,
		Category:    e.Category,
		Price:       e.Price,
		Cost:        e.Cost,
		Stock:       e.Stock,
		Sku:         e.Sku,
		Description: e.Description,
		ImageURL:    e.ImageURL,
	}
}
