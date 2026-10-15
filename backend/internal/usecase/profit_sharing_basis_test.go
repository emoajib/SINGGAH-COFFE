package usecase

import (
	"testing"
	"time"

	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/models"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// TestMultiShift_BasisDistributedVsUnmapped: order di luar jendela shift tidak
// boleh ikut dibagi, tapi juga tidak boleh disembunyikan di header. Invarian:
//
//	BasisDistributed + BasisUnmapped == SharingBasis
//	BasisDistributed               == OwnerAmount + Σ Amount barista
func TestMultiShift_BasisDistributedVsUnmapped(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("sqlite: %v", err)
	}
	if err := db.AutoMigrate(&models.Order{}, &models.OrderItem{}, &models.ShiftConfig{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	mk := func(num string, tm time.Time, price, cost float64) {
		o := models.Order{OrderNumber: num, Status: "Completed", OutletID: 1, OrderTime: tm}
		if err := db.Create(&o).Error; err != nil {
			t.Fatalf("order: %v", err)
		}
		db.Create(&models.OrderItem{OrderID: o.ID, Price: price, Quantity: 1, Cost: cost})
	}
	mk("IN", time.Date(2026, 10, 1, 10, 0, 0, 0, time.UTC), 1000000, 200000) // PAGI
	mk("OUT", time.Date(2026, 10, 1, 5, 0, 0, 0, time.UTC), 1000000, 200000) // celah 03:00-07:00
	db.Create(&models.ShiftConfig{OutletID: 1, Name: "PAGI", StartTime: "07:00", EndTime: "19:00", OwnerPct: 60, BaristaPoolPct: 40, IsActive: true})
	db.Create(&models.ShiftConfig{OutletID: 1, Name: "MALAM", StartTime: "19:01", EndTime: "03:00", OwnerPct: 60, BaristaPoolPct: 40, IsActive: true})

	uc := NewProfitSharingUsecase(db)
	people := []entity.ProfitSharingPerson{
		{Name: "Owner", Role: "owner", SharePct: 60},
		{Name: "RIO", Role: "barista", SharePct: 20, ShiftIDs: []uint{1, 2},
			Attendance: `{"2026-10-01":[1]}`},
	}
	res, _, err := uc.calcSharing(2000000, 400000, 0, 40, nil, 60, people, 0, 0, "gross", 1,
		"2026-10-01 00:00:00", "2026-10-01 23:59:00", 1)
	if err != nil {
		t.Fatalf("calcSharing: %v", err)
	}
	if res.BasisDistributed+res.BasisUnmapped != res.SharingBasis {
		t.Errorf("invarian pecah: distributed %v + unmapped %v != sharing %v",
			res.BasisDistributed, res.BasisUnmapped, res.SharingBasis)
	}
	var baristaSum float64
	for _, p := range people {
		if p.Role != "owner" {
			baristaSum += p.Amount
		}
	}
	if res.BasisDistributed != res.OwnerAmount+baristaSum {
		t.Errorf("distributed %v harus == owner %v + barista %v",
			res.BasisDistributed, res.OwnerAmount, baristaSum)
	}
	if res.BasisUnmapped != 800000 {
		t.Errorf("unmapped harus 800000 (1 order di celah), got %v", res.BasisUnmapped)
	}
}
