package usecase

import (
	"testing"
	"time"

	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/models"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// Setup DB memori + 2 shift + 5 order untuk uji fairness harian.
func setupDailyDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("sqlite: %v", err)
	}
	if err := db.AutoMigrate(&models.Order{}, &models.OrderItem{}, &models.ShiftConfig{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	mk := func(n uint, tm time.Time, price, cost float64) {
		o := models.Order{OrderNumber: "T" + string(rune('0'+n)), Status: "Completed", OutletID: 1, OrderTime: tm}
		if err := db.Create(&o).Error; err != nil {
			t.Fatalf("order: %v", err)
		}
		db.Create(&models.OrderItem{OrderID: o.ID, Price: price, Quantity: 1, Cost: cost})
	}
	// PAGI 600rb/100k di 2 tanggal; MALAM 1jt/200k di 2 tanggal.
	mk(1, time.Date(2026, 10, 1, 10, 0, 0, 0, time.UTC), 600000, 100000)
	mk(2, time.Date(2026, 10, 2, 10, 0, 0, 0, time.UTC), 600000, 100000)
	mk(3, time.Date(2026, 10, 1, 20, 0, 0, 0, time.UTC), 1000000, 200000)
	mk(4, time.Date(2026, 10, 2, 20, 0, 0, 0, time.UTC), 1000000, 200000)
	// Order di celah jam 19:00:30 (PAGI berakhir 19:00, MALAM mulai 19:01).
	mk(5, time.Date(2026, 10, 1, 19, 0, 30, 0, time.UTC), 144000, 0)
	db.Create(&models.ShiftConfig{OutletID: 1, Name: "PAGI", StartTime: "07:00", EndTime: "19:00", OwnerPct: 60, BaristaPoolPct: 40, IsActive: true})
	db.Create(&models.ShiftConfig{OutletID: 1, Name: "MALAM", StartTime: "19:01", EndTime: "03:00", OwnerPct: 60, BaristaPoolPct: 40, IsActive: true})
	return db
}

func dailyPeople() []entity.ProfitSharingPerson {
	return []entity.ProfitSharingPerson{
		{Name: "RIO", Role: "barista", SharePct: 20, ShiftIDs: []uint{1, 2}, Attendance: `{"2026-10-01":[1,2]}`},
		{Name: "SALMAN", Role: "barista", SharePct: 20, ShiftIDs: []uint{1, 2}, Attendance: `{"2026-10-01":[1,2],"2026-10-02":[1,2]}`},
	}
}

// RIO hanya hadir 2026-10-01: ia hanya berhak atas pool tanggal itu.
// PAGI/hari: basis 500k -> pool 200k. MALAM/hari: basis 800k -> pool 320k.
// RIO = 100k + 160k = 260k. SALMAN = 100k+200k+160k+320k = 780k.
// Owner = 300k+300k+480k+480k = 1.560.000. SisaKas = 0.
func TestDailyFairness_PartialAttendance(t *testing.T) {
	db := setupDailyDB(t)
	uc := NewProfitSharingUsecase(db)
	people := dailyPeople()
	res, breakdown, err := uc.calcSharing(3344000, 600000, 0, 40, nil, 60, people, 0, 0, "gross", 2,
		"2026-10-01 00:00:00", "2026-10-02 23:59:59", 1)
	if err != nil {
		t.Fatalf("calcSharing: %v", err)
	}
	got := map[string]float64{}
	for _, p := range people {
		got[p.Name] = p.GrossAmount
	}
	if got["RIO"] != 260000 {
		t.Errorf("RIO harus 260000 (hanya 1 hari), got %v", got["RIO"])
	}
	if got["SALMAN"] != 780000 {
		t.Errorf("SALMAN harus 780000, got %v", got["SALMAN"])
	}
	if res.OwnerAmount != 1560000 {
		t.Errorf("owner harus 1560000, got %v", res.OwnerAmount)
	}
	if res.SisaKas != 0 {
		t.Errorf("sisa kas harus 0, got %v", res.SisaKas)
	}
	if len(breakdown) != 2 {
		t.Fatalf("breakdown harus 2 shift, got %d", len(breakdown))
	}
	// Selisih: order 144rb di celah 19:00:30 tak terpetakan ke shift mana pun.
	if res.SelisihPendapatan != 144000 {
		t.Errorf("selisih pendapatan harus 144000, got %v", res.SelisihPendapatan)
	}
	if res.SelisihCogs != 0 {
		t.Errorf("selisih cogs harus 0, got %v", res.SelisihCogs)
	}
}

// Invariansi: jumlah pool terdistribusi + sisa + owner shift = total basis shift.
func TestDailyFairness_Conservation(t *testing.T) {
	db := setupDailyDB(t)
	uc := NewProfitSharingUsecase(db)
	people := dailyPeople()
	res, breakdown, err := uc.calcSharing(3344000, 600000, 0, 40, nil, 60, people, 0, 0, "gross", 2,
		"2026-10-01 00:00:00", "2026-10-02 23:59:59", 1)
	if err != nil {
		t.Fatalf("calcSharing: %v", err)
	}
	var sumBasis, sumOwner, sumPool, sumSisa float64
	for _, b := range breakdown {
		sumBasis += b.SharingBasis
		sumOwner += b.OwnerShare
		sumPool += b.BaristaPool
		sumSisa += b.SisaKas
	}
	// Basis shift = PAGI 500k*2 + MALAM 800k*2 = 2.600.000
	if sumBasis != 2600000 {
		t.Errorf("total basis shift harus 2600000, got %v", sumBasis)
	}
	if sumOwner+sumPool+sumSisa != sumBasis {
		t.Errorf("owner+pool+sisa (%v) harus = basis (%v)", sumOwner+sumPool+sumSisa, sumBasis)
	}
	_ = res
}
