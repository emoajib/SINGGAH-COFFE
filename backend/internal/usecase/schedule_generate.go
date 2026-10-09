package usecase

import (
	"fmt"
	"time"

	"singgah-pos-backend/internal/domain/entity"
	domainErrors "singgah-pos-backend/internal/domain/errors"
)

// GenerateMonth membuat jadwal 1 bulan penuh sekaligus: setiap barista aktif
// × setiap shift aktif × setiap tanggal, dengan status default. Idempoten —
// kombinasi yang sudah ada dilewati (tidak duplikat, tidak error), sehingga
// aman dijalankan ulang. Bila terapkanRequest, titipan libur/izin/sakit yang
// cocok (barista + tanggal + shift/ semua shift) mengalahkan status default.
// Hasilnya tetap bisa diedit/dihapus per baris (mis. tukar jadwal).
func (uc *ScheduleUsecase) GenerateMonth(outletID uint, bulan string, statusDefault string, liburAkhirPekan bool, terapkanRequest bool, userID uint, userName string) (dibuat, dilewati int, err error) {
	if statusDefault == "" {
		statusDefault = "dijadwalkan"
	}
	if !validScheduleStatus[statusDefault] {
		return 0, 0, domainErrors.NewInvalidInputError("status default tidak valid")
	}
	awal, err := time.Parse("2006-01", bulan)
	if err != nil {
		return 0, 0, domainErrors.NewInvalidInputError("format bulan harus YYYY-MM")
	}
	baristas, err := uc.baristas.FindByOutlet(outletID, "active")
	if err != nil {
		return 0, 0, err
	}
	if len(baristas) == 0 {
		return 0, 0, domainErrors.NewInvalidInputError("tidak ada barista aktif")
	}
	shifts, err := uc.shifts.FindByOutletID(outletID, true)
	if err != nil {
		return 0, 0, err
	}
	if len(shifts) == 0 {
		return 0, 0, domainErrors.NewInvalidInputError("tidak ada shift aktif")
	}
	hariPertama := time.Date(awal.Year(), awal.Month(), 1, 0, 0, 0, 0, time.UTC)
	akhirBulan := hariPertama.AddDate(0, 1, -1).Day()
	var reqs []entity.ScheduleRequest
	if terapkanRequest {
		reqs, err = uc.requests.FindByMonth(outletID, bulan)
		if err != nil {
			return 0, 0, err
		}
	}
	cocok := func(baristaID, shiftID uint, tglStr string) (string, bool) {
		for _, r := range reqs {
			if r.BaristaID != baristaID || r.Tanggal.Format("2006-01-02") != tglStr {
				continue
			}
			if r.ShiftConfigID != nil && *r.ShiftConfigID != shiftID {
				continue
			}
			return r.Jenis, true
		}
		return "", false
	}
	for d := 1; d <= akhirBulan; d++ {
		tgl := time.Date(awal.Year(), awal.Month(), d, 0, 0, 0, 0, time.UTC)
		tglStr := tgl.Format("2006-01-02")
		akhirPekan := liburAkhirPekan && (tgl.Weekday() == time.Saturday || tgl.Weekday() == time.Sunday)
		for _, b := range baristas {
			for _, s := range shifts {
				st := statusDefault
				if akhirPekan {
					st = "libur"
				}
				if jenis, ok := cocok(b.ID, s.ID, tglStr); ok {
					st = jenis
				}
				dup, err := uc.repo.Exists(b.ID, tglStr, s.ID, outletID)
				if err != nil {
					return dibuat, dilewati, err
				}
				if dup {
					dilewati++
					continue
				}
				if err := uc.repo.Create(&entity.Schedule{
					OutletID: outletID, BaristaID: b.ID, BaristaName: b.Name,
					Tanggal: tgl, ShiftConfigID: s.ID, Status: st,
					Catatan: fmt.Sprintf("generate %s", bulan), DibuatOleh: userID,
				}); err != nil {
					return dibuat, dilewati, err
				}
				dibuat++
			}
		}
	}
	_ = uc.audit.Write(outletID, userID, userName, "generate_month", "schedule", 0, bulan, statusDefault,
		fmt.Sprintf("dibuat=%d dilewati=%d libur_akhir_pekan=%v", dibuat, dilewati, liburAkhirPekan), "disetujui")
	return dibuat, dilewati, nil
}
