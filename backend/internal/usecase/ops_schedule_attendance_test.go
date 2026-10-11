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

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func seedBaristaShift(t *testing.T, db *gorm.DB) {
	t.Helper()
	if err := db.Create(&models.Barista{OutletID: 1, Name: "RIO", Status: "active"}).Error; err != nil {
		t.Fatalf("seed barista: %v", err)
	}
	if err := db.Create(&models.ShiftConfig{OutletID: 1, Name: "Pagi", StartTime: "07:00", EndTime: "14:00", OwnerPct: 60, BaristaPoolPct: 40, IsActive: true}).Error; err != nil {
		t.Fatalf("seed shift config: %v", err)
	}
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

// TestSchedule_QuickSetDay menguji penetapan cepat jadwal: P, M, P+M, Libur, dan Clear.
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func TestSchedule_QuickSetDay(t *testing.T) {
	db := setupOpsDB(t)
	seedBaristaShift(t, db) // Shift 1: Pagi
	db.Create(&models.ShiftConfig{OutletID: 1, Name: "Malam", StartTime: "14:00", EndTime: "22:00", OwnerPct: 60, BaristaPoolPct: 40, IsActive: true}) // Shift 2: Malam
	uc := NewScheduleUsecase(db)

	tgl := "2026-10-11"

	// 1. Set multi-shift: P + M
	if err := uc.QuickSetDay(1, 1, tgl, "shift", []uint{1, 2}, 1, "owner"); err != nil {
		t.Fatalf("quick set multi-shift: %v", err)
	}
	list, err := uc.GetByDate(tgl, 1)
	if err != nil {
		t.Fatalf("get by date: %v", err)
	}
	if len(list) != 2 {
		t.Fatalf("harus ada 2 jadwal (P+M), didapat %d", len(list))
	}

	// 2. Ubah menjadi Pagi saja
	if err := uc.QuickSetDay(1, 1, tgl, "shift", []uint{1}, 1, "owner"); err != nil {
		t.Fatalf("quick set shift 1: %v", err)
	}
	list, _ = uc.GetByDate(tgl, 1)
	if len(list) != 1 || list[0].ShiftConfigID != 1 {
		t.Fatalf("harus ada 1 jadwal (Pagi saja), didapat %d", len(list))
	}

	// 3. Ubah menjadi Malam saja
	if err := uc.QuickSetDay(1, 1, tgl, "shift", []uint{2}, 1, "owner"); err != nil {
		t.Fatalf("quick set shift 2: %v", err)
	}
	list, _ = uc.GetByDate(tgl, 1)
	if len(list) != 1 || list[0].ShiftConfigID != 2 {
		t.Fatalf("harus ada 1 jadwal (Malam saja), didapat %d", len(list))
	}

	// 4. Ubah menjadi Libur
	if err := uc.QuickSetDay(1, 1, tgl, "libur", nil, 1, "owner"); err != nil {
		t.Fatalf("quick set libur: %v", err)
	}
	list, _ = uc.GetByDate(tgl, 1)
	if len(list) == 0 || list[0].Status != "libur" {
		t.Fatalf("harus berstatus libur, didapat %+v", list)
	}

	// 5. Clear (hapus jadwal)
	if err := uc.QuickSetDay(1, 1, tgl, "clear", nil, 1, "owner"); err != nil {
		t.Fatalf("quick set clear: %v", err)
	}
	list, _ = uc.GetByDate(tgl, 1)
	if len(list) != 0 {
		t.Fatalf("jadwal harus kosong setelah clear, didapat %d", len(list))
	}
}

