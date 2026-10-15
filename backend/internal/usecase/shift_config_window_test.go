package usecase

import (
	"testing"

	"singgah-pos-backend/internal/domain/entity"
)

// TestAnalyzeShiftWindows memverifikasi deteksi tumpang-tindih dan celah jam
// antar shift pada siklus 24 jam (termasuk shift lintas tengah malam).
func TestAnalyzeShiftWindows(t *testing.T) {
	pagi := entity.ShiftConfig{Name: "PAGI", StartTime: "07:00", EndTime: "19:00", IsActive: true}

	cases := []struct {
		name        string
		cand        entity.ShiftConfig
		others      []entity.ShiftConfig
		wantOverlap string
		wantGaps    []string
	}{
		{
			name: "shift tunggal tanpa celah internal",
			cand: entity.ShiftConfig{Name: "PAGI", StartTime: "07:00", EndTime: "19:00"},
		},
		{
			name: "celah 1 menit 19:00-19:01 dan 03:00-07:00 terdeteksi",
			cand: entity.ShiftConfig{Name: "MALAM", StartTime: "19:01", EndTime: "03:00"},
			others:   []entity.ShiftConfig{pagi},
			wantGaps: []string{"03:00–07:00", "19:00–19:01"},
		},
		{
			name: "kontigu 19:00 hanya menyisakan celah tutup 03:00-07:00",
			cand: entity.ShiftConfig{Name: "MALAM", StartTime: "19:00", EndTime: "03:00"},
			others:   []entity.ShiftConfig{pagi},
			wantGaps: []string{"03:00–07:00"},
		},
		{
			name: "tutup penuh 24 jam tanpa celah",
			cand: entity.ShiftConfig{Name: "MALAM", StartTime: "19:00", EndTime: "07:00"},
			others: []entity.ShiftConfig{pagi},
		},
		{
			name:        "tumpang-tindih dideteksi",
			cand:        entity.ShiftConfig{Name: "SORE", StartTime: "10:00", EndTime: "20:00"},
			others:      []entity.ShiftConfig{pagi},
			wantOverlap: "PAGI",
		},
	}

	for _, tc := range cases {
		gotOverlap, gotGaps := analyzeShiftWindows(tc.cand, tc.others)
		if gotOverlap != tc.wantOverlap {
			t.Errorf("%s: overlap = %q, want %q", tc.name, gotOverlap, tc.wantOverlap)
		}
		if len(gotGaps) != len(tc.wantGaps) {
			t.Errorf("%s: gaps = %v, want %v", tc.name, gotGaps, tc.wantGaps)
			continue
		}
		for i := range gotGaps {
			if gotGaps[i] != tc.wantGaps[i] {
				t.Errorf("%s: gaps = %v, want %v", tc.name, gotGaps, tc.wantGaps)
				break
			}
		}
	}
}
