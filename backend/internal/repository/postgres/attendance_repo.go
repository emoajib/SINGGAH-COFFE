package postgres

import (
	"time"

	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/models"
	"singgah-pos-backend/internal/repository"

	"gorm.io/gorm"
)

type attendanceRepository struct{ db *gorm.DB }

func NewAttendanceRepository(db *gorm.DB) repository.AttendanceRepository {
	return &attendanceRepository{db: db}
}

func (r *attendanceRepository) Create(a *entity.Attendance) error {
	m := toModelAttendance(a)
	if err := r.db.Create(m).Error; err != nil {
		return err
	}
	a.ID = m.ID
	return nil
}

func (r *attendanceRepository) Update(a *entity.Attendance) error {
	m := toModelAttendance(a)
	return r.db.Model(&models.Attendance{}).Where("id = ? AND outlet_id = ?", a.ID, a.OutletID).
		Updates(map[string]interface{}{
			"status": m.Status, "alasan": m.Alasan, "disahkan": m.Disahkan,
			"disetujui_oleh": m.DisetujuiOleh, "disetujui_pada": m.DisetujuiPada,
			"updated_at": time.Now(),
		}).Error
}

func (r *attendanceRepository) FindByID(id uint, outletID uint) (*entity.Attendance, error) {
	var m models.Attendance
	q := r.db.Where("id = ?", id)
	if outletID > 0 {
		q = q.Where("outlet_id = ?", outletID)
	}
	if err := q.First(&m).Error; err != nil {
		return nil, err
	}
	res := toDomainAttendance(&m)
	return &res, nil
}

// FindByIDForUpdate mengunci baris untuk persetujuan anti-ganda.
func (r *attendanceRepository) FindByIDForUpdate(id uint, tx *gorm.DB) (*entity.Attendance, error) {
	var m models.Attendance
	if err := tx.Set("gorm:query_option", "FOR UPDATE").Where("id = ?", id).First(&m).Error; err != nil {
		return nil, err
	}
	res := toDomainAttendance(&m)
	return &res, nil
}

func (r *attendanceRepository) FindByShiftInstance(shiftInstanceID uint, outletID uint) ([]entity.Attendance, error) {
	var list []models.Attendance
	q := r.db.Where("shift_instance_id = ?", shiftInstanceID).Order("barista_name ASC")
	if outletID > 0 {
		q = q.Where("outlet_id = ?", outletID)
	}
	if err := q.Find(&list).Error; err != nil {
		return nil, err
	}
	res := make([]entity.Attendance, len(list))
	for i := range list {
		res[i] = toDomainAttendance(&list[i])
	}
	return res, nil
}

func (r *attendanceRepository) FindPending(outletID uint) ([]entity.Attendance, error) {
	var list []models.Attendance
	q := r.db.Where("disahkan = ?", false).Order("created_at ASC")
	if outletID > 0 {
		q = q.Where("outlet_id = ?", outletID)
	}
	if err := q.Find(&list).Error; err != nil {
		return nil, err
	}
	res := make([]entity.Attendance, len(list))
	for i := range list {
		res[i] = toDomainAttendance(&list[i])
	}
	return res, nil
}

func (r *attendanceRepository) CountPending(outletID uint) (int64, error) {
	var count int64
	q := r.db.Model(&models.Attendance{}).Where("disahkan = ?", false)
	if outletID > 0 {
		q = q.Where("outlet_id = ?", outletID)
	}
	return count, q.Count(&count).Error
}

func toDomainAttendance(m *models.Attendance) entity.Attendance {
	return entity.Attendance{
		ID: m.ID, OutletID: m.OutletID, ScheduleID: m.ScheduleID,
		ShiftInstanceID: m.ShiftInstanceID, BaristaID: m.BaristaID, BaristaName: m.BaristaName,
		Status: m.Status, Alasan: m.Alasan, Disahkan: m.Disahkan, DicatatOleh: m.DicatatOleh,
		DisetujuiOleh: m.DisetujuiOleh, DisetujuiPada: m.DisetujuiPada,
		CreatedAt: m.CreatedAt, UpdatedAt: m.UpdatedAt,
	}
}

func toModelAttendance(e *entity.Attendance) *models.Attendance {
	return &models.Attendance{
		ID: e.ID, OutletID: e.OutletID, ScheduleID: e.ScheduleID,
		ShiftInstanceID: e.ShiftInstanceID, BaristaID: e.BaristaID, BaristaName: e.BaristaName,
		Status: e.Status, Alasan: e.Alasan, Disahkan: e.Disahkan, DicatatOleh: e.DicatatOleh,
		DisetujuiOleh: e.DisetujuiOleh, DisetujuiPada: e.DisetujuiPada,
	}
}
