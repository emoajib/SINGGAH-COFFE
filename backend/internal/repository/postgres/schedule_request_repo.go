package postgres

import (
	"time"

	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/models"
	"singgah-pos-backend/internal/repository"

	"gorm.io/gorm"
)

type scheduleRequestRepository struct{ db *gorm.DB }

func NewScheduleRequestRepository(db *gorm.DB) repository.ScheduleRequestRepository {
	return &scheduleRequestRepository{db: db}
}

func (r *scheduleRequestRepository) Create(req *entity.ScheduleRequest) error {
	m := &models.ScheduleRequest{
		OutletID: req.OutletID, BaristaID: req.BaristaID, BaristaName: req.BaristaName,
		Tanggal: req.Tanggal, ShiftConfigID: req.ShiftConfigID, Jenis: req.Jenis,
		Catatan: req.Catatan, DibuatOleh: req.DibuatOleh,
	}
	if err := r.db.Create(m).Error; err != nil {
		return err
	}
	req.ID = m.ID
	return nil
}

func (r *scheduleRequestRepository) Delete(id uint, outletID uint) error {
	return r.db.Where("id = ? AND outlet_id = ?", id, outletID).Delete(&models.ScheduleRequest{}).Error
}

func (r *scheduleRequestRepository) FindByMonth(outletID uint, bulan string) ([]entity.ScheduleRequest, error) {
	awal, err := time.Parse("2006-01", bulan)
	if err != nil {
		return nil, err
	}
	// Rentang portabel MySQL/SQLite (tanpa DATE_FORMAT yang khusus MySQL).
	mulai := time.Date(awal.Year(), awal.Month(), 1, 0, 0, 0, 0, time.UTC).Format("2006-01-02")
	akhir := time.Date(awal.Year(), awal.Month(), 1, 0, 0, 0, 0, time.UTC).AddDate(0, 1, 0).Format("2006-01-02")
	var list []models.ScheduleRequest
	q := r.db.Where("DATE(tanggal) >= DATE(?) AND DATE(tanggal) < DATE(?)", mulai, akhir).Order("tanggal ASC, barista_name ASC")
	if outletID > 0 {
		q = q.Where("outlet_id = ?", outletID)
	}
	if err := q.Find(&list).Error; err != nil {
		return nil, err
	}
	res := make([]entity.ScheduleRequest, len(list))
	for i, m := range list {
		res[i] = entity.ScheduleRequest{
			ID: m.ID, OutletID: m.OutletID, BaristaID: m.BaristaID, BaristaName: m.BaristaName,
			Tanggal: m.Tanggal, ShiftConfigID: m.ShiftConfigID, Jenis: m.Jenis,
			Catatan: m.Catatan, DibuatOleh: m.DibuatOleh,
			CreatedAt: m.CreatedAt, UpdatedAt: m.UpdatedAt,
		}
	}
	return res, nil
}
