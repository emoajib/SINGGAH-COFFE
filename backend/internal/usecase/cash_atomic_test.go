package usecase

import (
	"testing"
	"time"

	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/models"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// D1 regression: Buku Kas + outbox PSAK harus atomik.
// Dibuktikan dengan menghapus tabel outbox → insert outbox gagal →
// entri Buku Kas wajib ikut ter-rollback.
func TestCashBookUsecase_CreateRollbackWhenOutboxFails(t *testing.T) {
	db := setupSimulationDB(t)
	uc := NewCashBookUsecase(db)

	require.NoError(t, db.Migrator().DropTable(&models.PSAKEventOutbox{}))

	_, err := uc.Create(&entity.CashBook{
		Date:         time.Now(),
		Method:       "Cash",
		Type:         "income",
		SubType:      "investor_capital",
		InvestorName: "Investor A",
		Amount:       1000000,
		Description:  "Setoran modal",
	}, 1)
	assert.Error(t, err)

	var count int64
	db.Model(&models.CashBook{}).Count(&count)
	assert.Equal(t, int64(0), count, "Buku Kas tidak boleh tersimpan jika outbox gagal")
}

// Buku Kas + outbox harus tersimpan berpasangan pada jalur sukses.
func TestCashBookUsecase_CreateInvestorWritesOutbox(t *testing.T) {
	db := setupSimulationDB(t)
	uc := NewCashBookUsecase(db)

	resp, err := uc.Create(&entity.CashBook{
		Date:         time.Now(),
		Method:       "Cash",
		Type:         "income",
		SubType:      "investor_capital",
		InvestorName: "Investor B",
		Amount:       500000,
		Description:  "Setoran modal",
	}, 1)
	require.NoError(t, err)

	var outbox models.PSAKEventOutbox
	require.NoError(t, db.Where("event_type = ? AND reference_id = ?", "investor.capital_in", resp.ID).First(&outbox).Error)
	assert.Equal(t, "cash_book", outbox.ReferenceType)
	assert.Equal(t, "pending", outbox.Status)
}

// D1 regression: expense + Buku Kas atomik. Jika Buku Kas gagal ditulis,
// expense tidak boleh tersimpan (sebelumnya error ditelan).
func TestExpenseUsecase_CreateRollbackWhenCashBookFails(t *testing.T) {
	db := setupExpenseTestDB()
	uc := createExpenseUsecase(db)

	require.NoError(t, db.Migrator().DropTable(&models.CashBook{}))

	_, err := uc.Create(&entity.Expense{
		Title: "Beli Susu", Amount: 150000, Category: "Bahan Baku", CostType: "variable", PaymentMethod: "Cash",
	}, 1)
	assert.Error(t, err)

	var count int64
	db.Model(&models.Expense{}).Count(&count)
	assert.Equal(t, int64(0), count, "expense harus rollback jika Buku Kas gagal")
}

func setupCashbonTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(
		&models.BaristaCashbon{}, &models.CashBook{}, &models.Setting{}, &models.PSAKEventOutbox{},
	))
	return db
}

// D1 regression: kasbon + Buku Kas atomik.
func TestCashbonUsecase_CreateRollbackWhenCashBookFails(t *testing.T) {
	db := setupCashbonTestDB(t)
	defer func() { sqlDB, _ := db.DB(); sqlDB.Close() }()
	uc := NewCashbonUsecase(db)

	require.NoError(t, db.Migrator().DropTable(&models.CashBook{}))

	_, err := uc.Create(&entity.BaristaCashbon{
		BaristaName: "Rio", Amount: 50000, PaymentMethod: "Cash", Reason: "Darurat",
	}, 1)
	assert.Error(t, err)

	var count int64
	db.Model(&models.BaristaCashbon{}).Count(&count)
	assert.Equal(t, int64(0), count, "kasbon harus rollback jika Buku Kas gagal")
}

// Jalur sukses: kasbon Cash otomatis membuat entri Buku Kas.
func TestCashbonUsecase_CreateWritesCashBook(t *testing.T) {
	db := setupCashbonTestDB(t)
	defer func() { sqlDB, _ := db.DB(); sqlDB.Close() }()
	uc := NewCashbonUsecase(db)

	created, err := uc.Create(&entity.BaristaCashbon{
		BaristaName: "Rio", Amount: 75000, PaymentMethod: "Cash", Reason: "Darurat",
	}, 1)
	require.NoError(t, err)

	var cb models.CashBook
	require.NoError(t, db.Where("reference = ?", cashbonRef(created.ID)).First(&cb).Error)
	assert.Equal(t, 75000.0, cb.Amount)
	assert.Equal(t, "expense", cb.Type)
	assert.Equal(t, uint(1), cb.OutletID)
}
