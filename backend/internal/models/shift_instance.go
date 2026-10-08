package models

import "time"

// ShiftInstance adalah catatan operasional SATU shift pada SATU tanggal
// (contoh: Pagi 2026-10-09). Beda dengan ShiftConfig yang hanya template jam.
// K1: tanpa DeletedAt (soft-delete merusak unique DB) — koreksi = baris baru.
// Status: terjadwal, aktif, ditutup, menunggu_pemeriksaan, disetujui, dikunci.
type ShiftInstance struct {
	ID              uint      `gorm:"primaryKey" json:"id"`
	CreatedAt       time.Time `gorm:"index" json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
	OutletID        uint      `json:"outlet_id" gorm:"index;uniqueIndex:uq_shift_instance;not null"`
	ShiftConfigID   uint      `json:"shift_config_id" gorm:"index;uniqueIndex:uq_shift_instance;not null"`
	Tanggal         time.Time `json:"tanggal" gorm:"type:date;index;uniqueIndex:uq_shift_instance;not null"`
	JamMulaiAktual  string    `json:"jam_mulai_aktual" gorm:"size:5"`
	JamSelesaiAktual string   `json:"jam_selesai_aktual" gorm:"size:5"`
	Status          string    `json:"status" gorm:"size:30;default:terjadwal;index"`
	Revenue         float64   `json:"revenue" gorm:"default:0"`
	HPP             float64   `json:"hpp" gorm:"default:0"`
	BiayaLangsung   float64   `json:"biaya_langsung" gorm:"default:0"`
	BiayaAlokasi    float64   `json:"biaya_alokasi" gorm:"default:0"`
	DasarBagiHasil  float64   `json:"dasar_bagi_hasil" gorm:"default:0"`
	OwnerShare      float64   `json:"owner_share" gorm:"default:0"`
	PoolBarista     float64   `json:"pool_barista" gorm:"default:0"`
	SisaKas         float64   `json:"sisa_kas" gorm:"default:0"`
	Catatan         string    `json:"catatan" gorm:"type:text"`
	PenanggungJawab string    `json:"penanggung_jawab" gorm:"size:100"`
}

func (ShiftInstance) TableName() string { return "shift_instances" }
