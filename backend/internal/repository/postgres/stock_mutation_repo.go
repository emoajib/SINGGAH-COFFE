package postgres

import (
	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type stockMutationRepository struct {
	db *gorm.DB
}

func NewStockMutationRepository(db *gorm.DB) *stockMutationRepository {
	return &stockMutationRepository{db: db}
}

func (r *stockMutationRepository) Create(mutation *entity.StockMutation) error {
	return r.db.Create(toModelStockMutation(mutation)).Error
}

// CreateIdempotent menyimpan mutasi stok hanya jika idempotency_key belum ada.
//
// C4: retry dari webhook / antrean sync offline tidak boleh menggandakan mutasi.
// Mengembalikan created=false bila baris dengan kunci yang sama sudah tersimpan
// (dipakai pemanggil untuk melewati pengurangan stok).
//
// Catatan: kolom idempotency_key bersifat NULL-able + unique index, sehingga
// mutasi tanpa kunci (NULL) tetap boleh berulang.
func (r *stockMutationRepository) CreateIdempotent(mutation *entity.StockMutation) (bool, error) {
	m := toModelStockMutation(mutation)
	if m.IdempotencyKey == nil {
		if err := r.db.Create(m).Error; err != nil {
			return false, err
		}
		return true, nil
	}
	res := r.db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "idempotency_key"}},
		DoNothing: true,
	}).Create(m)
	if res.Error != nil {
		return false, res.Error
	}
	return res.RowsAffected > 0, nil
}

func toModelStockMutation(mutation *entity.StockMutation) *models.StockMutation {
	m := &models.StockMutation{
		IngredientID: mutation.IngredientID,
		Type:         mutation.Type,
		Location:     mutation.Location,
		FromLocation: mutation.FromLocation,
		ToLocation:   mutation.ToLocation,
		Quantity:     mutation.Quantity,
		ReferenceID:  mutation.ReferenceID,
		Notes:        mutation.Notes,
		OutletID:     mutation.OutletID,
	}
	if m.Location == "" {
		m.Location = "kedai"
	}
	if !mutation.Date.IsZero() {
		m.Date = mutation.Date
	}
	if mutation.IdempotencyKey != "" {
		key := mutation.IdempotencyKey
		m.IdempotencyKey = &key
	}
	return m
}

// FindByIngredientID mengembalikan riwayat mutasi stok untuk bahan tertentu.
// outletID bersifat opsional — jika diberikan, hanya mengembalikan mutasi dari outlet tersebut
// serta menyertakan mutasi legacy (outlet_id = 0 / NULL).
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (r *stockMutationRepository) FindByIngredientID(ingredientID uint, outletID ...uint) ([]entity.StockMutation, error) {
	var ms []models.StockMutation
	tx := r.db.Where("ingredient_id = ?", ingredientID)
	tx = scopeOutlet(tx, "stock_mutations", outletID...)
	if err := tx.Order("created_at desc").Find(&ms).Error; err != nil {
		return nil, err
	}
	result := make([]entity.StockMutation, len(ms))
	for i, m := range ms {
		result[i] = entity.StockMutation{
			ID:           m.ID,
			IngredientID: m.IngredientID,
			Type:         m.Type,
			Location:     m.Location,
			FromLocation: m.FromLocation,
			ToLocation:   m.ToLocation,
			Quantity:     m.Quantity,
			ReferenceID:  m.ReferenceID,
			Notes:        m.Notes,
			Date:         m.Date,
			OutletID:     m.OutletID,
			CreatedAt:    m.CreatedAt,
		}
		if m.IdempotencyKey != nil {
			result[i].IdempotencyKey = *m.IdempotencyKey
		}
	}
	return result, nil
}
