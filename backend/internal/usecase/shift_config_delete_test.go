package usecase

import (
	"testing"

	"singgah-pos-backend/internal/models"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// A0: guard hapus shift harus membaca shift_ids JSON "[1,2]" dan aman-substring
// (id 1 tidak boleh memblokir/memblokir id 11).
func setupTestShiftDeleteDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open sqlite in-memory db: %v", err)
	}
	if err := db.AutoMigrate(&models.ShiftConfig{}, &models.ProfitSharingPerson{}); err != nil {
		t.Fatalf("failed to migrate schema: %v", err)
	}
	return db
}

func TestShiftConfigDelete_GuardReferences(t *testing.T) {
	db := setupTestShiftDeleteDB(t)
	uc := NewShiftConfigUsecase(db)

	// Person A memakai shift 11 saja; person B memakai shift 1 dan 2.
	if err := db.Create(&models.ProfitSharingPerson{Name: "A", Role: "barista", ShiftIDs: "[11]"}).Error; err != nil {
		t.Fatalf("seed A: %v", err)
	}
	if err := db.Create(&models.ProfitSharingPerson{Name: "B", Role: "barista", ShiftIDs: "[1,2]"}).Error; err != nil {
		t.Fatalf("seed B: %v", err)
	}

	// Shift 1 dipakai B -> tolak.
	if err := uc.Delete(1, 1); err == nil {
		t.Errorf("Delete(1) harus ditolak karena dipakai person B")
	}
	// Shift 11 dipakai A -> tolak.
	if err := uc.Delete(11, 1); err == nil {
		t.Errorf("Delete(11) harus ditolak karena dipakai person A")
	}
	// Shift 2 dipakai B -> tolak (posisi akhir "[1,2]").
	if err := uc.Delete(2, 1); err == nil {
		t.Errorf("Delete(2) harus ditolak karena dipakai person B")
	}
	// Shift 3 tidak dipakai siapa pun -> lolos (aman-substring vs "[11]"/"[1,2]").
	if err := uc.Delete(3, 1); err != nil {
		t.Errorf("Delete(3) harus lolos, got: %v", err)
	}
}
