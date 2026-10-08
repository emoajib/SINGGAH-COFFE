package usecase

import (
	"time"

	domainErrors "singgah-pos-backend/internal/domain/errors"
	"singgah-pos-backend/internal/models"
)

// Approve mengesahkan kehadiran luar-jadwal. Anti-ganda via SELECT FOR UPDATE:
// catatan yang sudah disahkan ditolak. Dicatat penyetuju + waktu + audit.
func (uc *AttendanceUsecase) Approve(id, outletID, approverID uint, approverName string) error {
	tx := uc.db.Begin()
	if tx.Error != nil {
		return tx.Error
	}
	committed := false
	defer func() {
		if !committed {
			tx.Rollback()
		}
	}()

	a, err := uc.repo.FindByIDForUpdate(id, tx)
	if err != nil {
		return domainErrors.NewNotFoundError("kehadiran")
	}
	if a.OutletID != outletID {
		return domainErrors.NewUnauthorizedError("tidak punya akses ke catatan ini")
	}
	if a.Disahkan {
		return domainErrors.NewInvalidInputError("kehadiran ini sudah disahkan sebelumnya")
	}
	now := time.Now()
	if err := tx.Model(&models.Attendance{}).Where("id = ?", id).Updates(map[string]interface{}{
		"status": "hadir", "disahkan": true,
		"disetujui_oleh": approverID, "disetujui_pada": now,
		"updated_at": now,
	}).Error; err != nil {
		return err
	}
	if err := tx.Commit().Error; err != nil {
		return err
	}
	committed = true
	_ = uc.audit.Write(outletID, approverID, approverName, "approve", "attendance", id, "menunggu_verifikasi", "hadir", a.Alasan, "disetujui")
	// Bridge: kehadiran yang disahkan ikut hitungan pool draft periode.
	if si, err := uc.shifts.FindByID(a.ShiftInstanceID, outletID); err == nil {
		uc.syncPersonAttendance(outletID, a.BaristaName, si.Tanggal, si.ShiftConfigID, true)
	}
	return nil
}

// Reject menolak kehadiran luar-jadwal dengan alasan tercatat.
func (uc *AttendanceUsecase) Reject(id, outletID, approverID uint, approverName, alasan string) error {
	a, err := uc.repo.FindByID(id, outletID)
	if err != nil {
		return domainErrors.NewNotFoundError("kehadiran")
	}
	if a.Disahkan {
		return domainErrors.NewInvalidInputError("kehadiran yang sudah disahkan tidak bisa ditolak")
	}
	if alasan == "" {
		return domainErrors.NewInvalidInputError("alasan penolakan wajib diisi")
	}
	a.Status = "ditolak"
	a.Alasan = a.Alasan + " | penolakan: " + alasan
	if err := uc.repo.Update(a); err != nil {
		return err
	}
	_ = uc.audit.Write(outletID, approverID, approverName, "reject", "attendance", id, "menunggu_verifikasi", "ditolak", alasan, "disetujui")
	// Bridge: kehadiran yang ditolak keluar dari hitungan pool draft periode.
	if si, err := uc.shifts.FindByID(a.ShiftInstanceID, outletID); err == nil {
		uc.syncPersonAttendance(outletID, a.BaristaName, si.Tanggal, si.ShiftConfigID, false)
	}
	return nil
}
