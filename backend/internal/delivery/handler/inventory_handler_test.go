package handler

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"singgah-pos-backend/internal/delivery/request"
	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/models"
	"singgah-pos-backend/internal/usecase"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// Vetted by AI - Manual Review Required by Senior Engineer/Manager

func setupTestDBForInventoryHandler() *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		panic("Failed to connect to test database: " + err.Error())
	}
	db.AutoMigrate(&models.Ingredient{}, &models.StockMutation{}, &models.Expense{}, &models.Setting{}, &models.PSAKEventOutbox{})
	return db
}

func setupInventoryHandlerRouter(db *gorm.DB) (*gin.Engine, *InventoryHandler, *usecase.InventoryUsecase) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	invUsecase := usecase.NewInventoryUsecase(db)
	h := NewInventoryHandler(invUsecase)

	r.POST("/inventory/mutation", h.UpdateStock)
	return r, h, invUsecase
}

func TestInventoryHandler_UpdateStock_Out_ReducesStock(t *testing.T) {
	db := setupTestDBForInventoryHandler()
	defer func() { sqlDB, _ := db.DB(); sqlDB.Close() }()
	r, _, uc := setupInventoryHandlerRouter(db)

	// Buat bahan dengan stok awal 100 gram (kedai: 100, current: 100)
	ing, err := uc.CreateIngredient(&entity.Ingredient{
		Name:         "Kopi Arabika",
		Unit:         "gram",
		CurrentStock: 100,
		KedaiStock:   100,
		MinStock:     10,
		CostPerUnit:  200,
	})
	assert.NoError(t, err)

	// User input stok keluar 30 gram
	payload := request.StockMutationRequest{
		IngredientID: ing.ID,
		Type:         "OUT",
		Quantity:     30,
		Notes:        "Limbah tumpah",
		Location:     "kedai",
	}
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/inventory/mutation", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	// Verifikasi stok akhir HARUS berkurang menjadi 70, BUKAN bertambah menjadi 130!
	updated, err := uc.GetByID(ing.ID)
	assert.NoError(t, err)
	assert.Equal(t, 70.0, updated.CurrentStock, "Stok setelah OUT 30 gram harus 70 gram (bukan bertambah)")
	assert.Equal(t, 70.0, updated.KedaiStock, "Stok kedai setelah OUT 30 gram harus 70 gram")
}

func TestInventoryHandler_UpdateStock_AdjSub_ReducesStock(t *testing.T) {
	db := setupTestDBForInventoryHandler()
	defer func() { sqlDB, _ := db.DB(); sqlDB.Close() }()
	r, _, uc := setupInventoryHandlerRouter(db)

	// Stok sistem 100, hasil audit fisik 85 (selisih kurang 15)
	ing, err := uc.CreateIngredient(&entity.Ingredient{
		Name:         "Susu UHT",
		Unit:         "ml",
		CurrentStock: 100,
		KedaiStock:   100,
		MinStock:     10,
		CostPerUnit:  20,
	})
	assert.NoError(t, err)

	payload := request.StockMutationRequest{
		IngredientID: ing.ID,
		Type:         "ADJ_SUB",
		Quantity:     15,
		Notes:        "Audit fisik susut",
		Location:     "kedai",
	}
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/inventory/mutation", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	updated, err := uc.GetByID(ing.ID)
	assert.NoError(t, err)
	assert.Equal(t, 85.0, updated.CurrentStock, "Stok setelah ADJ_SUB 15 ml harus 85 ml (bukan 115 ml)")
	assert.Equal(t, 85.0, updated.KedaiStock, "Stok kedai setelah ADJ_SUB 15 ml harus 85 ml")
}

func TestInventoryHandler_UpdateStock_NegativeOrZeroQuantity_Rejected(t *testing.T) {
	db := setupTestDBForInventoryHandler()
	defer func() { sqlDB, _ := db.DB(); sqlDB.Close() }()
	r, _, _ := setupInventoryHandlerRouter(db)

	payload := request.StockMutationRequest{
		IngredientID: 1,
		Type:         "OUT",
		Quantity:     0,
		Location:     "kedai",
	}
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/inventory/mutation", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code, "Kuantitas <= 0 harus ditolak dengan 400 Bad Request")
}
