package usecase

import (
	"fmt"
	"testing"
	"time"

	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/models"
	"singgah-pos-backend/internal/repository/postgres"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// ⚠️ Vetted by SOSIOMEN - Manual Review Required by Senior Engineer/Manager
func setupSimulationDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)

	err = db.AutoMigrate(
		&models.User{},
		&models.Outlet{},
		&models.Ingredient{},
		&models.Product{},
		&models.RecipeItem{},
		&models.Order{},
		&models.OrderItem{},
		&models.Expense{},
		&models.CashRegister{},
		&models.CashBook{},
		&models.Setting{},
		&models.StockMutation{},
	)
	require.NoError(t, err)
	return db
}

func TestEndToEnd_CashFlowAndShiftSimulation(t *testing.T) {
	db := setupSimulationDB(t)

	// 1. Setup Outlet & User (Kasir / Manajer)
	outlet := models.Outlet{Name: "Singgah Coffee Pusat", Address: "Jl. Utama", Code: "pusat"}
	db.Create(&outlet)

	cashier := models.User{Name: "Ahmad Barista", Role: "cashier", OutletID: outlet.ID, Email: "ahmad@singgah.com", Password: "xyz"}
	db.Create(&cashier)

	// Setup Ingredient & Product with BOM Recipe
	beans := models.Ingredient{Name: "Espresso Beans", CurrentStock: 1000, Unit: "gram", CostPerUnit: 200, OutletID: outlet.ID}
	milk := models.Ingredient{Name: "Fresh Milk", CurrentStock: 5000, Unit: "ml", CostPerUnit: 20, OutletID: outlet.ID}
	db.Create(&beans)
	db.Create(&milk)

	product := models.Product{Name: "Kopi Susu Gula Aren", Price: 25000, Category: "Coffee", Sku: "KS-AREN"}
	db.Create(&product)

	db.Create(&models.RecipeItem{ProductID: product.ID, IngredientID: beans.ID, Quantity: 18})
	db.Create(&models.RecipeItem{ProductID: product.ID, IngredientID: milk.ID, Quantity: 120})

	// 2. Step 1: Buka Shift Kasir dengan Modal Rp 200.000
	regUC := NewCashRegisterUsecase(db)
	openReg, err := regUC.OpenCashRegister(cashier.ID, outlet.ID, &entity.CashRegister{
		OpeningAmount: 200000,
		Notes:         "Modal awal kasir pagi",
	})
	require.NoError(t, err)
	assert.Equal(t, 200000.0, openReg.OpeningAmount)
	assert.Equal(t, "open", openReg.Status)

	// 3. Step 2: Transaksi Penjualan CASH (2 Cup = Rp 50.000)
	orderUC := NewOrderUsecase(db)
	cashOrderReq := CreateOrderRequest{
		OrderNumber:   "ORD-CASH-001",
		PaymentMethod: "Cash",
		CashierName:   cashier.Name,
		Items: []struct {
			ProductID uint `json:"product_id"`
			Quantity  int  `json:"quantity"`
		}{
			{ProductID: product.ID, Quantity: 2},
		},
	}
	cashOrder, err := orderUC.Create(cashOrderReq, cashier.ID, cashier.Name, outlet.ID)
	require.NoError(t, err)
	assert.Equal(t, 50000.0, cashOrder.Order.TotalAmount)
	assert.Equal(t, "Paid", cashOrder.Order.PaymentStatus)

	// Verifikasi Stok Bahan Terpotong Otomatis via BOM (1000 - (18 * 2) = 964g)
	var updatedBeans models.Ingredient
	db.First(&updatedBeans, beans.ID)
	assert.Equal(t, 964.0, updatedBeans.CurrentStock)

	// 4. Step 3: Transaksi Penjualan QRIS (3 Cup = Rp 75.000)
	qrisOrderReq := CreateOrderRequest{
		OrderNumber:   "ORD-QRIS-002",
		PaymentMethod: "QRIS",
		CashierName:   cashier.Name,
		Items: []struct {
			ProductID uint `json:"product_id"`
			Quantity  int  `json:"quantity"`
		}{
			{ProductID: product.ID, Quantity: 3},
		},
	}
	qrisOrder, err := orderUC.Create(qrisOrderReq, cashier.ID, cashier.Name, outlet.ID)
	require.NoError(t, err)
	// Pelanggan selesai scan QRIS -> status lunas
	completedQris, err := orderUC.CompletePayment(qrisOrder.Order.ID, outlet.ID)
	require.NoError(t, err)
	assert.Equal(t, 75000.0, completedQris.TotalAmount)
	assert.Equal(t, "Paid", completedQris.PaymentStatus)

	// 5. Step 4: Pengeluaran Darurat dari Laci Kasir (Cash Rp 20.000)
	expenseUC := NewExpenseUsecase(db)
	_, err = expenseUC.Create(&entity.Expense{
		Title:         "Es Batu Kristal Darurat",
		Amount:        20000,
		Category:      "Operasional",
		PaymentMethod: "Cash",
		CostType:      "variable",
		Date:          time.Now(),
	}, outlet.ID)
	require.NoError(t, err)

	// 6. Step 5: Owner Beli Bahan dari Luar / Rekening Pribadi (Non-Cash Rp 300.000)
	_, err = expenseUC.Create(&entity.Expense{
		Title:         "Beli Biji Kopi 5kg (Dana Pribadi Owner)",
		Amount:        300000,
		Category:      "Operasional",
		PaymentMethod: "Lainnya",
		CostType:      "variable",
		Date:          time.Now(),
	}, outlet.ID)
	require.NoError(t, err)

	// 7. Step 6: Verifikasi Buku Kas (Cash Book)
	cashBookRepo := postgres.NewCashBookRepository(db)
	cashBooks, err := cashBookRepo.FindAllRange("", "", "", "", outlet.ID)
	require.NoError(t, err)
	for _, cb := range cashBooks {
		t.Logf("CashBook Entry: ID=%d OutletID=%d Method=%s Type=%s Amount=%.0f Desc=%s Ref=%s", cb.ID, cb.OutletID, cb.Method, cb.Type, cb.Amount, cb.Description, cb.Reference)
	}

	var totalIncomeCash, totalExpenseCash, totalIncomeQRIS, totalExpenseLainnya float64
	for _, cb := range cashBooks {
		if cb.Method == "Cash" && cb.Type == "income" {
			totalIncomeCash += cb.Amount
		}
		if cb.Method == "Cash" && cb.Type == "expense" {
			totalExpenseCash += cb.Amount
		}
		if cb.Method == "QRIS" && cb.Type == "income" {
			totalIncomeQRIS += cb.Amount
		}
		if cb.Method == "Lainnya" && cb.Type == "expense" {
			totalExpenseLainnya += cb.Amount
		}
	}

	assert.Equal(t, 250000.0, totalIncomeCash)     // Modal Awal (200.000) + Penjualan Cash (50.000)
	assert.Equal(t, 20000.0, totalExpenseCash)     // Pengeluaran Kasir
	assert.Equal(t, 75000.0, totalIncomeQRIS)      // Penjualan QRIS
	assert.Equal(t, 300000.0, totalExpenseLainnya) // Pembelian Luar Owner

	// 8. Step 7: Tutup Kasir (Close Shift)
	// Expected Cash Sistem = Modal Awal (200.000) + Cash Sales (50.000) = 250.000
	closedReg, err := regUC.CloseCashRegister(cashier.ID, 250000)
	require.NoError(t, err)
	assert.Equal(t, "closed", closedReg.Status)
	assert.Equal(t, 250000.0, *closedReg.ClosingAmount)
	assert.Equal(t, 250000.0, closedReg.ExpectedCash)
	assert.Equal(t, 0.0, closedReg.Variance) // Klop 100%!
	_ = fmt.Sprintf("All calculations verified successfully!")
}
