package postgres

import (
	"math"

	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type ingredientRepository struct {
	db *gorm.DB
}

func NewIngredientRepository(db *gorm.DB) *ingredientRepository {
	return &ingredientRepository{db: db}
}

func (r *ingredientRepository) FindByID(id uint) (*entity.Ingredient, error) {
	var m models.Ingredient
	if err := r.db.First(&m, id).Error; err != nil {
		return nil, err
	}
	return toDomainIngredient(&m), nil
}

func (r *ingredientRepository) FindByIDForUpdate(id uint) (*entity.Ingredient, error) {
	var m models.Ingredient
	if err := r.db.Clauses(clause.Locking{Strength: "UPDATE"}).First(&m, id).Error; err != nil {
		return nil, err
	}
	return toDomainIngredient(&m), nil
}

func (r *ingredientRepository) FindAll(outletID ...uint) ([]entity.Ingredient, error) {
	tx := r.db
	tx = scopeOutlet(tx, "ingredients", outletID...)
	var ms []models.Ingredient
	if err := tx.Find(&ms).Error; err != nil {
		return nil, err
	}
	result := make([]entity.Ingredient, len(ms))
	for i, m := range ms {
		result[i] = *toDomainIngredient(&m)
	}
	return result, nil
}

func (r *ingredientRepository) Create(ingredient *entity.Ingredient) error {
	m := toModelIngredient(ingredient)
	if err := r.db.Create(m).Error; err != nil {
		return err
	}
	ingredient.ID = m.ID
	return nil
}

func (r *ingredientRepository) Update(ingredient *entity.Ingredient) error {
	return r.db.Model(&models.Ingredient{}).Where("id = ?", ingredient.ID).Updates(map[string]interface{}{
		"name":               ingredient.Name,
		"category":           ingredient.Category,
		"unit":               ingredient.Unit,
		"purchase_unit":      ingredient.PurchaseUnit,
		"purchase_unit_size": ingredient.PurchaseUnitSize,
		"cost_per_unit":      ingredient.CostPerUnit,
		"min_stock":          ingredient.MinStock,
	}).Error
}

func (r *ingredientRepository) UpdateStock(id uint, newStock float64) error {
	return r.db.Model(&models.Ingredient{}).Where("id = ?", id).Update("current_stock", newStock).Error
}

func (r *ingredientRepository) UpdateStockAtomic(id uint, delta float64, operator string) error {
	// Vetted by AI - Manual Review Required by Senior Engineer/Manager
	absDelta := math.Abs(delta)
	expr := gorm.Expr("current_stock + ?", absDelta)
	if operator == "sub" {
		expr = gorm.Expr("current_stock - ?", absDelta)
	}
	return r.db.Model(&models.Ingredient{}).Where("id = ?", id).UpdateColumn("current_stock", expr).Error
}

// UpdateStockAtomicByLocation updates warehouse_stock or kedai_stock atomically.
// location: "warehouse" → column warehouse_stock, "kedai" → column kedai_stock.
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (r *ingredientRepository) UpdateStockAtomicByLocation(id uint, delta float64, operator string, location string) error {
	col := "kedai_stock"
	if location == "warehouse" {
		col = "warehouse_stock"
	}
	absDelta := math.Abs(delta)
	var expr interface{}
	if operator == "sub" {
		expr = gorm.Expr(col+" - ?", absDelta)
	} else {
		expr = gorm.Expr(col+" + ?", absDelta)
	}
	return r.db.Model(&models.Ingredient{}).Where("id = ?", id).UpdateColumn(col, expr).Error
}

func (r *ingredientRepository) UpdateCostPerUnit(id uint, cost float64) error {
	return r.db.Model(&models.Ingredient{}).Where("id = ?", id).Update("cost_per_unit", cost).Error
}

func (r *ingredientRepository) Delete(id uint) error {
	return r.db.Delete(&models.Ingredient{}, id).Error
}

func (r *ingredientRepository) CountLowStock(outletID ...uint) (int64, error) {
	tx := r.db.Model(&models.Ingredient{}).Where("current_stock <= min_stock")
	tx = scopeOutlet(tx, "ingredients", outletID...)
	var count int64
	err := tx.Count(&count).Error
	return count, err
}

func (r *ingredientRepository) FindLowStock(limit int, outletID ...uint) ([]entity.Ingredient, error) {
	tx := r.db.Where("current_stock <= min_stock")
	tx = scopeOutlet(tx, "ingredients", outletID...)
	var ms []models.Ingredient
	if err := tx.Limit(limit).Find(&ms).Error; err != nil {
		return nil, err
	}
	result := make([]entity.Ingredient, len(ms))
	for i, m := range ms {
		result[i] = *toDomainIngredient(&m)
	}
	return result, nil
}

func toDomainIngredient(m *models.Ingredient) *entity.Ingredient {
	return &entity.Ingredient{
		ID:               m.ID,
		Name:             m.Name,
		Category:         m.Category,
		Unit:             m.Unit,
		PurchaseUnit:     m.PurchaseUnit,
		PurchaseUnitSize: m.PurchaseUnitSize,
		CurrentStock:     m.CurrentStock,
		WarehouseStock:   m.WarehouseStock,
		KedaiStock:       m.KedaiStock,
		MinStock:         m.MinStock,
		CostPerUnit:      m.CostPerUnit,
		OutletID:         m.OutletID,
	}
}

func toModelIngredient(e *entity.Ingredient) *models.Ingredient {
	return &models.Ingredient{
		Name:             e.Name,
		Category:         e.Category,
		Unit:             e.Unit,
		PurchaseUnit:     e.PurchaseUnit,
		PurchaseUnitSize: e.PurchaseUnitSize,
		CurrentStock:     e.CurrentStock,
		WarehouseStock:   e.WarehouseStock,
		KedaiStock:       e.KedaiStock,
		MinStock:         e.MinStock,
		CostPerUnit:      e.CostPerUnit,
		OutletID:         e.OutletID,
	}
}
