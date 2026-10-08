package usecase

import (
	"fmt"
	"time"

	"singgah-pos-backend/internal/domain/entity"
	domainErrors "singgah-pos-backend/internal/domain/errors"
)

// CopyWeek menyalin jadwal 7 hari dari minggu sumber ke minggu tujuan.
// Melewati entri duplikat (tidak error). Mengembalikan jumlah disalin/dilewati.
func (uc *ScheduleUsecase) CopyWeek(outletID uint, srcStart string, dstStart string, userID uint, userName string) (disalin, dilewati int, err error) {
	src, err := time.Parse("2006-01-02", srcStart)
	if err != nil {
		return 0, 0, domainErrors.NewInvalidInputError("format srcStart harus YYYY-MM-DD")
	}
	dst, err := time.Parse("2006-01-02", dstStart)
	if err != nil {
		return 0, 0, domainErrors.NewInvalidInputError("format dstStart harus YYYY-MM-DD")
	}
	offset := dst.Sub(src)
	for d := 0; d < 7; d++ {
		tglSrc := src.AddDate(0, 0, d).Format("2006-01-02")
		jadwal, err := uc.repo.FindByDate(tglSrc, outletID)
		if err != nil {
			return disalin, dilewati, err
		}
		for _, j := range jadwal {
			baru := entity.Schedule{
				OutletID: outletID, BaristaID: j.BaristaID, BaristaName: j.BaristaName,
				Tanggal: j.Tanggal.Add(offset), ShiftConfigID: j.ShiftConfigID,
				Status: j.Status, JamKerja: j.JamKerja, Catatan: fmt.Sprintf("salinan %s", tglSrc),
				DibuatOleh: userID,
			}
			dup, err := uc.repo.Exists(baru.BaristaID, baru.Tanggal.Format("2006-01-02"), baru.ShiftConfigID, outletID)
			if err != nil {
				return disalin, dilewati, err
			}
			if dup {
				dilewati++
				continue
			}
			if err := uc.repo.Create(&baru); err != nil {
				return disalin, dilewati, err
			}
			disalin++
		}
	}
	_ = uc.audit.Write(outletID, userID, userName, "copy_week", "schedule", 0, srcStart, dstStart,
		fmt.Sprintf("disalin=%d dilewati=%d", disalin, dilewati), "disetujui")
	return disalin, dilewati, nil
}
