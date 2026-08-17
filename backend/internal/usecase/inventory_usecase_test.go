package usecase

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/domain/errors"
	"singgah-pos-backend/internal/models"
)

func setupInventoryTestDB() *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		panic("Failed to connect to database: " + err.Error())
	}
	db.AutoMigrate(&models.Ingredient{}, &models.StockMutation{}, &models.Expense{}, &models.Setting{})
	return db
}

func createInventoryUsecase(db *gorm.DB) *InventoryUsecase {
	return NewInventoryUsecase(db)
}

func TestInventoryUsecase_CreateIngredientSuccess(t *testing.T) {
	db := setupInventoryTestDB()
	defer func() { sqlDB, _ := db.DB(); sqlDB.Close() }()
	uc := createInventoryUsecase(db)

	ing := &entity.Ingredient{
		Name:         "Gula Pasir",
		Unit:         "gram",
		CurrentStock: 5000,
		MinStock:     500,
		CostPerUnit:  15,
	}
	resp, err := uc.CreateIngredient(ing)

	assert.NoError(t, err)
	assert.NotNil(t, resp)
	assert.Equal(t, "Gula Pasir", resp.Name)
	assert.Equal(t, "gram", resp.Unit)
	assert.Equal(t, 15.0, resp.CostPerUnit)
	assert.Equal(t, 5000.0, resp.CurrentStock)
}

func TestInventoryUsecase_GetAllEmpty(t *testing.T) {
	db := setupInventoryTestDB()
	defer func() { sqlDB, _ := db.DB(); sqlDB.Close() }()
	uc := createInventoryUsecase(db)

	ings, err := uc.GetIngredients()

	assert.NoError(t, err)
	assert.Len(t, ings, 0)
}

func TestInventoryUsecase_GetAllWithData(t *testing.T) {
	db := setupInventoryTestDB()
	defer func() { sqlDB, _ := db.DB(); sqlDB.Close() }()
	uc := createInventoryUsecase(db)

	uc.CreateIngredient(&entity.Ingredient{Name: "Tepung", Unit: "gram", CurrentStock: 10000, MinStock: 1000, CostPerUnit: 10})
	uc.CreateIngredient(&entity.Ingredient{Name: "Garam", Unit: "gram", CurrentStock: 500, MinStock: 100, CostPerUnit: 5})

	ings, err := uc.GetIngredients()

	assert.NoError(t, err)
	assert.Len(t, ings, 2)
}

func TestInventoryUsecase_GetByIDSuccess(t *testing.T) {
	db := setupInventoryTestDB()
	defer func() { sqlDB, _ := db.DB(); sqlDB.Close() }()
	uc := createInventoryUsecase(db)

	created, _ := uc.CreateIngredient(&entity.Ingredient{Name: "Vanilla", Unit: "ml", CurrentStock: 100, MinStock: 10, CostPerUnit: 200})

	resp, err := uc.GetByID(created.ID)

	assert.NoError(t, err)
	assert.NotNil(t, resp)
	assert.Equal(t, "Vanilla", resp.Name)
}

func TestInventoryUsecase_GetByIDNotFound(t *testing.T) {
	db := setupInventoryTestDB()
	defer func() { sqlDB, _ := db.DB(); sqlDB.Close() }()
	uc := createInventoryUsecase(db)

	_, err := uc.GetByID(999)

	assert.Error(t, err)
	assert.ErrorIs(t, err, errors.ErrNotFound)
}

func TestInventoryUsecase_UpdateIngredientSuccess(t *testing.T) {
	db := setupInventoryTestDB()
	defer func() { sqlDB, _ := db.DB(); sqlDB.Close() }()
	uc := createInventoryUsecase(db)

	created, _ := uc.CreateIngredient(&entity.Ingredient{Name: "Old", Unit: "gram", CurrentStock: 100, MinStock: 10, CostPerUnit: 50})

	err := uc.UpdateIngredient(created.ID, "New Name", "Kopi", "kg", "kg", 1000, 100, 20)

	assert.NoError(t, err)

	updated, _ := uc.GetByID(created.ID)
	assert.Equal(t, "New Name", updated.Name)
	assert.Equal(t, "kg", updated.Unit)
	assert.Equal(t, 100.0, updated.CostPerUnit)
	assert.Equal(t, 20.0, updated.MinStock)
}

func TestInventoryUsecase_UpdateIngredientNotFound(t *testing.T) {
	db := setupInventoryTestDB()
	defer func() { sqlDB, _ := db.DB(); sqlDB.Close() }()
	uc := createInventoryUsecase(db)

	err := uc.UpdateIngredient(999, "X", "", "pcs", "pack", 100, 10, 5)

	assert.Error(t, err)
	assert.ErrorIs(t, err, errors.ErrNotFound)
}

func TestInventoryUsecase_DeleteIngredientSuccess(t *testing.T) {
	db := setupInventoryTestDB()
	defer func() { sqlDB, _ := db.DB(); sqlDB.Close() }()
	uc := createInventoryUsecase(db)

	created, _ := uc.CreateIngredient(&entity.Ingredient{Name: "To Delete", Unit: "pcs", CurrentStock: 50, MinStock: 5, CostPerUnit: 100})

	err := uc.DeleteIngredient(created.ID)
	assert.NoError(t, err)

	ings, _ := uc.GetIngredients()
	assert.Len(t, ings, 0)
}

func TestInventoryUsecase_UpdateStockIn(t *testing.T) {
	db := setupInventoryTestDB()
	defer func() { sqlDB, _ := db.DB(); sqlDB.Close() }()
	uc := createInventoryUsecase(db)

	created, _ := uc.CreateIngredient(&entity.Ingredient{Name: "Stock Test", Unit: "pcs", CurrentStock: 10, MinStock: 2, CostPerUnit: 50})

	err := uc.UpdateStock(created.ID, "IN", 5, "Restock", false, false, 0)

	assert.NoError(t, err)

	updated, _ := uc.GetByID(created.ID)
	assert.Equal(t, 15.0, updated.CurrentStock)
}

func TestInventoryUsecase_UpdateStockOut(t *testing.T) {
	db := setupInventoryTestDB()
	defer func() { sqlDB, _ := db.DB(); sqlDB.Close() }()
	uc := createInventoryUsecase(db)

	created, _ := uc.CreateIngredient(&entity.Ingredient{Name: "Usage Test", Unit: "gram", CurrentStock: 100, MinStock: 10, CostPerUnit: 20})

	err := uc.UpdateStock(created.ID, "OUT", 30, "Production usage", false, false, 0)

	assert.NoError(t, err)

	updated, _ := uc.GetByID(created.ID)
	assert.Equal(t, 70.0, updated.CurrentStock)
}

func TestInventoryUsecase_GetStockHistory(t *testing.T) {
	db := setupInventoryTestDB()
	defer func() { sqlDB, _ := db.DB(); sqlDB.Close() }()
	uc := createInventoryUsecase(db)

	created, _ := uc.CreateIngredient(&entity.Ingredient{Name: "History Test", Unit: "pcs", CurrentStock: 50, MinStock: 5, CostPerUnit: 10})
	uc.UpdateStock(created.ID, "IN", 10, "Purchase", false, false, 0)
	uc.UpdateStock(created.ID, "OUT", 5, "Usage", false, false, 0)

	history, err := uc.GetStockHistory(created.ID)

	assert.NoError(t, err)
	assert.Len(t, history, 2)
}
