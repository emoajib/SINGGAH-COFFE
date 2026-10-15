package usecase

import (
	"testing"
	"time"

	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/models"
	"singgah-pos-backend/internal/repository/postgres"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// setupRangeDB menyiapkan DB memori dengan 2 shift dan order pada HARI PERTAMA
// (01 Okt) dan HARI TERAKHIR (14 Okt) periode — untuk menguji inklusivitas
// rentang tanggal (Bug A2) dan konservasi multi-shift (Bug B).
func setupRangeDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("sqlite: %v", err)
	}
	if err := db.AutoMigrate(&models.Order{}, &models.OrderItem{}, &models.ShiftConfig{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	mk := func(n uint, tm time.Time, price, cost float64) {
		o := models.Order{OrderNumber: "R" + string(rune('0'+n)), Status: "Completed", OutletID: 1, OrderTime: tm}
		if err := db.Create(&o).Error; err != nil {
			t.Fatalf("order: %v", err)
		}
		db.Create(&models.OrderItem{OrderID: o.ID, Price: price, Quantity: 1, Cost: cost})
	}
	mk(1, time.Date(2026, 10, 1, 10, 0, 0, 0, time.UTC), 1000000, 200000)
	mk(2, time.Date(2026, 10, 14, 10, 0, 0, 0, time.UTC), 1000000, 200000)
	db.Create(&models.ShiftConfig{OutletID: 1, Name: "PAGI", StartTime: "07:00", EndTime: "19:00", OwnerPct: 60, BaristaPoolPct: 40, IsActive: true})
	db.Create(&models.ShiftConfig{OutletID: 1, Name: "MALAM", StartTime: "19:01", EndTime: "03:00", OwnerPct: 60, BaristaPoolPct: 40, IsActive: true})
	return db
}

// TestFormatForDB_NoTimezoneShift (Bug A1): formatForDB TIDAK boleh menggeser
// tanggal. Sebelum fix, .UTC() memindah 01 Okt 00:00 WIB menjadi 30 Sep 17:00
// sehingga filter DATE() menarik hari di luar rentang yang dipilih.
func TestFormatForDB_NoTimezoneShift(t *testing.T) {
	start := parseDatePS("2026-10-01T00:00:00+07:00")
	end := parseDatePS("2026-10-14T23:59:00+07:00")
	if got := formatForDB(start); got != "2026-10-01 00:00:00" {
		t.Errorf("start bergeser: got %q, want %q", got, "2026-10-01 00:00:00")
	}
	if got := formatForDB(end); got != "2026-10-14 23:59:00" {
		t.Errorf("end bergeser: got %q, want %q", got, "2026-10-14 23:59:00")
	}
}

// TestMultiShift_LastDayIncluded (Bug A2): hari terakhir periode (14 Okt) harus
// ikut terpetakan. Sebelum fix, loop periodDates menambahkan komponen jam pada
// batas rentang sehingga 14 Okt terlewat dan Σ kartu shift < totalShiftRevenue.
func TestMultiShift_LastDayIncluded(t *testing.T) {
	db := setupRangeDB(t)
	uc := NewProfitSharingUsecase(db)
	people := []entity.ProfitSharingPerson{
		{Name: "RIO", Role: "barista", SharePct: 20, ShiftIDs: []uint{1, 2},
			Attendance: `{"2026-10-01":[1],"2026-10-14":[1]}`},
	}
	res, breakdown, err := uc.calcSharing(2000000, 400000, 0, 40, nil, 60, people, 0, 0, "gross", 14,
		"2026-10-01 00:00:00", "2026-10-14 23:59:00", 1)
	if err != nil {
		t.Fatalf("calcSharing: %v", err)
	}
	if res.SelisihPendapatan != 0 {
		t.Errorf("hari terakhir terlewat: selisih pendapatan = %v (harus 0)", res.SelisihPendapatan)
	}
	found := false
	for _, b := range breakdown {
		for _, d := range b.RincianHarian {
			if d.Tanggal == "2026-10-14" {
				found = true
			}
		}
	}
	if !found {
		t.Errorf("2026-10-14 tidak ada di rincian harian kartu shift")
	}
}

// TestMultiShift_OwnerAbsorbsCashbon (Bug B): di mode multi-shift, hak yang
// dipotong dari barista (kasbon) harus dipulihkan ke Owner agar tidak hilang.
// Sebelum fix: Owner hanya = out.Owner sehingga Rp150.000 bocor.
func TestMultiShift_OwnerAbsorbsCashbon(t *testing.T) {
	db := setupRangeDB(t)
	uc := NewProfitSharingUsecase(db)
	people := []entity.ProfitSharingPerson{
		{Name: "Owner", Role: "owner", SharePct: 60},
		{Name: "RIO", Role: "barista", SharePct: 20, ShiftIDs: []uint{1, 2},
			Attendance: `{"2026-10-01":[1],"2026-10-14":[1]}`, CashbonReduction: 150000},
	}
	res, _, err := uc.calcSharing(2000000, 400000, 0, 40, nil, 60, people, 0, 0, "gross", 14,
		"2026-10-01 00:00:00", "2026-10-14 23:59:00", 1)
	if err != nil {
		t.Fatalf("calcSharing: %v", err)
	}
	var rio, owner entity.ProfitSharingPerson
	for _, p := range people {
		switch p.Name {
		case "RIO":
			rio = p
		case "Owner":
			owner = p
		}
	}
	if rio.CashbonReduction != 150000 {
		t.Errorf("RIO CashbonReduction harus 150000, got %v", rio.CashbonReduction)
	}
	if rio.Amount != 490000 {
		t.Errorf("RIO Amount harus 490000, got %v", rio.Amount)
	}
	if owner.Amount != 1110000 {
		t.Errorf("Owner Amount harus 1110000 (960000+150000 kasbon), got %v", owner.Amount)
	}
	if res.OwnerAmount != owner.Amount {
		t.Errorf("res.OwnerAmount (%v) harus sama dengan Owner.Amount (%v)", res.OwnerAmount, owner.Amount)
	}
	if rio.Amount+owner.Amount != 1600000 {
		t.Errorf("konservasi rusak: RIO %v + Owner %v = %v, harus 1600000", rio.Amount, owner.Amount, rio.Amount+owner.Amount)
	}
}

// TestFindPendingByDateRange_DatesIncluded (Bug A3 + Bug C): rentang kasbon
// memakai DATE() sehingga konsisten dengan revenue/expense, hari di luar rentang
// dikecualikan, dan DUA kasbon barista yang sama sama-sama terambil (dijumlah).
func TestFindPendingByDateRange_DatesIncluded(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("sqlite: %v", err)
	}
	if err := db.AutoMigrate(&models.BaristaCashbon{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	repo := postgres.NewBaristaCashbonRepository(db)
	mk := func(name string, amount float64, d time.Time) {
		if err := db.Create(&models.BaristaCashbon{
			OutletID: 1, BaristaName: name, Amount: amount, CashbonDate: d, Status: "pending",
		}).Error; err != nil {
			t.Fatalf("create cashbon: %v", err)
		}
	}
	mk("RIO", 50000, time.Date(2026, 10, 12, 0, 0, 0, 0, time.UTC))
	mk("RIO", 50000, time.Date(2026, 10, 13, 0, 0, 0, 0, time.UTC))
	mk("SALMAN", 100000, time.Date(2026, 10, 8, 0, 0, 0, 0, time.UTC))
	mk("RIO", 99000, time.Date(2026, 9, 30, 0, 0, 0, 0, time.UTC)) // di LUAR rentang

	got, err := repo.FindPendingByDateRange("2026-10-01 00:00:00", "2026-10-14 23:59:00", 1)
	if err != nil {
		t.Fatalf("FindPendingByDateRange: %v", err)
	}
	if len(got) != 3 {
		t.Errorf("harus 3 kasbon dalam rentang (30 Sep dikecualikan), got %d", len(got))
	}
	var rioTotal float64
	for _, c := range got {
		if c.BaristaName == "RIO" {
			rioTotal += c.Amount
		}
	}
	if rioTotal != 100000 {
		t.Errorf("RIO harus 2 kasbon terjumlah = 100000, got %v", rioTotal)
	}
}
