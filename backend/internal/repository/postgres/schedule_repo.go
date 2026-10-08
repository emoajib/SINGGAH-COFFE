package postgres

import (
	"time"

	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/models"
	"singgah-pos-backend/internal/repository"

	"gorm.io/gorm"
)

type scheduleRepository struct{ db *gorm.DB }

func NewScheduleRepository(db *gorm.DB) repository.ScheduleRepository {
	return &scheduleRepository{db: db}
}

func (r *scheduleRepository) Create(s *entity.Schedule) error {
	m := toModelSchedule(s)
	if err := r.db.Create(m).Error; err != nil {
		return err
	}
	s.ID = m.ID
	return nil
}

func (r *scheduleRepository) Update(s *entity.Schedule) error {
	m := toModelSchedule(s)
	return r.db.Model(&models.Schedule{}).Where("id = ? AND outlet_id = ?", s.ID, s.OutletID).
		Updates(map[string]interface{}{
			"barista_id": m.BaristaID, "barista_name": m.BaristaName,
			"tanggal": m.Tanggal, "shift_config_id": m.ShiftConfigID,
			"status": m.Status, "jam_kerja": m.JamKerja, "catatan": m.Catatan,
			"updated_at": time.Now(),
		}).Error
}

func (r *scheduleRepository) Delete(id uint, outletID uint) error {
	return r.db.Where("id = ? AND outlet_id = ?", id, outletID).Delete(&models.Schedule{}).Error
}

func (r *scheduleRepository) FindByID(id uint, outletID uint) (*entity.Schedule, error) {
	var m models.Schedule
	q := r.db.Where("id = ?", id)
	if outletID > 0 {
		q = q.Where("outlet_id = ?", outletID)
	}
	if err := q.First(&m).Error; err != nil {
		return nil, err
	}
	res := toDomainSchedule(&m)
	return &res, nil
}

func (r *scheduleRepository) FindByDate(tanggal string, outletID uint) ([]entity.Schedule, error) {
	var list []models.Schedule
	q := r.db.Where("DATE(tanggal) = DATE(?)", tanggal).Order("shift_config_id ASC, barista_name ASC")
	if outletID > 0 {
		q = q.Where("outlet_id = ?", outletID)
	}
	if err := q.Find(&list).Error; err != nil {
		return nil, err
	}
	return toDomainSchedules(list), nil
}

func (r *scheduleRepository) FindByBaristaDate(baristaID uint, tanggal string, outletID uint) ([]entity.Schedule, error) {
	var list []models.Schedule
	q := r.db.Where("barista_id = ? AND DATE(tanggal) = DATE(?)", baristaID, tanggal)
	if outletID > 0 {
		q = q.Where("outlet_id = ?", outletID)
	}
	if err := q.Find(&list).Error; err != nil {
		return nil, err
	}
	return toDomainSchedules(list), nil
}

func (r *scheduleRepository) Exists(baristaID uint, tanggal string, shiftConfigID uint, outletID uint) (bool, error) {
	var count int64
	q := r.db.Model(&models.Schedule{}).
		Where("barista_id = ? AND DATE(tanggal) = DATE(?) AND shift_config_id = ?", baristaID, tanggal, shiftConfigID)
	if outletID > 0 {
		q = q.Where("outlet_id = ?", outletID)
	}
	if err := q.Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}

func toDomainSchedule(m *models.Schedule) entity.Schedule {
	return entity.Schedule{
		ID: m.ID, OutletID: m.OutletID, BaristaID: m.BaristaID, BaristaName: m.BaristaName,
		Tanggal: m.Tanggal, ShiftConfigID: m.ShiftConfigID, Status: m.Status,
		JamKerja: m.JamKerja, Catatan: m.Catatan, DibuatOleh: m.DibuatOleh,
		CreatedAt: m.CreatedAt, UpdatedAt: m.UpdatedAt,
	}
}

func toDomainSchedules(list []models.Schedule) []entity.Schedule {
	res := make([]entity.Schedule, len(list))
	for i := range list {
		res[i] = toDomainSchedule(&list[i])
	}
	return res
}

func toModelSchedule(e *entity.Schedule) *models.Schedule {
	return &models.Schedule{
		ID: e.ID, OutletID: e.OutletID, BaristaID: e.BaristaID, BaristaName: e.BaristaName,
		Tanggal: e.Tanggal, ShiftConfigID: e.ShiftConfigID, Status: e.Status,
		JamKerja: e.JamKerja, Catatan: e.Catatan, DibuatOleh: e.DibuatOleh,
	}
}
