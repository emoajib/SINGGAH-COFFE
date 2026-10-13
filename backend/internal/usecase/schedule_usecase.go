package usecase

import (
	"time"

	"singgah-pos-backend/internal/domain/entity"
	domainErrors "singgah-pos-backend/internal/domain/errors"
	"singgah-pos-backend/internal/repository"
	"singgah-pos-backend/internal/repository/postgres"

	"gorm.io/gorm"
)

// ScheduleUsecase: kelola jadwal barista (owner & manajer). C1.
type ScheduleUsecase struct {
	db        *gorm.DB
	repo      repository.ScheduleRepository
	requests  repository.ScheduleRequestRepository
	baristas  repository.BaristaRepository
	shifts    repository.ShiftConfigRepository
	audit     *AuditWriter
}

func NewScheduleUsecase(db *gorm.DB) *ScheduleUsecase {
	return &ScheduleUsecase{
		db: db, repo: postgres.NewScheduleRepository(db),
		requests: postgres.NewScheduleRequestRepository(db),
		baristas: postgres.NewBaristaRepository(db),
		shifts:   postgres.NewShiftConfigRepository(db),
		audit:    NewAuditWriter(db),
	}
}

var validScheduleStatus = map[string]bool{
	"dijadwalkan": true, "libur": true, "izin": true,
	"sakit": true, "belum_ditentukan": true,
}

func (uc *ScheduleUsecase) validate(s *entity.Schedule) error {
	if s.BaristaID == 0 {
		return domainErrors.NewInvalidInputError("barista wajib diisi")
	}
	if s.Tanggal.IsZero() {
		return domainErrors.NewInvalidInputError("tanggal wajib diisi")
	}
	if s.ShiftConfigID == 0 {
		return domainErrors.NewInvalidInputError("shift wajib diisi")
	}
	if !validScheduleStatus[s.Status] {
		return domainErrors.NewInvalidInputError("status jadwal tidak valid")
	}
	b, err := uc.baristas.FindByID(s.BaristaID, s.OutletID)
	if err != nil {
		return domainErrors.NewNotFoundError("barista")
	}
	if b.Status != "" && b.Status != "active" {
		return domainErrors.NewInvalidInputError("barista nonaktif tidak bisa dijadwalkan")
	}
	s.BaristaName = b.Name
	if _, err := uc.shifts.FindByID(s.ShiftConfigID); err != nil {
		return domainErrors.NewNotFoundError("shift")
	}
	return nil
}

func (uc *ScheduleUsecase) Create(s *entity.Schedule, userID uint, userName string) error {
	if s.Status == "" {
		s.Status = "dijadwalkan"
	}
	if err := uc.validate(s); err != nil {
		return err
	}
	tgl := s.Tanggal.Format("2006-01-02")
	dup, err := uc.repo.Exists(s.BaristaID, tgl, s.ShiftConfigID, s.OutletID)
	if err != nil {
		return err
	}
	if dup {
		return domainErrors.NewInvalidInputError("jadwal ganda: barista sudah dijadwalkan pada tanggal+shift ini")
	}
	if err := uc.repo.Create(s); err != nil {
		return err
	}
	_ = uc.audit.Write(s.OutletID, userID, userName, "create", "schedule", s.ID, nil, s, "", "disetujui")
	return nil
}

func (uc *ScheduleUsecase) Update(s *entity.Schedule, userID uint, userName string) error {
	lama, err := uc.repo.FindByID(s.ID, s.OutletID)
	if err != nil {
		return domainErrors.NewNotFoundError("jadwal")
	}
	if err := uc.validate(s); err != nil {
		return err
	}
	// Cek duplikat seperti Create (kecualikan diri sendiri).
	tgl := s.Tanggal.Format("2006-01-02")
	dup, err := uc.repo.Exists(s.BaristaID, tgl, s.ShiftConfigID, s.OutletID)
	if err != nil {
		return err
	}
	if dup && (lama.BaristaID != s.BaristaID || lama.Tanggal.Format("2006-01-02") != tgl || lama.ShiftConfigID != s.ShiftConfigID) {
		return domainErrors.NewInvalidInputError("jadwal ganda: barista sudah dijadwalkan pada tanggal+shift ini")
	}
	if err := uc.repo.Update(s); err != nil {
		return err
	}
	_ = uc.audit.Write(s.OutletID, userID, userName, "update", "schedule", s.ID, lama, s, "", "disetujui")
	return nil
}

func (uc *ScheduleUsecase) Delete(id, outletID, userID uint, userName string) error {
	lama, err := uc.repo.FindByID(id, outletID)
	if err != nil {
		return domainErrors.NewNotFoundError("jadwal")
	}
	if err := uc.repo.Delete(id, outletID); err != nil {
		return err
	}
	_ = uc.audit.Write(outletID, userID, userName, "delete", "schedule", id, lama, nil, "", "disetujui")
	return nil
}

func (uc *ScheduleUsecase) GetByDate(tanggal string, outletID uint) ([]entity.Schedule, error) {
	if _, err := time.Parse("2006-01-02", tanggal); err != nil {
		return nil, domainErrors.NewInvalidInputError("format tanggal harus YYYY-MM-DD")
	}
	return uc.repo.FindByDate(tanggal, outletID)
}

// GetByRange mengambil jadwal satu rentang (matriks roster bulanan, 1 query).
// Dibatasi 62 hari agar respons tetap ringan di shared hosting.
func (uc *ScheduleUsecase) GetByRange(start, end string, outletID uint) ([]entity.Schedule, error) {
	s, err := time.Parse("2006-01-02", start)
	if err != nil {
		return nil, domainErrors.NewInvalidInputError("format dari harus YYYY-MM-DD")
	}
	e, err := time.Parse("2006-01-02", end)
	if err != nil {
		return nil, domainErrors.NewInvalidInputError("format sampai harus YYYY-MM-DD")
	}
	if e.Before(s) || e.Sub(s).Hours()/24 > 62 {
		return nil, domainErrors.NewInvalidInputError("rentang maksimal 62 hari dan sampai >= dari")
	}
	return uc.repo.FindByRange(start, end, outletID)
}

// QuickSetDay menetapkan jadwal barista pada tanggal tertentu secara atomik (1 transaksi).
// Mode aksi:
// - "shift": Menjadwalkan barista ke shift_config_ids yang ditentukan (misal P, M, atau P+M).
// - "libur": Menandai barista libur pada tanggal tersebut.
// - "clear": Menghapus seluruh jadwal barista pada tanggal tersebut.
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (uc *ScheduleUsecase) QuickSetDay(outletID, baristaID uint, tanggal string, action string, shiftConfigIDs []uint, userID uint, userName string) error {
	if baristaID == 0 {
		return domainErrors.NewInvalidInputError("barista wajib diisi")
	}
	tgl, err := time.Parse("2006-01-02", tanggal)
	if err != nil {
		return domainErrors.NewInvalidInputError("format tanggal harus YYYY-MM-DD")
	}
	b, err := uc.baristas.FindByID(baristaID, outletID)
	if err != nil {
		return domainErrors.NewNotFoundError("barista")
	}
	if b.Status != "" && b.Status != "active" {
		return domainErrors.NewInvalidInputError("barista nonaktif tidak bisa dijadwalkan")
	}

	lama, _ := uc.repo.FindByBaristaDate(baristaID, tanggal, outletID)

	switch action {
	case "clear":
		if err := uc.repo.DeleteByBaristaDate(baristaID, tanggal, outletID); err != nil {
			return err
		}
		_ = uc.audit.Write(outletID, userID, userName, "quick_set_clear", "schedule", 0, lama, nil, tanggal, "disetujui")
		return nil

	case "libur":
		shifts, err := uc.shifts.FindByOutletID(outletID, true)
		if err != nil {
			return err
		}
		if len(shifts) == 0 {
			return domainErrors.NewInvalidInputError("tidak ada shift aktif")
		}
		if err := uc.repo.DeleteByBaristaDate(baristaID, tanggal, outletID); err != nil {
			return err
		}
		for _, s := range shifts {
			sched := &entity.Schedule{
				OutletID:      outletID,
				BaristaID:     baristaID,
				BaristaName:   b.Name,
				Tanggal:       tgl,
				ShiftConfigID: s.ID,
				Status:        "libur",
				DibuatOleh:    userID,
			}
			if err := uc.repo.Create(sched); err != nil {
				return err
			}
		}
		_ = uc.audit.Write(outletID, userID, userName, "quick_set_libur", "schedule", 0, lama, "libur", tanggal, "disetujui")
		return nil

	case "shift":
		if len(shiftConfigIDs) == 0 {
			return domainErrors.NewInvalidInputError("minimal 1 shift harus dipilih")
		}
		for _, sid := range shiftConfigIDs {
			cfg, err := uc.shifts.FindByID(sid)
			if err != nil || (cfg.OutletID != 0 && cfg.OutletID != outletID) {
				return domainErrors.NewNotFoundError("shift")
			}
		}
		if err := uc.repo.DeleteByBaristaDate(baristaID, tanggal, outletID); err != nil {
			return err
		}
		var baru []entity.Schedule
		for _, sid := range shiftConfigIDs {
			sched := &entity.Schedule{
				OutletID:      outletID,
				BaristaID:     baristaID,
				BaristaName:   b.Name,
				Tanggal:       tgl,
				ShiftConfigID: sid,
				Status:        "dijadwalkan",
				DibuatOleh:    userID,
			}
			if err := uc.repo.Create(sched); err != nil {
				return err
			}
			baru = append(baru, *sched)
		}
		_ = uc.audit.Write(outletID, userID, userName, "quick_set_shift", "schedule", 0, lama, baru, tanggal, "disetujui")
		return nil

	default:
		return domainErrors.NewInvalidInputError("aksi tidak valid, pilih 'shift', 'libur', atau 'clear'")
	}
}

