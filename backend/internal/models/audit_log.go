package models

import "time"

// AuditLog mencatat setiap perubahan berdampak finansial/absensi.
// Append-only: tidak ada endpoint hapus/ubah. Nilai lama-baru format JSON.
// K2: kolom TEXT tanpa default DB (default diisi di kode aplikasi).
type AuditLog struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	CreatedAt    time.Time `gorm:"index" json:"created_at"`
	OutletID     uint      `json:"outlet_id" gorm:"index"`
	PenggunaID   uint      `json:"pengguna_id" gorm:"index"`
	PenggunaNama string    `json:"pengguna_nama" gorm:"size:100"`
	Aksi         string    `json:"aksi" gorm:"size:50;index"`
	Entitas      string    `json:"entitas" gorm:"size:50;index"`
	EntitasID    uint      `json:"entitas_id" gorm:"index"`
	NilaiLama    string    `json:"nilai_lama" gorm:"type:text"`
	NilaiBaru    string    `json:"nilai_baru" gorm:"type:text"`
	Alasan       string    `json:"alasan" gorm:"type:text"`
	Status       string    `json:"status" gorm:"size:30;index"`
}

func (AuditLog) TableName() string { return "audit_logs" }
