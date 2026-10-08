package usecase

import (
	"testing"
	"time"

	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/models"
)

// Bridge: kehadiran yang dicatat/disahkan di Jadwal & Shift harus tercermin
// di attendance JSON draft periode agar ikut hitungan pool bagi hasil.
func TestAttendanceSync_MirrorsToDraftPeriod(t *testing.T) {
	db := setupOpsDB(t)
	for _, m := range []interface{}{&models.ProfitSharingPeriod{}, &models.ProfitSharingPerson{}} {
		if err := db.AutoMigrate(m); err != nil {
			t.Fatalf("migrate: %v", err)
		}
	}
	seedBaristaShift(t, db)
	if err := db.Create(&models.ProfitSharingPeriod{
		OutletID: 1,
		PeriodStart: time.Date(2026, 10, 1, 0, 0, 0, 0, time.UTC),
		PeriodEnd:   time.Date(2026, 10, 31, 0, 0, 0, 0, time.UTC),
		Status: "draft", BasisType: "net", OwnerPct: 60,
	}).Error; err != nil {
		t.Fatalf("seed period: %v", err)
	}
	if err := db.Create(&models.ProfitSharingPerson{
		PeriodID: 1, Name: "RIO", Role: "barista", SharePct: 20, Attendance: "{}",
	}).Error; err != nil {
		t.Fatalf("seed person: %v", err)
	}

	auc := NewAttendanceUsecase(db)
	siuc := NewShiftInstanceUsecase(db)
	si, err := siuc.Create(1, 1, "2026-10-09", 1, "owner")
	if err != nil {
		t.Fatalf("create shift: %v", err)
	}
	// Catat luar jadwal (menunggu) lalu setujui.
	a := &entity.Attendance{OutletID: 1, ShiftInstanceID: si.ID, BaristaID: 1, BaristaName: "RIO", Status: "hadir_luar_jadwal", Alasan: "ganti jaga"}
	if err := auc.Record(a, 2, "manajer"); err != nil {
		t.Fatalf("record: %v", err)
	}
	if err := auc.Approve(a.ID, 1, 1, "owner"); err != nil {
		t.Fatalf("approve: %v", err)
	}

	var p models.ProfitSharingPerson
	if err := db.Where("period_id = ? AND name = ?", 1, "RIO").First(&p).Error; err != nil {
		t.Fatalf("load person: %v", err)
	}
	want := `"2026-10-09":[1]`
	if p.Attendance == "" || !containsSub(p.Attendance, want) {
		t.Errorf("attendance JSON draft harus memuat %s, got: %s", want, p.Attendance)
	}

	// Kehadiran yang ditolak sebelum approve tidak masuk JSON draft.
	si2, err := siuc.Create(1, 1, "2026-10-10", 1, "owner")
	if err != nil {
		t.Fatalf("create shift2: %v", err)
	}
	b := &entity.Attendance{OutletID: 1, ShiftInstanceID: si2.ID, BaristaID: 1, BaristaName: "RIO", Status: "hadir_luar_jadwal", Alasan: "coba"}
	if err := auc.Record(b, 2, "manajer"); err != nil {
		t.Fatalf("record b: %v", err)
	}
	if err := auc.Reject(b.ID, 1, 1, "owner", "tidak perlu"); err != nil {
		t.Fatalf("reject b: %v", err)
	}
	if err := db.Where("period_id = ? AND name = ?", 1, "RIO").First(&p).Error; err != nil {
		t.Fatalf("reload person: %v", err)
	}
	if containsSub(p.Attendance, "2026-10-10") {
		t.Errorf("tanggal yang ditolak tidak boleh ada di JSON, got: %s", p.Attendance)
	}
}

func containsSub(s, sub string) bool {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}
