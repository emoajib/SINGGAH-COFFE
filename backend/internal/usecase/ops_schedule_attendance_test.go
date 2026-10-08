package usecase

import (
	"testing"
	"time"

	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/models"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupOpsDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("sqlite: %v", err)
	}
	if err := db.AutoMigrate(&models.Schedule{}, &models.Attendance{},
		&models.ShiftInstance{}, &models.ShiftConfig{}, &models.Barista{},
		&models.AuditLog{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	return db
}

func seedBaristaShift(t *testing.T, db *gorm.DB) {
	db.Create(&models.Barista{OutletID: 1, Name: "RIO", Status: "active"})
	db.Create(&models.ShiftConfig{OutletID: 1, Name: "Pagi", StartTime: "07:00", EndTime: "14:00", OwnerPct: 60, BaristaPoolPct: 40, IsActive: true})
}

func TestSchedule_DuplicateRejected(t *testing.T) {
	db := setupOpsDB(t)
	seedBaristaShift(t, db)
	uc := NewScheduleUsecase(db)
	s := &entity.Schedule{OutletID: 1, BaristaID: 1, Tanggal: time.Date(2026, 10, 9, 0, 0, 0, 0, time.UTC), ShiftConfigID: 1, Status: "dijadwalkan"}
	if err := uc.Create(s, 1, "owner"); err != nil {
		t.Fatalf("create pertama: %v", err)
	}
	dup := &entity.Schedule{OutletID: 1, BaristaID: 1, Tanggal: s.Tanggal, ShiftConfigID: 1, Status: "dijadwalkan"}
	if err := uc.Create(dup, 1, "owner"); err == nil {
		t.Errorf("jadwal ganda harus ditolak")
	}
	// Shift berbeda di tanggal sama tetap boleh (pagi+malam).
	db.Create(&models.ShiftConfig{OutletID: 1, Name: "Malam", StartTime: "14:00", EndTime: "22:00", OwnerPct: 60, BaristaPoolPct: 40, IsActive: true})
	other := &entity.Schedule{OutletID: 1, BaristaID: 1, Tanggal: s.Tanggal, ShiftConfigID: 2, Status: "dijadwalkan"}
	if err := uc.Create(other, 1, "owner"); err != nil {
		t.Errorf("shift berbeda harus boleh: %v", err)
	}
}

func TestAttendance_ApproveAntiDouble(t *testing.T) {
	db := setupOpsDB(t)
	seedBaristaShift(t, db)
	auc := NewAttendanceUsecase(db)
	siuc := NewShiftInstanceUsecase(db)
	si, err := siuc.Create(1, 1, "2026-10-09", 1, "owner")
	if err != nil {
		t.Fatalf("create shift: %v", err)
	}
	a := &entity.Attendance{OutletID: 1, ShiftInstanceID: si.ID, BaristaID: 1, BaristaName: "RIO", Status: "hadir_luar_jadwal", Alasan: "ganti jaga"}
	if err := auc.Record(a, 2, "manajer"); err != nil {
		t.Fatalf("record: %v", err)
	}
	if a.Disahkan {
		t.Errorf("luar jadwal belum boleh sah sebelum approve")
	}
	if err := auc.Approve(a.ID, 1, 1, "owner"); err != nil {
		t.Fatalf("approve pertama: %v", err)
	}
	if err := auc.Approve(a.ID, 1, 1, "owner"); err == nil {
		t.Errorf("approve ganda harus ditolak")
	}
}
