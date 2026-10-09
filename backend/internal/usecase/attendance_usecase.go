package usecase

import (
	"singgah-pos-backend/internal/domain/entity"
	domainErrors "singgah-pos-backend/internal/domain/errors"
	"singgah-pos-backend/internal/repository"
	"singgah-pos-backend/internal/repository/postgres"

	"gorm.io/gorm"
)

// AttendanceUsecase: catat & sahkan kehadiran (owner & manajer). C2.
// BATAS MODUL (pemisahan): modul Jadwal HANYA mencatat data berangkat/libur
// (schedules, attendances, shift instances) + audit. Modul ini TIDAK menulis
// ke data periode bagi hasil; satu-satunya input hitungan adalah attendance
// JSON milik orang yang dikelola dari modal Bagi Hasil. Pemisahan ini
// menghilangkan tabrakan tulis (bridge-vs-form) yang membuat data seolah
// "belum tersimpan".
type AttendanceUsecase struct {
	db      *gorm.DB
	repo    repository.AttendanceRepository
	shifts  repository.ShiftInstanceRepository
	configs repository.ShiftConfigRepository
	audit   *AuditWriter
}

func NewAttendanceUsecase(db *gorm.DB) *AttendanceUsecase {
	return &AttendanceUsecase{
		db: db, repo: postgres.NewAttendanceRepository(db),
		shifts: postgres.NewShiftInstanceRepository(db),
		configs: postgres.NewShiftConfigRepository(db),
		audit:  NewAuditWriter(db),
	}
}

var validAttendanceStatus = map[string]bool{
	"menunggu_verifikasi": true, "hadir": true, "tidak_hadir": true,
	"libur": true, "izin": true, "sakit": true,
	"hadir_luar_jadwal": true, "ditolak": true,
}

// Record mencatat kehadiran. Sesuai jadwal -> langsung disahkan;
// luar jadwal (ScheduleID nil) -> menunggu_verifikasi + wajib alasan.
func (uc *AttendanceUsecase) Record(a *entity.Attendance, userID uint, userName string) error {
	if a.BaristaID == 0 || a.ShiftInstanceID == 0 {
		return domainErrors.NewInvalidInputError("barista dan shift wajib diisi")
	}
	if !validAttendanceStatus[a.Status] {
		return domainErrors.NewInvalidInputError("status kehadiran tidak valid")
	}
	si, err := uc.shifts.FindByID(a.ShiftInstanceID, a.OutletID)
	if err != nil {
		return domainErrors.NewNotFoundError("shift")
	}
	if si.Status == "dikunci" || si.Status == "disetujui" {
		return domainErrors.NewInvalidInputError("shift sudah disetujui/dikunci, kehadiran tidak bisa diubah")
	}
	a.DicatatOleh = userID
	if a.ScheduleID != nil {
		a.Disahkan = true
		p := userID
		a.DisetujuiOleh = &p
	} else {
		if a.Alasan == "" {
			return domainErrors.NewInvalidInputError("kehadiran luar jadwal wajib mencantumkan alasan")
		}
		a.Status = "hadir_luar_jadwal"
		a.Disahkan = false
	}
	if err := uc.repo.Create(a); err != nil {
		return domainErrors.NewInvalidInputError("kehadiran ganda: barista sudah tercatat pada shift ini")
	}
	_ = uc.audit.Write(a.OutletID, userID, userName, "record", "attendance", a.ID, nil, a, a.Alasan, "menunggu")
	return nil
}

func (uc *AttendanceUsecase) ListByShift(shiftInstanceID, outletID uint) ([]entity.Attendance, error) {
	list, err := uc.repo.FindByShiftInstance(shiftInstanceID, outletID)
	if err != nil {
		return nil, err
	}
	uc.enrich(list, outletID)
	return list, nil
}

func (uc *AttendanceUsecase) ListPending(outletID uint) ([]entity.Attendance, error) {
	list, err := uc.repo.FindPending(outletID)
	if err != nil {
		return nil, err
	}
	uc.enrich(list, outletID)
	return list, nil
}

// enrich mengisi Tanggal/ShiftName/ShiftConfigID transien untuk tampilan.
// Daftar kehadiran kecil (tugas harian), jadi cache per panggil cukup.
func (uc *AttendanceUsecase) enrich(list []entity.Attendance, outletID uint) {
	instCache := map[uint]*entity.ShiftInstance{}
	cfgCache := map[uint]*entity.ShiftConfig{}
	for i := range list {
		a := &list[i]
		si, ok := instCache[a.ShiftInstanceID]
		if !ok {
			if found, err := uc.shifts.FindByID(a.ShiftInstanceID, outletID); err == nil {
				si = found
			}
			instCache[a.ShiftInstanceID] = si
		}
		if si == nil {
			continue
		}
		a.Tanggal = si.Tanggal.Format("2006-01-02")
		a.ShiftConfigID = si.ShiftConfigID
		cfg, ok := cfgCache[si.ShiftConfigID]
		if !ok {
			if found, err := uc.configs.FindByID(si.ShiftConfigID); err == nil {
				cfg = found
			}
			cfgCache[si.ShiftConfigID] = cfg
		}
		if cfg != nil {
			a.ShiftName = cfg.Name
		}
	}
}
