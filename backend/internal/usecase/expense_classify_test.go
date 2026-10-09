package usecase

import (
	"testing"
	"time"

	"singgah-pos-backend/internal/models"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupExpenseClassifyDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("sqlite: %v", err)
	}
	if err := db.AutoMigrate(&models.Expense{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	old := time.Now().AddDate(0, 0, -120)
	new1 := time.Now().AddDate(0, 0, -5)
	db.Create(&models.Expense{OutletID: 1, Title: "lama", Amount: 1000, Category: "Operasional", Date: old})
	db.Create(&models.Expense{OutletID: 1, Title: "baru", Amount: 2000, Category: "Operasional", Date: new1})
	db.Create(&models.Expense{OutletID: 1, Title: "sudah", Amount: 3000, Category: "Operasional", Date: new1, IsShared: true})
	return db
}

func TestClassifyBulkShared_Scope(t *testing.T) {
	db := setupExpenseClassifyDB(t)
	uc := NewExpenseUsecase(db)

	since := time.Now().AddDate(0, 0, -90).Format("2006-01-02")
	n, err := uc.expenseRepo.CountUnclassified(1, since)
	if err != nil {
		t.Fatalf("count: %v", err)
	}
	if n != 1 {
		t.Errorf("90 hari terakhir harus 1 (bukan 2 arsip), got %d", n)
	}

	start := time.Now().AddDate(0, 0, -30).Format("2006-01-02")
	end := time.Now().Format("2006-01-02")
	affected, err := uc.ClassifyBulkShared(1, start, end)
	if err != nil {
		t.Fatalf("classify: %v", err)
	}
	if affected != 1 {
		t.Errorf("harus 1 baris terdampak, got %d", affected)
	}

	if _, err := uc.ClassifyBulkShared(1, "", end); err == nil {
		t.Errorf("rentang kosong harus ditolak")
	}
}
