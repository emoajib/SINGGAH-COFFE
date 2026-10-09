package entity

import "time"

// ShiftInstance adalah catatan operasional satu shift pada satu tanggal.
type ShiftInstance struct {
	ID               uint      `json:"id"`
	OutletID         uint      `json:"outlet_id"`
	ShiftConfigID    uint      `json:"shift_config_id"`
	ShiftName        string    `json:"shift_name"`
	Tanggal          time.Time `json:"tanggal"`
	JamMulaiAktual   string    `json:"jam_mulai_aktual"`
	JamSelesaiAktual string    `json:"jam_selesai_aktual"`
	Status           string    `json:"status"`
	Revenue          float64   `json:"revenue"`
	HPP              float64   `json:"hpp"`
	BiayaLangsung    float64   `json:"biaya_langsung"`
	BiayaAlokasi     float64   `json:"biaya_alokasi"`
	DasarBagiHasil   float64   `json:"dasar_bagi_hasil"`
	OwnerShare       float64   `json:"owner_share"`
	PoolBarista      float64   `json:"pool_barista"`
	SisaKas          float64   `json:"sisa_kas"`
	Catatan          string    `json:"catatan"`
	PenanggungJawab  string    `json:"penanggung_jawab"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

// Schedule adalah jadwal satu barista pada satu tanggal+shift.
type Schedule struct {
	ID            uint      `json:"id"`
	OutletID      uint      `json:"outlet_id"`
	BaristaID     uint      `json:"barista_id"`
	BaristaName   string    `json:"barista_name"`
	Tanggal       time.Time `json:"tanggal"`
	ShiftConfigID uint      `json:"shift_config_id"`
	ShiftName     string    `json:"shift_name"`
	Status        string    `json:"status"`
	JamKerja      string    `json:"jam_kerja"`
	Catatan       string    `json:"catatan"`
	DibuatOleh    uint      `json:"dibuat_oleh"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// Attendance adalah kehadiran per shift, terpisah dari jadwal.
type Attendance struct {
	ID              uint       `json:"id"`
	OutletID        uint       `json:"outlet_id"`
	ScheduleID      *uint      `json:"schedule_id"`
	ShiftInstanceID uint       `json:"shift_instance_id"`
	BaristaID       uint       `json:"barista_id"`
	BaristaName     string     `json:"barista_name"`
	Status          string     `json:"status"`
	Alasan          string     `json:"alasan"`
	Disahkan        bool       `json:"disahkan"`
	DicatatOleh     uint       `json:"dicatat_oleh"`
	DisetujuiOleh   *uint      `json:"disetujui_oleh"`
	DisetujuiPada   *time.Time `json:"disetujui_pada"`
	// Transien untuk tampilan: diisi usecase dari shift instance + config.
	Tanggal       string `json:"tanggal"`
	ShiftName     string `json:"shift_name"`
	ShiftConfigID uint   `json:"shift_config_id"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

// ScheduleRequest adalah titipan libur/izin/sakit: hari apa, shift apa.
type ScheduleRequest struct {
	ID            uint      `json:"id"`
	OutletID      uint      `json:"outlet_id"`
	BaristaID     uint      `json:"barista_id"`
	BaristaName   string    `json:"barista_name"`
	Tanggal       time.Time `json:"tanggal"`
	ShiftConfigID *uint     `json:"shift_config_id"`
	ShiftName     string    `json:"shift_name"`
	Jenis         string    `json:"jenis"`
	Catatan       string    `json:"catatan"`
	DibuatOleh    uint      `json:"dibuat_oleh"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// AuditLog adalah baris jejak audit yang append-only.
type AuditLog struct {
	ID           uint      `json:"id"`
	OutletID     uint      `json:"outlet_id"`
	PenggunaID   uint      `json:"pengguna_id"`
	PenggunaNama string    `json:"pengguna_nama"`
	Aksi         string    `json:"aksi"`
	Entitas      string    `json:"entitas"`
	EntitasID    uint      `json:"entitas_id"`
	NilaiLama    string    `json:"nilai_lama"`
	NilaiBaru    string    `json:"nilai_baru"`
	Alasan       string    `json:"alasan"`
	Status       string    `json:"status"`
	CreatedAt    time.Time `json:"created_at"`
}

// OpsTasks adalah daftar tugas operasional untuk notifikasi (Fase C7).
type OpsTasks struct {
	ShiftBelumTutup    int64 `json:"shift_belum_tutup"`
	KehadiranPending   int64 `json:"kehadiran_pending"`
	KasbonPending      int64 `json:"kasbon_pending"`
	BiayaBelumKlasif   int64 `json:"biaya_belum_klasifikasi"`
	PeriodeSiapReview  int64 `json:"periode_siap_review"`
}
