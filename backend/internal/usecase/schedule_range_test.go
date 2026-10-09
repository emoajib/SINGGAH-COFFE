package usecase

import (
	"testing"
	"time"

	"singgah-pos-backend/internal/domain/entity"
)

func TestScheduleGetByRange(t *testing.T) {
	db := setupOpsDB(t)
	seedBaristaShift(t, db)
	uc := NewScheduleUsecase(db)
	mk := func(day int) {
		s := &entity.Schedule{OutletID: 1, BaristaID: 1, BaristaName: "RIO",
			Tanggal: time.Date(2026, 10, day, 0, 0, 0, 0, time.UTC),
			ShiftConfigID: 1, Status: "dijadwalkan"}
		if err := uc.repo.Create(s); err != nil {
			t.Fatalf("seed: %v", err)
		}
	}
	mk(1)
	mk(15)
	mk(31)

	rows, err := uc.GetByRange("2026-10-01", "2026-10-31", 1)
	if err != nil {
		t.Fatalf("range: %v", err)
	}
	if len(rows) != 3 {
		t.Errorf("harus 3 baris sebulan, got %d", len(rows))
	}
	part, err := uc.GetByRange("2026-10-01", "2026-10-10", 1)
	if err != nil || len(part) != 1 {
		t.Errorf("rentang parsial harus 1 baris, got %d err %v", len(part), err)
	}
	if _, err := uc.GetByRange("2026-01-01", "2026-12-31", 1); err == nil {
		t.Errorf("rentang >62 hari harus ditolak")
	}
	if _, err := uc.GetByRange("2026-10-10", "2026-10-01", 1); err == nil {
		t.Errorf("sampai < dari harus ditolak")
	}
}
