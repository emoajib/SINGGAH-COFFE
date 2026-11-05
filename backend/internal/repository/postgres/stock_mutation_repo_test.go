package postgres

import (
	"testing"

	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/models"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// C4: mutasi dengan idempotency_key sama harus diabaikan pada percobaan kedua.
func TestStockMutationRepository_CreateIdempotent(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&models.StockMutation{}))
	repo := NewStockMutationRepository(db)

	key := "payment:ORD-1:item0:recipe0"
	created, err := repo.CreateIdempotent(&entity.StockMutation{
		IngredientID: 1, Type: "OUT", Quantity: 5, IdempotencyKey: key,
	})
	require.NoError(t, err)
	assert.True(t, created)

	created, err = repo.CreateIdempotent(&entity.StockMutation{
		IngredientID: 1, Type: "OUT", Quantity: 5, IdempotencyKey: key,
	})
	require.NoError(t, err)
	assert.False(t, created, "kunci yang sama tidak boleh membuat baris baru")

	var count int64
	db.Model(&models.StockMutation{}).Count(&count)
	assert.Equal(t, int64(1), count)

	// Tanpa kunci (mutasi manual/legacy) tetap boleh berulang.
	c1, err := repo.CreateIdempotent(&entity.StockMutation{IngredientID: 1, Type: "IN", Quantity: 3})
	require.NoError(t, err)
	c2, err := repo.CreateIdempotent(&entity.StockMutation{IngredientID: 1, Type: "IN", Quantity: 3})
	require.NoError(t, err)
	assert.True(t, c1)
	assert.True(t, c2)
}
