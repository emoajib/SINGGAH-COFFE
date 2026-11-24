package usecase

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"singgah-pos-backend/internal/delivery/request"
	"singgah-pos-backend/internal/models"
)

func setupStockOpnameTestDB() *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		panic(err)
	}
	db.AutoMigrate(&models.Ingredient{}, &models.StockOpname{}, &models.StockOpnameItem{})
	return db
}

func TestStockOpnameUsecase_CreateSuccess(t *testing.T) {
	db := setupStockOpnameTestDB()
	defer func() { sqlDB, _ := db.DB(); sqlDB.Close() }()
	uc := NewStockOpnameUsecase(db)

	ing := &models.Ingredient{Name: "Biji Kopi", Unit: "gram", CurrentStock: 100, KedaiStock: 50, MinStock: 10, CostPerUnit: 10}
	db.Create(ing)

	req := request.CreateStockOpnameRequest{
		PeriodFrom: time.Now(),
		PeriodTo:   time.Now(),
		Notes:      "test",
		Items: []request.StockOpnameItemInput{
			{IngredientID: ing.ID, PhysicalStock: 45, Note: "ok"},
		},
	}
	op, err := uc.Create(req, 1, 1)
	assert.NoError(t, err)
	assert.NotNil(t, op)
	assert.Len(t, op.Items, 1)
	assert.Equal(t, 50.0, op.Items[0].SystemStock)
	assert.Equal(t, -5.0, op.Items[0].Difference)
}
