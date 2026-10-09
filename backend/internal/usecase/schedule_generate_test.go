package usecase

import (
	"testing"
	"time"

	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/models"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupGenerateDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("sqlite: %v", err)
	}
	if err := db.AutoMigrate(&models.Schedule{}, &models.Barista{}, &models.ShiftConfig{}, &models.AuditLog{}, &models.ScheduleRequest{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	db.Create(&models.Barista{OutletID: 1, Name: "RIO", Status: "active"})
	db.Create(&models.Barista{OutletID: 1, Name: "SALMAN", Status: "active"})
	db.Create(&models.Barista{OutletID: 1, Name: "X", Status: "inactive"})
	db.Create(&models.ShiftConfig{OutletID: 1, Name: "PAGI", StartTime: "07:00", EndTime: "19:00", OwnerPct: 60, BaristaPoolPct: 40, IsActive: true})
	db.Create(&models.ShiftConfig{OutletID: 1, Name: "MALAM", StartTime: "19:00", EndTime: "03:00", OwnerPct: 60, BaristaPoolPct: 40, IsActive: true})
	return db
}

// Oktober 2026 = 31 hari. 2 barista aktif x 2 shift x 31 = 124 (nonaktif dikecualikan).
func TestGenerateMonth_FullAndIdempotent(t *testing.T) {
	db := setupGenerateDB(t)
	uc := NewScheduleUsecase(db)
	dibuat, dilewati, err := uc.GenerateMonth(1, "2026-10", "dijadwalkan", false, true, 1, "owner")
	if err != nil {
		t.Fatalf("generate: %v", err)
	}
	if dibuat != 124 || dilewati != 0 {
		t.Errorf("harus dibuat=124 dilewati=0, got %d/%d", dibuat, dilewati)
	}
	dibuat2, dilewati2, err := uc.GenerateMonth(1, "2026-10", "dijadwalkan", false, true, 1, "owner")
	if err != nil {
		t.Fatalf("generate ulang: %v", err)
	}
	if dibuat2 != 0 || dilewati2 != 124 {
		t.Errorf("generate ulang harus 0/124, got %d/%d", dibuat2, dilewati2)
	}
	var n int64
	db.Model(&models.Schedule{}).Count(&n)
	if n != 124 {
		t.Errorf("total baris harus 124, got %d", n)
	}
}

func TestGenerateMonth_WeekendOff(t *testing.T) {
	db := setupGenerateDB(t)
	uc := NewScheduleUsecase(db)
	dibuat, _, err := uc.GenerateMonth(1, "2026-10", "dijadwalkan", true, true, 1, "owner")
	if err != nil {
		t.Fatalf("generate: %v", err)
	}
	// Oktober 2026 punya 9 hari Sabtu-Minggu -> 9*4 libur, sisanya 22*4 masuk.
	if dibuat != 124 {
		t.Errorf("harus tetap 124 baris (22 masuk + 9 libur) x4, got %d", dibuat)
	}
	var libur int64
	db.Model(&models.Schedule{}).Where("status = ?", "libur").Count(&libur)
	if libur != 36 {
		t.Errorf("hari libur harus 36, got %d", libur)
	}
	if _, _, err := uc.GenerateMonth(1, "10-2026", "dijadwalkan", false, true, 1, "owner"); err == nil {
		t.Errorf("format bulan salah harus ditolak")
	}
	if _, _, err := uc.GenerateMonth(1, "2026-10", "ngawur", false, true, 1, "owner"); err == nil {
		t.Errorf("status salah harus ditolak")
	}
}

func TestGenerateMonth_HonorsRequests(t *testing.T) {
	db := setupGenerateDB(t)
	if err := db.AutoMigrate(&models.ScheduleRequest{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	uc := NewScheduleUsecase(db)
	// RIO libur 2026-10-05 semua shift; SALMAN izin 2026-10-06 shift PAGI (id 1) saja.
	if err := uc.requests.Create(&entity.ScheduleRequest{OutletID: 1, BaristaID: 1, BaristaName: "RIO",
		Tanggal: time.Date(2026, 10, 5, 0, 0, 0, 0, time.UTC), Jenis: "libur"}); err != nil {
		t.Fatalf("request: %v", err)
	}
	pagi := uint(1)
	if err := uc.requests.Create(&entity.ScheduleRequest{OutletID: 1, BaristaID: 2, BaristaName: "SALMAN",
		Tanggal: time.Date(2026, 10, 6, 0, 0, 0, 0, time.UTC), ShiftConfigID: &pagi, Jenis: "izin"}); err != nil {
		t.Fatalf("request: %v", err)
	}
	if _, _, err := uc.GenerateMonth(1, "2026-10", "dijadwalkan", false, true, 1, "owner"); err != nil {
		t.Fatalf("generate: %v", err)
	}
	var rio []models.Schedule
	db.Where("barista_id = ? AND DATE(tanggal) = DATE(?)", 1, "2026-10-05").Find(&rio)
	if len(rio) != 2 {
		t.Fatalf("RIO 5 Okt harus 2 baris, got %d", len(rio))
	}
	for _, sc := range rio {
		if sc.Status != "libur" {
			t.Errorf("RIO 5 Okt harus libur, got %s", sc.Status)
		}
	}
	var salman []models.Schedule
	db.Where("barista_id = ? AND DATE(tanggal) = DATE(?)", 2, "2026-10-06").Order("shift_config_id ASC").Find(&salman)
	if len(salman) != 2 || salman[0].Status != "izin" || salman[1].Status != "dijadwalkan" {
		t.Errorf("SALMAN 6 Okt harus izin+PAGI/dijadwalkan+MALAM, got %+v", salman)
	}
}
