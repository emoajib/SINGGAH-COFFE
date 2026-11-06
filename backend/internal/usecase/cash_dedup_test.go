package usecase

import (
	"sync"
	"testing"
	"time"

	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/models"
	"singgah-pos-backend/internal/repository/postgres"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

// setupDedupDB menyiapkan DB simulasi + unique index reference Buku Kas,
// meniru kondisi produksi (`ux_cash_books_reference`).
func setupDedupDB(t *testing.T) *gorm.DB {
	t.Helper()
	db := setupSimulationDB(t)
	require.NoError(t,
		db.Exec("CREATE UNIQUE INDEX ux_cash_books_reference ON cash_books (reference)").Error)
	return db
}

// D2 regression: insert-if-absent harus menolak reference duplikat tanpa error.
func TestCashBookRepository_CreateIfAbsent(t *testing.T) {
	db := setupDedupDB(t)
	repo := postgres.NewCashBookRepository(db)

	entry := &entity.CashBook{
		OutletID: 1, Date: time.Now(), Method: "Cash", Type: "income",
		Amount: 10000, Description: "Test", Reference: "order:1",
	}

	created, err := repo.CreateIfAbsent(entry)
	require.NoError(t, err)
	assert.True(t, created)

	duplicate := &entity.CashBook{
		OutletID: 1, Date: time.Now(), Method: "Cash", Type: "income",
		Amount: 10000, Description: "Test duplikat", Reference: "order:1",
	}
	created, err = repo.CreateIfAbsent(duplicate)
	require.NoError(t, err, "duplicate-key harus ditelan, bukan jadi error")
	assert.False(t, created)

	var count int64
	db.Model(&models.CashBook{}).Where("reference = ?", "order:1").Count(&count)
	assert.Equal(t, int64(1), count)
}

// D2 regression: EnsureOrderIncome dipanggil berulang / paralel hanya
// menghasilkan satu entri Buku Kas dan tidak pernah melempar duplicate-key error.
func TestCashBookUsecase_EnsureOrderIncomeIdempotent(t *testing.T) {
	db := setupDedupDB(t)
	uc := NewCashBookUsecase(db)

	o := &entity.Order{
		ID: 77, OrderNumber: "ORD-77", TotalAmount: 25000, PaymentMethod: "Cash",
		PaymentStatus: "Paid", Status: "Completed", OutletID: 1,
		OrderTime: time.Date(2026, 11, 6, 9, 0, 0, 0, time.UTC), CashierName: "Ari",
	}

	// Simulasi dua request paralel (SQLite diserialkan agar tidak lock).
	sqlDB, _ := db.DB()
	sqlDB.SetMaxOpenConns(1)

	var wg sync.WaitGroup
	errs := make([]error, 5)
	for i := 0; i < 5; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			errs[idx] = uc.EnsureOrderIncome(o, 1)
		}(i)
	}
	wg.Wait()

	for _, err := range errs {
		assert.NoError(t, err)
	}

	var count int64
	db.Model(&models.CashBook{}).Where("reference = ?", "order:77").Count(&count)
	assert.Equal(t, int64(1), count, "penjualan tidak boleh tercatat ganda di Buku Kas")
}

// D2 regression: selisih tutup kas (EnsureRegisterClose) juga idempoten
// walaupun unique index sudah berisi reference yang sama.
func TestCashBookUsecase_EnsureRegisterCloseIdempotent(t *testing.T) {
	db := setupDedupDB(t)
	uc := NewCashBookUsecase(db)

	cr := &entity.CashRegister{ID: 9, CashierName: "Rio", Variance: -15000}

	require.NoError(t, uc.EnsureRegisterClose(cr, 1))
	require.NoError(t, uc.EnsureRegisterClose(cr, 1))

	var count int64
	db.Model(&models.CashBook{}).Where("reference = ?", "cash-register-close:9").Count(&count)
	assert.Equal(t, int64(1), count)
}
