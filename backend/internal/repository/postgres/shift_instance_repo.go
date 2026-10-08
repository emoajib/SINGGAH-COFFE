package postgres

import (
	"time"

	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/models"
	"singgah-pos-backend/internal/repository"

	"gorm.io/gorm"
)

type shiftInstanceRepository struct{ db *gorm.DB }

func NewShiftInstanceRepository(db *gorm.DB) repository.ShiftInstanceRepository {
	return &shiftInstanceRepository{db: db}
}

func (r *shiftInstanceRepository) Create(s *entity.ShiftInstance) error {
	m := toModelShiftInstance(s)
	if err := r.db.Create(m).Error; err != nil {
		return err
	}
	s.ID = m.ID
	return nil
}

func (r *shiftInstanceRepository) Update(s *entity.ShiftInstance) error {
	m := toModelShiftInstance(s)
	return r.db.Model(&models.ShiftInstance{}).Where("id = ? AND outlet_id = ?", s.ID, s.OutletID).
		Updates(map[string]interface{}{
			"jam_mulai_aktual": m.JamMulaiAktual, "jam_selesai_aktual": m.JamSelesaiAktual,
			"status": m.Status, "revenue": m.Revenue, "hpp": m.HPP,
			"biaya_langsung": m.BiayaLangsung, "biaya_alokasi": m.BiayaAlokasi,
			"dasar_bagi_hasil": m.DasarBagiHasil, "owner_share": m.OwnerShare,
			"pool_barista": m.PoolBarista, "sisa_kas": m.SisaKas,
			"catatan": m.Catatan, "penanggung_jawab": m.PenanggungJawab,
			"updated_at": time.Now(),
		}).Error
}

func (r *shiftInstanceRepository) FindByID(id uint, outletID uint) (*entity.ShiftInstance, error) {
	var m models.ShiftInstance
	q := r.db.Where("id = ?", id)
	if outletID > 0 {
		q = q.Where("outlet_id = ?", outletID)
	}
	if err := q.First(&m).Error; err != nil {
		return nil, err
	}
	res := toDomainShiftInstance(&m)
	return &res, nil
}

func (r *shiftInstanceRepository) FindByOutletDate(outletID uint, tanggal string) ([]entity.ShiftInstance, error) {
	var list []models.ShiftInstance
	q := r.db.Where("DATE(tanggal) = DATE(?)", tanggal).Order("shift_config_id ASC")
	if outletID > 0 {
		q = q.Where("outlet_id = ?", outletID)
	}
	if err := q.Find(&list).Error; err != nil {
		return nil, err
	}
	res := make([]entity.ShiftInstance, len(list))
	for i := range list {
		res[i] = toDomainShiftInstance(&list[i])
	}
	return res, nil
}

func (r *shiftInstanceRepository) FindOpen(outletID uint) ([]entity.ShiftInstance, error) {
	var list []models.ShiftInstance
	q := r.db.Where("status IN ?", []string{"terjadwal", "aktif"}).Order("tanggal ASC")
	if outletID > 0 {
		q = q.Where("outlet_id = ?", outletID)
	}
	if err := q.Find(&list).Error; err != nil {
		return nil, err
	}
	res := make([]entity.ShiftInstance, len(list))
	for i := range list {
		res[i] = toDomainShiftInstance(&list[i])
	}
	return res, nil
}

func (r *shiftInstanceRepository) CountByStatus(outletID uint, statuses ...string) (int64, error) {
	var count int64
	q := r.db.Model(&models.ShiftInstance{})
	if len(statuses) > 0 {
		q = q.Where("status IN ?", statuses)
	}
	if outletID > 0 {
		q = q.Where("outlet_id = ?", outletID)
	}
	return count, q.Count(&count).Error
}

func toDomainShiftInstance(m *models.ShiftInstance) entity.ShiftInstance {
	return entity.ShiftInstance{
		ID: m.ID, OutletID: m.OutletID, ShiftConfigID: m.ShiftConfigID,
		Tanggal: m.Tanggal, JamMulaiAktual: m.JamMulaiAktual, JamSelesaiAktual: m.JamSelesaiAktual,
		Status: m.Status, Revenue: m.Revenue, HPP: m.HPP,
		BiayaLangsung: m.BiayaLangsung, BiayaAlokasi: m.BiayaAlokasi,
		DasarBagiHasil: m.DasarBagiHasil, OwnerShare: m.OwnerShare,
		PoolBarista: m.PoolBarista, SisaKas: m.SisaKas,
		Catatan: m.Catatan, PenanggungJawab: m.PenanggungJawab,
		CreatedAt: m.CreatedAt, UpdatedAt: m.UpdatedAt,
	}
}

func toModelShiftInstance(e *entity.ShiftInstance) *models.ShiftInstance {
	return &models.ShiftInstance{
		ID: e.ID, OutletID: e.OutletID, ShiftConfigID: e.ShiftConfigID,
		Tanggal: e.Tanggal, JamMulaiAktual: e.JamMulaiAktual, JamSelesaiAktual: e.JamSelesaiAktual,
		Status: e.Status, Revenue: e.Revenue, HPP: e.HPP,
		BiayaLangsung: e.BiayaLangsung, BiayaAlokasi: e.BiayaAlokasi,
		DasarBagiHasil: e.DasarBagiHasil, OwnerShare: e.OwnerShare,
		PoolBarista: e.PoolBarista, SisaKas: e.SisaKas,
		Catatan: e.Catatan, PenanggungJawab: e.PenanggungJawab,
	}
}
