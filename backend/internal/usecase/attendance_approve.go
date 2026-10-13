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
	return nil
}

// Reject menolak kehadiran luar-jadwal dengan alasan tercatat (atomic FOR UPDATE, anti race dengan Approve).
func (uc *AttendanceUsecase) Reject(id, outletID, approverID uint, approverName, alasan string) error {
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
		return domainErrors.NewInvalidInputError("kehadiran yang sudah disahkan tidak bisa ditolak")
	}
	if alasan == "" {
		return domainErrors.NewInvalidInputError("alasan penolakan wajib diisi")
	}
	now := time.Now()
	if err := tx.Model(&models.Attendance{}).Where("id = ?", id).Updates(map[string]interface{}{
		"status": "ditolak", "alasan": a.Alasan + " | penolakan: " + alasan,
		"updated_at": now,
	}).Error; err != nil {
		return err
	}
	if err := tx.Commit().Error; err != nil {
		return err
	}
	committed = true
	_ = uc.audit.Write(outletID, approverID, approverName, "reject", "attendance", id, "menunggu_verifikasi", "ditolak", alasan, "disetujui")
	return nil
}
