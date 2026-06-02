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

func setupProductTestDB() *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		panic("Failed to connect to database: " + err.Error())
	}
	db.AutoMigrate(&models.Product{}, &models.Ingredient{}, &models.RecipeItem{})
	return db
}

func createProductUsecase(db *gorm.DB) *ProductUsecase {
	return NewProductUsecase(db)
}

func seedIngredient(db *gorm.DB, name, unit string, costPerUnit float64) *entity.Ingredient {
	ing := &entity.Ingredient{
		Name:        name,
		Unit:        unit,
		CostPerUnit: costPerUnit,
		CurrentStock: 1000,
		MinStock:    100,
	}
	db.Create(ing)
	return ing
}

func TestProductUsecase_CreateSuccess(t *testing.T) {
	db := setupProductTestDB()
	defer func() { sqlDB, _ := db.DB(); sqlDB.Close() }()
	uc := createProductUsecase(db)

	ing := seedIngredient(db, "Kopi Bubuk", "gram", 100)

	req := CreateProductRequest{
		Name:     "Kopi Susu",
		Category: "Minuman",
		Price:    25000,
		Stock:    100,
		Sku:      "KOPI-001",
		Recipe: []struct {
			IngredientID uint    `json:"ingredient_id"`
			Quantity     float64 `json:"quantity"`
		}{
			{IngredientID: ing.ID, Quantity: 20},
		},
	}

	resp, err := uc.Create(req)

	assert.NoError(t, err)
	assert.NotNil(t, resp)
	assert.Equal(t, "Kopi Susu", resp.Name)
	assert.Equal(t, "Minuman", resp.Category)
	assert.Equal(t, 25000.0, resp.Price)
	assert.Equal(t, 2000.0, resp.Cost) // 20 * 100
	assert.Equal(t, "KOPI-001", resp.Sku)
	assert.Len(t, resp.Recipe, 1)
}

func TestProductUsecase_GetAllEmpty(t *testing.T) {
	db := setupProductTestDB()
	defer func() { sqlDB, _ := db.DB(); sqlDB.Close() }()
	uc := createProductUsecase(db)

	products, err := uc.GetAll(10, 0)

	assert.NoError(t, err)
	assert.NotNil(t, products)
	assert.Len(t, products, 0)
}

func TestProductUsecase_GetAllWithData(t *testing.T) {
	db := setupProductTestDB()
	defer func() { sqlDB, _ := db.DB(); sqlDB.Close() }()
	uc := createProductUsecase(db)

	uc.Create(CreateProductRequest{
		Name: "Kopi Hitam", Category: "Minuman", Price: 15000, Stock: 50, Sku: "KOPI-002",
	})
	uc.Create(CreateProductRequest{
		Name: "Teh Manis", Category: "Minuman", Price: 10000, Stock: 50, Sku: "TEH-001",
	})

	products, err := uc.GetAll(10, 0)

	assert.NoError(t, err)
	assert.Len(t, products, 2)
}

func TestProductUsecase_GetByIDSuccess(t *testing.T) {
	db := setupProductTestDB()
	defer func() { sqlDB, _ := db.DB(); sqlDB.Close() }()
	uc := createProductUsecase(db)

	created, _ := uc.Create(CreateProductRequest{
		Name: "Cappuccino", Category: "Minuman", Price: 30000, Stock: 50, Sku: "CAP-001",
	})

	resp, err := uc.GetByID(created.ID)

	assert.NoError(t, err)
	assert.NotNil(t, resp)
	assert.Equal(t, "Cappuccino", resp.Name)
}

func TestProductUsecase_GetByIDNotFound(t *testing.T) {
	db := setupProductTestDB()
	defer func() { sqlDB, _ := db.DB(); sqlDB.Close() }()
	uc := createProductUsecase(db)

	_, err := uc.GetByID(999)

	assert.Error(t, err)
	assert.ErrorIs(t, err, errors.ErrNotFound)
}

func TestProductUsecase_UpdateSuccess(t *testing.T) {
	db := setupProductTestDB()
	defer func() { sqlDB, _ := db.DB(); sqlDB.Close() }()
	uc := createProductUsecase(db)

	created, _ := uc.Create(CreateProductRequest{
		Name: "Old Name", Category: "Minuman", Price: 20000, Stock: 50, Sku: "OLD-001",
	})

	req := CreateProductRequest{
		Name: "New Name", Category: "Makanan", Price: 25000, Stock: 100, Sku: "OLD-001",
	}
	resp, err := uc.Update(created.ID, req)

	assert.NoError(t, err)
	assert.Equal(t, "New Name", resp.Name)
	assert.Equal(t, "Makanan", resp.Category)
	assert.Equal(t, 25000.0, resp.Price)
}

func TestProductUsecase_UpdateNotFound(t *testing.T) {
	db := setupProductTestDB()
	defer func() { sqlDB, _ := db.DB(); sqlDB.Close() }()
	uc := createProductUsecase(db)

	_, err := uc.Update(999, CreateProductRequest{
		Name: "Ghost", Category: "X", Price: 100, Stock: 1, Sku: "NONE",
	})

	assert.Error(t, err)
	assert.ErrorIs(t, err, errors.ErrNotFound)
}

func TestProductUsecase_DeleteSuccess(t *testing.T) {
	db := setupProductTestDB()
	defer func() { sqlDB, _ := db.DB(); sqlDB.Close() }()
	uc := createProductUsecase(db)

	created, _ := uc.Create(CreateProductRequest{
		Name: "To Delete", Category: "Test", Price: 10000, Stock: 10, Sku: "DEL-001",
	})

	err := uc.Delete(created.ID)
	assert.NoError(t, err)

	products, _ := uc.GetAll(10, 0)
	assert.Len(t, products, 0)
}

func TestProductUsecase_CreateWithRecipeCalculatesCost(t *testing.T) {
	db := setupProductTestDB()
	defer func() { sqlDB, _ := db.DB(); sqlDB.Close() }()
	uc := createProductUsecase(db)

	kopi := seedIngredient(db, "Kopi Bubuk", "gram", 150)
	susu := seedIngredient(db, "Susu Cair", "ml", 50)

	req := CreateProductRequest{
		Name: "Kopi Susu Aren", Category: "Minuman", Price: 35000, Stock: 50, Sku: "KSA-001",
		Recipe: []struct {
			IngredientID uint    `json:"ingredient_id"`
			Quantity     float64 `json:"quantity"`
		}{
			{IngredientID: kopi.ID, Quantity: 15},
			{IngredientID: susu.ID, Quantity: 200},
		},
	}

	resp, err := uc.Create(req)

	assert.NoError(t, err)
	expectedCost := (15 * 150) + (200 * 50) // 2250 + 10000 = 12250
	assert.Equal(t, float64(expectedCost), resp.Cost)
	assert.Len(t, resp.Recipe, 2)
}
