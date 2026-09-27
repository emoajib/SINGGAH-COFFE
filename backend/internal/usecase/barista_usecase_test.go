package usecase

import (
	"testing"

	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/models"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func setupTestBaristaDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open sqlite in-memory db: %v", err)
	}
	if err := db.AutoMigrate(&models.Barista{}); err != nil {
		t.Fatalf("failed to migrate schema: %v", err)
	}
	return db
}

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func TestBaristaUsecase_CRUD(t *testing.T) {
	db := setupTestBaristaDB(t)
	uc := NewBaristaUsecase(db)

	// 1. Test Create Barista
	b1 := &entity.Barista{
		OutletID:        1,
		Name:            "SALMAN",
		Phone:           "08123456789",
		DefaultSharePct: 20,
		BankAccount:     "BCA 12345678 a.n Salman",
		Status:          "active",
		Notes:           "Barista Utama",
	}
	if err := uc.Create(b1); err != nil {
		t.Fatalf("failed to create barista: %v", err)
	}
	if b1.ID == 0 {
		t.Errorf("expected barista ID to be generated, got 0")
	}

	// 2. Test Validation - Empty Name
	emptyNameBarista := &entity.Barista{
		OutletID: 1,
		Name:     "   ",
	}
	if err := uc.Create(emptyNameBarista); err == nil {
		t.Errorf("expected error when creating barista with empty name, got nil")
	}

	// 3. Test Validation - Invalid Share Pct
	invalidPctBarista := &entity.Barista{
		OutletID:        1,
		Name:            "RIO",
		DefaultSharePct: 150,
	}
	if err := uc.Create(invalidPctBarista); err == nil {
		t.Errorf("expected error when creating barista with share pct > 100, got nil")
	}

	// 4. Test Get All Baristas
	b2 := &entity.Barista{
		OutletID:        1,
		Name:            "RIO",
		Phone:           "08987654321",
		DefaultSharePct: 20,
		Status:          "active",
	}
	_ = uc.Create(b2)

	list, err := uc.GetAll(1, "all")
	if err != nil {
		t.Fatalf("failed to get baristas: %v", err)
	}
	if len(list) != 2 {
		t.Errorf("expected 2 baristas, got %d", len(list))
	}

	// 5. Test Update Barista Status
	b1.Status = "inactive"
	if err := uc.Update(b1); err != nil {
		t.Fatalf("failed to update barista: %v", err)
	}

	activeList, err := uc.GetAll(1, "active")
	if err != nil {
		t.Fatalf("failed to get active baristas: %v", err)
	}
	if len(activeList) != 1 {
		t.Errorf("expected 1 active barista, got %d", len(activeList))
	}

	// 6. Test Delete Barista
	if err := uc.Delete(b2.ID, 1); err != nil {
		t.Fatalf("failed to delete barista: %v", err)
	}
	afterDelete, _ := uc.GetAll(1, "all")
	if len(afterDelete) != 1 {
		t.Errorf("expected 1 barista after deletion, got %d", len(afterDelete))
	}
}
