package postgres

import (
	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/models"

	"gorm.io/gorm"
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

func (r *ingredientRepository) FindAll() ([]entity.Ingredient, error) {
	var ms []models.Ingredient
	if err := r.db.Find(&ms).Error; err != nil {
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
		"name":          ingredient.Name,
		"unit":          ingredient.Unit,
		"cost_per_unit": ingredient.CostPerUnit,
		"min_stock":     ingredient.MinStock,
	}).Error
}

func (r *ingredientRepository) UpdateStock(id uint, newStock float64) error {
	return r.db.Model(&models.Ingredient{}).Where("id = ?", id).Update("current_stock", newStock).Error
}

func (r *ingredientRepository) UpdateStockAtomic(id uint, delta float64, operator string) error {
	expr := gorm.Expr("current_stock + ?", delta)
	if operator == "sub" {
		expr = gorm.Expr("current_stock - ?", delta)
	}
	return r.db.Model(&models.Ingredient{}).Where("id = ?", id).UpdateColumn("current_stock", expr).Error
}

func (r *ingredientRepository) UpdateCostPerUnit(id uint, cost float64) error {
	return r.db.Model(&models.Ingredient{}).Where("id = ?", id).Update("cost_per_unit", cost).Error
}

func (r *ingredientRepository) Delete(id uint) error {
	return r.db.Delete(&models.Ingredient{}, id).Error
}

func (r *ingredientRepository) CountLowStock() (int64, error) {
	var count int64
	err := r.db.Model(&models.Ingredient{}).Where("current_stock <= min_stock").Count(&count).Error
	return count, err
}

func toDomainIngredient(m *models.Ingredient) *entity.Ingredient {
	return &entity.Ingredient{
		ID:           m.ID,
		Name:         m.Name,
		Unit:         m.Unit,
		CurrentStock: m.CurrentStock,
		MinStock:     m.MinStock,
		CostPerUnit:  m.CostPerUnit,
	}
}

func toModelIngredient(e *entity.Ingredient) *models.Ingredient {
	return &models.Ingredient{
		Name:         e.Name,
		Unit:         e.Unit,
		CurrentStock: e.CurrentStock,
		MinStock:     e.MinStock,
		CostPerUnit:  e.CostPerUnit,
	}
}
