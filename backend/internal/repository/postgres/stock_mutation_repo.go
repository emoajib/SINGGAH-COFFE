package postgres

import (
	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/models"

	"gorm.io/gorm"
)

type stockMutationRepository struct {
	db *gorm.DB
}

func NewStockMutationRepository(db *gorm.DB) *stockMutationRepository {
	return &stockMutationRepository{db: db}
}

func (r *stockMutationRepository) Create(mutation *entity.StockMutation) error {
	m := &models.StockMutation{
		IngredientID: mutation.IngredientID,
		Type:         mutation.Type,
		Quantity:     mutation.Quantity,
		ReferenceID:  mutation.ReferenceID,
		Notes:        mutation.Notes,
	}
	if !mutation.Date.IsZero() {
		m.Date = mutation.Date
	}
	return r.db.Create(m).Error
}

func (r *stockMutationRepository) FindByIngredientID(ingredientID uint) ([]entity.StockMutation, error) {
	var ms []models.StockMutation
	if err := r.db.Where("ingredient_id = ?", ingredientID).Order("created_at desc").Find(&ms).Error; err != nil {
		return nil, err
	}
	result := make([]entity.StockMutation, len(ms))
	for i, m := range ms {
		result[i] = entity.StockMutation{
			ID:           m.ID,
			IngredientID: m.IngredientID,
			Type:         m.Type,
			Quantity:     m.Quantity,
			ReferenceID:  m.ReferenceID,
			Notes:        m.Notes,
			Date:         m.Date,
			CreatedAt:    m.CreatedAt,
		}
	}
	return result, nil
}
