package models

import "time"

// Attendance adalah kehadiran per shift, TERPISAH dari jadwal.
// ScheduleID nullable: kehadiran luar-jadwal tidak punya schedule.
// Status: menunggu_verifikasi, hadir, tidak_hadir, libur, izin, sakit,
// hadir_luar_jadwal (butuh persetujuan), ditolak.
// K1: tanpa DeletedAt. Anti persetujuan ganda via unique + transaksi.
type Attendance struct {
	ID              uint       `gorm:"primaryKey" json:"id"`
	CreatedAt       time.Time  `gorm:"index" json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
	OutletID        uint       `json:"outlet_id" gorm:"index;not null"`
	ScheduleID      *uint      `json:"schedule_id" gorm:"uniqueIndex:uq_att_schedule"`
	ShiftInstanceID uint       `json:"shift_instance_id" gorm:"index;uniqueIndex:uq_att_shift_barista;not null"`
	BaristaID       uint       `json:"barista_id" gorm:"index;uniqueIndex:uq_att_shift_barista;not null"`
	BaristaName     string     `json:"barista_name" gorm:"size:100;index"`
	Status          string     `json:"status" gorm:"size:30;default:menunggu_verifikasi;index"`
	Alasan          string     `json:"alasan" gorm:"type:text"`
	Disahkan        bool       `json:"disahkan" gorm:"default:false;index"`
	DicatatOleh     uint       `json:"dicatat_oleh"`
	DisetujuiOleh   *uint      `json:"disetujui_oleh"`
	DisetujuiPada   *time.Time `json:"disetujui_pada"`
}

func (Attendance) TableName() string { return "attendances" }
