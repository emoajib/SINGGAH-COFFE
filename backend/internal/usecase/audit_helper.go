package usecase

import (
	"encoding/json"

	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/repository"
	"singgah-pos-backend/internal/repository/postgres"

	"gorm.io/gorm"
)

// AuditWriter menulis jejak audit append-only. Best-effort: kegagalan tulis
// audit tidak menggagalkan transaksi bisnis, tetapi dikembalikan sebagai error
// agar caller dalam transaksi DB dapat me-rollback bila diinginkan.
type AuditWriter struct {
	repo repository.AuditLogRepository
}

func NewAuditWriter(db *gorm.DB) *AuditWriter {
	return &AuditWriter{repo: postgres.NewAuditLogRepository(db)}
}

func toJSON(v interface{}) string {
	if v == nil {
		return ""
	}
	b, _ := json.Marshal(v)
	return string(b)
}

// Write mencatat satu baris audit.
func (w *AuditWriter) Write(outletID, penggunaID uint, penggunaNama, aksi, entitas string, entitasID uint, lama, baru interface{}, alasan, status string) error {
	return w.repo.Create(&entity.AuditLog{
		OutletID: outletID, PenggunaID: penggunaID, PenggunaNama: penggunaNama,
		Aksi: aksi, Entitas: entitas, EntitasID: entitasID,
		NilaiLama: toJSON(lama), NilaiBaru: toJSON(baru),
		Alasan: alasan, Status: status,
	})
}
