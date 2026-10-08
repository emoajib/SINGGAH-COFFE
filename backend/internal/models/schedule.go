package models

import "time"

// Schedule adalah jadwal SATU barista pada SATU tanggal+shift.
// Satu barista boleh dijadwalkan pagi DAN malam di tanggal yang sama
// (dua baris berbeda). Duplikat (barista,tanggal,shift) dicegah DB.
// K1: tanpa DeletedAt — jadwal diubah via status/koreksi, bukan hapus fisik.
// Status: dijadwalkan, libur, izin, sakit, belum_ditentukan.
type Schedule struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	CreatedAt     time.Time `gorm:"index" json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
	OutletID      uint      `json:"outlet_id" gorm:"index;not null"`
	BaristaID     uint      `json:"barista_id" gorm:"index;uniqueIndex:uq_schedule;not null"`
	BaristaName   string    `json:"barista_name" gorm:"size:100;index"`
	Tanggal       time.Time `json:"tanggal" gorm:"type:date;index;uniqueIndex:uq_schedule;not null"`
	ShiftConfigID uint      `json:"shift_config_id" gorm:"index;uniqueIndex:uq_schedule;not null"`
	Status        string    `json:"status" gorm:"size:20;default:belum_ditentukan;index"`
	JamKerja      string    `json:"jam_kerja" gorm:"size:50"`
	Catatan       string    `json:"catatan" gorm:"type:text"`
	DibuatOleh    uint      `json:"dibuat_oleh"`
}

func (Schedule) TableName() string { return "schedules" }
