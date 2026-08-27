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
		OutletID:     mutation.OutletID,
	}
	if !mutation.Date.IsZero() {
		m.Date = mutation.Date
	}
	return r.db.Create(m).Error
}

// FindByIngredientID mengembalikan riwayat mutasi stok untuk bahan tertentu.
// outletID bersifat opsional — jika diberikan, hanya mengembalikan mutasi dari outlet tersebut
// sehingga mencegah kebocoran data antar outlet dalam setup multi-outlet.
// ⚠️ Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (r *stockMutationRepository) FindByIngredientID(ingredientID uint, outletID ...uint) ([]entity.StockMutation, error) {
	var ms []models.StockMutation
	tx := r.db.Where("ingredient_id = ?", ingredientID)
	if len(outletID) > 0 && outletID[0] > 0 {
		tx = tx.Where("outlet_id = ?", outletID[0])
	}
	if err := tx.Order("created_at desc").Find(&ms).Error; err != nil {
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
			OutletID:     m.OutletID,
			CreatedAt:    m.CreatedAt,
		}
	}
	return result, nil
}
