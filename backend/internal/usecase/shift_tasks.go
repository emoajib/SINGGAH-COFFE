package usecase

import (
	"time"

	"singgah-pos-backend/internal/domain/entity"
)

// closeWarnings memeriksa kelengkapan data shift (§9): kehadiran disahkan,
// transaksi/HPP/biaya kosong, pembagi nol saat pool tak nol.
func (uc *ShiftInstanceUsecase) closeWarnings(outletID uint, s *entity.ShiftInstance) []string {
	var warnings []string
	hadir := 0
	if daftar, err := uc.attend.FindByShiftInstance(s.ID, outletID); err == nil {
		for _, a := range daftar {
			if a.Disahkan && (a.Status == "hadir" || a.Status == "hadir_luar_jadwal") {
				hadir++
			}
		}
	}
	if s.PoolBarista > 0 && hadir == 0 {
		warnings = append(warnings, "pool barista tidak nol tetapi belum ada kehadiran yang disahkan")
	}
	if s.Revenue == 0 {
		warnings = append(warnings, "pendapatan shift masih kosong")
	}
	if s.HPP == 0 && s.Revenue > 0 {
		warnings = append(warnings, "HPP masih kosong padahal ada pendapatan")
	}
	return warnings
}

// GetTasks menyusun daftar tugas operasional (C7) tanpa polling/goroutine.
func (uc *ShiftInstanceUsecase) GetTasks(outletID uint) (entity.OpsTasks, error) {
	var t entity.OpsTasks
	var err error
	if t.ShiftBelumTutup, err = uc.repo.CountByStatus(outletID, "terjadwal", "aktif"); err != nil {
		return t, err
	}
	if t.KehadiranPending, err = uc.attend.CountPending(outletID); err != nil {
		return t, err
	}
	if kasbon, err := uc.cashbons.FindByOutlet(outletID, "pending"); err == nil {
		t.KasbonPending = int64(len(kasbon))
	} else {
		return t, err
	}
	// Biaya belum klasifikasi dibatasi 90 hari terakhir: arsip lama bukan
	// tugas harian dan bisa dibereskan sekaligus via klasifikasi massal.
	if t.BiayaBelumKlasif, err = uc.expenses.CountUnclassified(outletID, time.Now().AddDate(0, 0, -90).Format("2006-01-02")); err != nil {
		return t, err
	}
	draft, err := uc.period.FindAll(outletID)
	if err != nil {
		return t, err
	}
	for _, p := range draft {
		if p.Status == "draft" {
			t.PeriodeSiapReview++
		}
	}
	return t, nil
}
