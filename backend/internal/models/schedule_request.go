package models

import "time"

// ScheduleRequest adalah titipan libur/izin/sakit barista: hari apa, shift
// apa (ShiftConfigID NULL = semua shift hari itu). Dicatat owner/manajer
// sebelum generate agar hasil generate langsung menghormatinya.
// K1: tanpa DeletedAt — request adalah arsip riwayat perselisihan;
// penghapusan dicatat di audit, bukan fisik... (penghapusan lewat repo tetap
// dimungkinkan dengan audit; tabel sendiri tidak soft-delete).
type ScheduleRequest struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	CreatedAt     time.Time `gorm:"index" json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
	OutletID      uint      `json:"outlet_id" gorm:"index;not null"`
	BaristaID     uint      `json:"barista_id" gorm:"index;not null"`
	BaristaName   string    `json:"barista_name" gorm:"size:100;index"`
	Tanggal       time.Time `json:"tanggal" gorm:"type:date;index;not null"`
	ShiftConfigID *uint     `json:"shift_config_id" gorm:"index"`
	Jenis         string    `json:"jenis" gorm:"size:20;default:libur;index"`
	Catatan       string    `json:"catatan" gorm:"type:text"`
	DibuatOleh    uint      `json:"dibuat_oleh"`
}

func (ScheduleRequest) TableName() string { return "schedule_requests" }
