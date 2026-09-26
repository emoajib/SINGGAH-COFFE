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
	db.AutoMigrate(&models.Ingredient{}, &models.StockMutation{}, &models.Expense{}, &models.Setting{}, &models.PSAKEventOutbox{}, &models.Product{}, &models.RecipeItem{})
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

// TestInventoryUsecase_UpdateStockPurchase_CategoryAndCostType memverifikasi bahwa
// pembelian bahan baku (isPurchase=true, type=IN) menghasilkan expense dengan
// Category="Bahan Baku" dan CostType="variable".
// Ini adalah regression test untuk bug fix: sebelumnya tercatat sebagai "Operasional"/""
// yang menyebabkan BEP tidak menghitung HPP dan Profit Sharing tidak akurat.
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func TestInventoryUsecase_UpdateStockPurchase_CategoryAndCostType(t *testing.T) {
	db := setupInventoryTestDB()
	defer func() { sqlDB, _ := db.DB(); sqlDB.Close() }()
	uc := createInventoryUsecase(db)

	// Buat ingredient dengan harga pokok Rp 5.000/pcs
	ing, _ := uc.CreateIngredient(&entity.Ingredient{
		Name:         "Biji Kopi Arabica",
		Unit:         "gram",
		CurrentStock: 0,
		MinStock:     100,
		CostPerUnit:  5000,
	})

	// Simulasi pembelian 200 gram (isPurchase=true)
	// Ekspektasi: expense dengan amount = 200 * 5000 = 1.000.000
	err := uc.UpdateStock(ing.ID, "IN", 200, "Beli dari supplier", true, false, 0)
	assert.NoError(t, err, "UpdateStock purchase harus berhasil")

	// Verifikasi stok bertambah
	updated, _ := uc.GetByID(ing.ID)
	assert.Equal(t, 200.0, updated.CurrentStock, "Stok harus bertambah 200")

	// Verifikasi expense yang dibuat HARUS:
	// - Category = "Bahan Baku" (BUKAN "Operasional")
	// - CostType = "variable"  (BUKAN "" kosong)
	var exp models.Expense
	result := db.Where("title LIKE ?", "Pembelian:%").First(&exp)
	assert.NoError(t, result.Error, "Expense harus terbuat otomatis")
	assert.Equal(t, "Bahan Baku", exp.Category,
		"BUG FIX: Category harus 'Bahan Baku', bukan 'Operasional'")
	assert.Equal(t, "variable", exp.CostType,
		"BUG FIX: CostType harus 'variable', bukan kosong")
	assert.Equal(t, 1_000_000.0, exp.Amount,
		"Amount harus = quantity * costPerUnit = 200 * 5000")
	assert.Contains(t, exp.Title, "Biji Kopi Arabica",
		"Title harus mengandung nama bahan baku")
}

// TestInventoryUsecase_NonPurchaseStockIn_NoExpense memverifikasi bahwa
// stock-in biasa (isPurchase=false) TIDAK membuat expense.
func TestInventoryUsecase_NonPurchaseStockIn_NoExpense(t *testing.T) {
	db := setupInventoryTestDB()
	defer func() { sqlDB, _ := db.DB(); sqlDB.Close() }()
	uc := createInventoryUsecase(db)

	ing, _ := uc.CreateIngredient(&entity.Ingredient{
		Name: "Air Mineral", Unit: "liter", CurrentStock: 10, MinStock: 1, CostPerUnit: 500,
	})

	// Adjustment/koreksi stok (bukan pembelian)
	err := uc.UpdateStock(ing.ID, "IN", 5, "Koreksi stok", false, false, 0)
	assert.NoError(t, err)

	var count int64
	db.Model(&models.Expense{}).Count(&count)
	assert.Equal(t, int64(0), count, "Non-purchase stock-in tidak boleh membuat expense")
}
