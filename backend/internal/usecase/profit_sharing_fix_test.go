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

// TestCalculatePeriod_PendingCashbonAppliedRegardlessOfDate: Kasbon aktif (pending)
// barista wajib otomatis memotong bagi hasil pada outlet bersangkutan, meskipun
// tanggal kasbon dibuat setelah tanggal akhir periode (misal dicatat tgl 11 Nov untuk periode 1-10 Nov).
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func TestCalculatePeriod_PendingCashbonAppliedRegardlessOfDate(t *testing.T) {
	db := setupRangeDB(t)
	if err := db.AutoMigrate(&models.BaristaCashbon{}, &models.Setting{}, &models.Expense{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	// Buat kasbon aktif untuk SALMAN pada 15 Okt (setelah akhir periode 1-14 Okt)
	if err := db.Create(&models.BaristaCashbon{
		OutletID: 1, BaristaName: "SALMAN", Amount: 150000,
		CashbonDate: time.Date(2026, 10, 15, 8, 0, 0, 0, time.UTC), Status: "pending",
	}).Error; err != nil {
		t.Fatalf("create cashbon: %v", err)
	}

	uc := NewProfitSharingUsecase(db)
	people := []entity.ProfitSharingPerson{
		{Name: "Owner", Role: "owner", SharePct: 60},
		{Name: "ADIL", Role: "barista", SharePct: 20},
		{Name: "RIO", Role: "barista", SharePct: 20},
		{Name: "SALMAN", Role: "barista", SharePct: 20},
	}

	pc, err := uc.calculatePeriod("2026-10-01T00:00:00+07:00", "2026-10-14T23:59:00+07:00", 1, 40, "gross", 60, people)
	if err != nil {
		t.Fatalf("calculatePeriod: %v", err)
	}

	var salmanResult entity.ProfitSharingPerson
	for _, p := range people {
		if p.Name == "SALMAN" {
			salmanResult = p
		}
	}

	// Pasal 13 Ayat 2: potongan kasbon maks 50% dari bagi hasil barista.
	// SALMAN kasbon 150000 tapi share-nya terbatas → cap di 50% share.
	// Yang penting: kasbon pending tetap terdeteksi (> 0), dan di-cap sesuai Pasal 13.
	if salmanResult.CashbonReduction <= 0 {
		t.Errorf("SALMAN CashbonReduction harus > 0 (kasbon pending terdeteksi), got %v", salmanResult.CashbonReduction)
	}
	if salmanResult.CashbonReduction > roundIDR(salmanResult.GrossAmount*0.5) {
		t.Errorf("SALMAN CashbonReduction %v melebihi 50%% share %v (Pasal 13 Ayat 2)", salmanResult.CashbonReduction, salmanResult.GrossAmount)
	}
	_ = pc
}


// TestCashbonCap50Pct_SinglePool (Pasal 13 Ayat 2): potongan kasbon barista
// paling banyak 50% dari bagi hasilnya. Sisa kasbon dibawa ke periode berikut.
// Contoh: bagi hasil barista Rp300.000, kasbon Rp200.000 → dipotong maks Rp150.000.
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func TestCashbonCap50Pct_SinglePool(t *testing.T) {
	basis := 1000000.0
	cogs := 200000.0
	expenses := 0.0
	ownerPct := 60.0

	// Barista with Rp200.000 kasbon; share will be ~Rp266.667 (40%/3 of 800k gross margin).
	people := []entity.ProfitSharingPerson{
		{Name: "Owner", Role: "owner", SharePct: 60},
		{Name: "A", Role: "barista", SharePct: 20},
		{Name: "B", Role: "barista", SharePct: 20, CashbonReduction: 200000},
		{Name: "C", Role: "barista", SharePct: 20},
	}
	res := calcFinancials(basis, cogs, expenses, 40, nil, ownerPct, people, 0, 0, "gross", 30)

	var b entity.ProfitSharingPerson
	for _, p := range people {
		if p.Name == "B" {
			b = p
		}
	}

	grossMargin := basis - cogs                   // 800000
	baristaPool := grossMargin - roundIDR(grossMargin*ownerPct/100) // 320000
	bShare := roundIDR(baristaPool * 20 / 60)     // ~106667

	maxDeduction := roundIDR(bShare * maxCashbonDeductionPct) // 50% of share
	if b.CashbonReduction != maxDeduction {
		t.Errorf("CashbonReduction harus di-cap 50%% = %v, got %v", maxDeduction, b.CashbonReduction)
	}
	if b.Amount != bShare-maxDeduction {
		t.Errorf("Amount harus %v, got %v", bShare-maxDeduction, b.Amount)
	}
	_ = res
}

// TestCashbonCap50Pct_SmallCashbon: kasbon < 50% share → tidak di-cap, dipotong penuh.
func TestCashbonCap50Pct_SmallCashbon(t *testing.T) {
	people := []entity.ProfitSharingPerson{
		{Name: "Owner", Role: "owner", SharePct: 60},
		{Name: "X", Role: "barista", SharePct: 40, CashbonReduction: 10000},
	}
	_ = calcFinancials(1000000, 200000, 0, 40, nil, 60, people, 0, 0, "gross", 30)

	var x entity.ProfitSharingPerson
	for _, p := range people {
		if p.Name == "X" {
			x = p
		}
	}
	// share = 320000; kasbon 10000 < 50%*320000=160000 → dipotong penuh
	if x.CashbonReduction != 10000 {
		t.Errorf("kasbon kecil harus dipotong penuh: got %v, want 10000", x.CashbonReduction)
	}
	if x.Amount != 310000 {
		t.Errorf("Amount harus 310000, got %v", x.Amount)
	}
}
