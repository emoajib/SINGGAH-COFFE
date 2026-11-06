package usecase

import (
	"strconv"
	"sync"
	"testing"

	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/domain/errors"
	"singgah-pos-backend/internal/models"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupI1DB(t *testing.T) *gorm.DB {
	t.Helper()
	db := setupOrderTestDB()
	require.NoError(t, db.AutoMigrate(&models.ProcessedWebhook{}))
	require.NoError(t, db.Create(&models.Setting{Key: "xendit_callback_token", Value: "secret"}).Error)
	return db
}

// I1: dua transaksi bersamaan yang memperebutkan stok terakhir tidak boleh
// menghasilkan stok minus. Hanya satu yang berhasil.
func TestI1_ConcurrentStockDeductionNeverNegative(t *testing.T) {
	db := setupI1DB(t)
	defer func() { sqlDB, _ := db.DB(); sqlDB.Close() }()

	sqlDB, _ := db.DB()
	sqlDB.SetMaxOpenConns(1) // SQLite: serialkan koneksi agar tidak "database is locked"

	uc := createOrderUsecase(db)

	product := &models.Product{Name: "Air Mineral", Sku: "I1-AM-001", Price: 5000, Cost: 2000, Stock: 1}
	require.NoError(t, db.Create(product).Error)

	mkReq := func(orderNumber string) CreateOrderRequest {
		return CreateOrderRequest{
			OrderNumber:   orderNumber,
			PaymentMethod: "Cash",
			CashierName:   "Kasir I1",
			Items: []struct {
				ProductID uint `json:"product_id"`
				Quantity  int  `json:"quantity"`
			}{{ProductID: product.ID, Quantity: 1}},
		}
	}

	var wg sync.WaitGroup
	results := make([]error, 2)
	for i := 0; i < 2; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			_, results[idx] = uc.Create(mkReq([]string{"ORD-I1-A", "ORD-I1-B"}[idx]), 1, "Kasir I1", 1)
		}(i)
	}
	wg.Wait()

	success := 0
	for _, err := range results {
		if err == nil {
			success++
		}
	}
	assert.Equal(t, 1, success, "hanya satu transaksi yang boleh memakai stok terakhir")

	var updated models.Product
	require.NoError(t, db.First(&updated, product.ID).Error)
	assert.Equal(t, 0, updated.Stock, "stok tidak boleh minus")
	assert.GreaterOrEqual(t, updated.Stock, 0)
}

// I1: replay webhook yang sama tidak boleh memotong stok atau mencatat
// pendapatan dua kali.
func TestI1_WebhookReplayDeductsStockOnce(t *testing.T) {
	db := setupI1DB(t)
	defer func() { sqlDB, _ := db.DB(); sqlDB.Close() }()

	uc := createOrderUsecase(db)

	ing := &entity.Ingredient{
		Name: "Kopi I1", Unit: "gram", CurrentStock: 1000, KedaiStock: 1000,
		MinStock: 100, CostPerUnit: 100,
	}
	require.NoError(t, db.Create(ing).Error)
	prodID := seedProductWithRecipe(db, "Kopi Susu I1", "I1-KS-001", 20000, ing.ID, 20)

	created, err := uc.Create(CreateOrderRequest{
		OrderNumber:   "ORD-I1-WH",
		PaymentMethod: "QRIS",
		CashierName:   "Kasir I1",
		Items: []struct {
			ProductID uint `json:"product_id"`
			Quantity  int  `json:"quantity"`
		}{{ProductID: prodID, Quantity: 1}},
	}, 1, "Kasir I1", 1)
	require.NoError(t, err)

	wh := NewWebhookUsecase(db)
	payload := XenditCallback{
		ID: "wh-i1-replay", ExternalID: "ORD-I1-WH", Status: "PAID",
		PaidAmount: created.Order.TotalAmount,
	}

	require.NoError(t, wh.ProcessXenditWebhook("secret", payload))
	require.NoError(t, wh.ProcessXenditWebhook("secret", payload), "replay harus no-op")

	var afterIng entity.Ingredient
	require.NoError(t, db.First(&afterIng, ing.ID).Error)
	assert.Equal(t, 980.0, afterIng.CurrentStock, "stok hanya boleh terpotong sekali")

	var mutations int64
	db.Model(&models.StockMutation{}).Where("ingredient_id = ?", ing.ID).Count(&mutations)
	assert.Equal(t, int64(1), mutations)

	var incomes int64
	db.Model(&models.CashBook{}).Where("reference = ?", "order:"+strconv.FormatUint(uint64(created.Order.ID), 10)).Count(&incomes)
	assert.Equal(t, int64(1), incomes, "pendapatan tidak boleh tercatat ganda")
}

// I1: operasi lintas outlet harus ditolak (NotFound) dan tidak mengubah data.
func TestI1_VoidCrossOutletRejected(t *testing.T) {
	db := setupI1DB(t)
	defer func() { sqlDB, _ := db.DB(); sqlDB.Close() }()

	uc := createOrderUsecase(db)

	product := &models.Product{Name: "Teh Botol", Sku: "I1-TB-001", Price: 6000, Cost: 3000, Stock: 10}
	require.NoError(t, db.Create(product).Error)

	created, err := uc.Create(CreateOrderRequest{
		OrderNumber:   "ORD-I1-XOUT",
		PaymentMethod: "Cash",
		CashierName:   "Kasir Outlet 1",
		Items: []struct {
			ProductID uint `json:"product_id"`
			Quantity  int  `json:"quantity"`
		}{{ProductID: product.ID, Quantity: 1}},
	}, 1, "Kasir Outlet 1", 1)
	require.NoError(t, err)

	_, err = uc.Void(created.Order.ID, 2)
	assert.ErrorIs(t, err, errors.ErrNotFound)

	var reloaded models.Order
	require.NoError(t, db.First(&reloaded, created.Order.ID).Error)
	assert.NotEqual(t, "Void", reloaded.Status, "order outlet lain tidak boleh ter-void")

	var updated models.Product
	require.NoError(t, db.First(&updated, product.ID).Error)
	assert.Equal(t, 9, updated.Stock, "stok tidak boleh berubah karena void ditolak")
}

// I1: transfer stok ganda dengan kunci idempoten yang sama tidak memindahkan
// stok dua kali (retry aman).
func TestI1_TransferRetryIsSafe(t *testing.T) {
	db := setupInventoryTestDB()
	defer func() { sqlDB, _ := db.DB(); sqlDB.Close() }()
	uc := createInventoryUsecase(db)

	ing, err := uc.CreateIngredient(&entity.Ingredient{
		Name: "Susu I1", Unit: "ml", CurrentStock: 200, WarehouseStock: 200,
		KedaiStock: 0, MinStock: 10, CostPerUnit: 20,
	}, 1)
	require.NoError(t, err)

	require.NoError(t, uc.TransferStock(ing.ID, 50, "warehouse", "kedai", "retry", "i1-trf-1", 1))
	require.NoError(t, uc.TransferStock(ing.ID, 50, "warehouse", "kedai", "retry", "i1-trf-1", 1))

	got, err := uc.GetByID(ing.ID)
	require.NoError(t, err)
	assert.Equal(t, 150.0, got.WarehouseStock)
	assert.Equal(t, 50.0, got.KedaiStock)
}
