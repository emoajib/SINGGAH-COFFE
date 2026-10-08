package postgres

import (
	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/models"
	"singgah-pos-backend/internal/repository"

	"gorm.io/gorm"
)

type auditLogRepository struct{ db *gorm.DB }

func NewAuditLogRepository(db *gorm.DB) repository.AuditLogRepository {
	return &auditLogRepository{db: db}
}

// Create append-only: tidak ada Update/Delete untuk jejak audit.
func (r *auditLogRepository) Create(l *entity.AuditLog) error {
	m := &models.AuditLog{
		OutletID: l.OutletID, PenggunaID: l.PenggunaID, PenggunaNama: l.PenggunaNama,
		Aksi: l.Aksi, Entitas: l.Entitas, EntitasID: l.EntitasID,
		NilaiLama: l.NilaiLama, NilaiBaru: l.NilaiBaru,
		Alasan: l.Alasan, Status: l.Status,
	}
	if err := r.db.Create(m).Error; err != nil {
		return err
	}
	l.ID = m.ID
	l.CreatedAt = m.CreatedAt
	return nil
}

func (r *auditLogRepository) FindByEntity(entitas string, entitasID uint, outletID uint) ([]entity.AuditLog, error) {
	var list []models.AuditLog
	q := r.db.Where("entitas = ? AND entitas_id = ?", entitas, entitasID).Order("created_at ASC, id ASC")
	if outletID > 0 {
		q = q.Where("outlet_id = ?", outletID)
	}
	if err := q.Find(&list).Error; err != nil {
		return nil, err
	}
	res := make([]entity.AuditLog, len(list))
	for i, m := range list {
		res[i] = entity.AuditLog{
			ID: m.ID, OutletID: m.OutletID, PenggunaID: m.PenggunaID, PenggunaNama: m.PenggunaNama,
			Aksi: m.Aksi, Entitas: m.Entitas, EntitasID: m.EntitasID,
			NilaiLama: m.NilaiLama, NilaiBaru: m.NilaiBaru,
			Alasan: m.Alasan, Status: m.Status, CreatedAt: m.CreatedAt,
		}
	}
	return res, nil
}
