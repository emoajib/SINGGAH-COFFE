package usecase

import (
	"time"

	"singgah-pos-backend/internal/domain/entity"
	domainErrors "singgah-pos-backend/internal/domain/errors"
)

var validRequestJenis = map[string]bool{"libur": true, "izin": true, "sakit": true}

// CreateRequest mencatat titipan libur/izin/sakit barista (hari apa, shift apa).
// ShiftConfigID nil = berlaku semua shift hari itu. Dicatat owner/manajer;
// menjadi arsip riwayat bila kelak ada perselisihan.
func (uc *ScheduleUsecase) CreateRequest(r *entity.ScheduleRequest, userID uint, userName string) error {
	if r.BaristaID == 0 {
		return domainErrors.NewInvalidInputError("barista wajib diisi")
	}
	if r.Tanggal.IsZero() {
		return domainErrors.NewInvalidInputError("tanggal wajib diisi")
	}
	if r.Jenis == "" {
		r.Jenis = "libur"
	}
	if !validRequestJenis[r.Jenis] {
		return domainErrors.NewInvalidInputError("jenis request tidak valid")
	}
	b, err := uc.baristas.FindByID(r.BaristaID, r.OutletID)
	if err != nil {
		return domainErrors.NewNotFoundError("barista")
	}
	r.BaristaName = b.Name
	if r.ShiftConfigID != nil {
		if _, err := uc.shifts.FindByID(*r.ShiftConfigID); err != nil {
			return domainErrors.NewNotFoundError("shift")
		}
	}
	r.DibuatOleh = userID
	if err := uc.requests.Create(r); err != nil {
		return err
	}
	_ = uc.audit.Write(r.OutletID, userID, userName, "create", "schedule_request", r.ID, nil, r, r.Catatan, "disetujui")
	return nil
}

func (uc *ScheduleUsecase) ListRequests(outletID uint, bulan string) ([]entity.ScheduleRequest, error) {
	if _, err := time.Parse("2006-01", bulan); err != nil {
		return nil, domainErrors.NewInvalidInputError("format bulan harus YYYY-MM")
	}
	return uc.requests.FindByMonth(outletID, bulan)
}

func (uc *ScheduleUsecase) DeleteRequest(id, outletID, userID uint, userName string) error {
	if err := uc.requests.Delete(id, outletID); err != nil {
		return err
	}
	_ = uc.audit.Write(outletID, userID, userName, "delete", "schedule_request", id, nil, nil, "", "disetujui")
	return nil
}
