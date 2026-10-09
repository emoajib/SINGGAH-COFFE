package usecase

import (
	"testing"

	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/models"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestNormalizeKode(t *testing.T) {
	cases := []struct{ in, name, want string }{
		{"", "PAGI", "P"},
		{"", "Shift Sore", "SS"},
		{"  m  ", "MALAM", "M"},
		{"petang-malam", "X", "PET"},
		{"", "   ", ""},
	}
	for _, c := range cases {
		if got := normalizeKode(c.in, c.name); got != c.want {
			t.Errorf("normalizeKode(%q,%q) = %q, want %q", c.in, c.name, got, c.want)
		}
	}
}

func TestShiftKodeUniquePerOutlet(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("sqlite: %v", err)
	}
	if err := db.AutoMigrate(&models.ShiftConfig{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	uc := NewShiftConfigUsecase(db)
	mk := func(name, kode string) *entity.ShiftConfig {
		return &entity.ShiftConfig{OutletID: 1, Name: name, Kode: kode,
			StartTime: "07:00", EndTime: "14:00", OwnerPct: 60, BaristaPoolPct: 40, IsActive: true}
	}
	if err := uc.Create(mk("PAGI", "")); err != nil {
		t.Fatalf("create PAGI: %v", err)
	}
	// "PETANG" menurunkan P -> tabrakan dengan PAGI -> tolak dengan pesan jelas.
	if err := uc.Create(mk("PETANG", "")); err == nil {
		t.Errorf("kode duplikat hasil turunan harus ditolak")
	}
	// Kode eksplisit unik lolos dan tersimpan uppercase.
	s := mk("Petang", "pe")
	if err := uc.Create(s); err != nil {
		t.Fatalf("create eksplisit: %v", err)
	}
	if s.Kode != "PE" {
		t.Errorf("kode harus dinormalisasi ke PE, got %q", s.Kode)
	}
}
