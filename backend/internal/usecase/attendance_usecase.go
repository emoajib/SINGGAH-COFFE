package usecase

import (
	"encoding/json"
	"strings"
	"time"

	"singgah-pos-backend/internal/domain/entity"
	domainErrors "singgah-pos-backend/internal/domain/errors"
	"singgah-pos-backend/internal/repository"
	"singgah-pos-backend/internal/repository/postgres"

	"gorm.io/gorm"
)

// AttendanceUsecase: catat & sahkan kehadiran (owner & manajer). C2.
type AttendanceUsecase struct {
	db      *gorm.DB
	repo    repository.AttendanceRepository
	shifts  repository.ShiftInstanceRepository
	configs repository.ShiftConfigRepository
	periods repository.ProfitSharingPeriodRepository
	people  repository.ProfitSharingPersonRepository
	audit   *AuditWriter
}

func NewAttendanceUsecase(db *gorm.DB) *AttendanceUsecase {
	return &AttendanceUsecase{
		db: db, repo: postgres.NewAttendanceRepository(db),
		shifts: postgres.NewShiftInstanceRepository(db),
		configs: postgres.NewShiftConfigRepository(db),
		periods: postgres.NewProfitSharingPeriodRepository(db),
		people: postgres.NewProfitSharingPeopleRepository(db),
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
	// Bridge: cerminkan ke attendance JSON draft periode agar ikut hitungan pool.
	uc.syncPersonAttendance(a.OutletID, a.BaristaName, si.Tanggal, si.ShiftConfigID, a.Disahkan)
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

// syncPersonAttendance mencerminkan kehadiran shift ke attendance JSON
// (map[tanggal][]shiftID) milik barista pada periode DRAFT yang mencakup
// tanggal tersebut. Tanpa bridge ini, persetujuan di Jadwal & Shift tidak
// mengubah angka bagi hasil. Best-effort: gagal diam-diam tanpa menggagalkan
// pencatatan utama. Hanya periode draft yang disentuh; terkunci tidak berubah.
func (uc *AttendanceUsecase) syncPersonAttendance(outletID uint, baristaName string, tanggal time.Time, shiftConfigID uint, hadir bool) {
	day := time.Date(tanggal.Year(), tanggal.Month(), tanggal.Day(), 0, 0, 0, 0, tanggal.Location())
	period, err := uc.periods.FindOverlappingPeriod(outletID, day, day, 0)
	if err != nil || period == nil || period.Status != "draft" {
		return
	}
	people, err := uc.people.GetByPeriodID(period.ID)
	if err != nil {
		return
	}
	for i := range people {
		p := &people[i]
		if p.Role == "owner" || !equalName(p.Name, baristaName) {
			continue
		}
		att := map[string][]uint{}
		if p.Attendance != "" && p.Attendance != "{}" {
			_ = json.Unmarshal([]byte(p.Attendance), &att)
		}
		key := day.Format("2006-01-02")
		if hadir {
			found := false
			for _, sid := range att[key] {
				if sid == shiftConfigID {
					found = true
					break
				}
			}
			if !found {
				att[key] = append(att[key], shiftConfigID)
			}
		} else {
			kept := att[key][:0]
			for _, sid := range att[key] {
				if sid != shiftConfigID {
					kept = append(kept, sid)
				}
			}
			if len(kept) == 0 {
				delete(att, key)
			} else {
				att[key] = kept
			}
		}
		if b, err := json.Marshal(att); err == nil {
			_ = uc.people.UpdateAttendance(p.ID, string(b))
		}
		return
	}
}

func equalName(a, b string) bool {
	na := strings.TrimSpace(a)
	nb := strings.TrimSpace(b)
	return na != "" && nb != "" && strings.EqualFold(na, nb)
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
