package usecase

import (
	"fmt"
	"strings"
	"unicode/utf8"

	"singgah-pos-backend/internal/domain/entity"
	domainErrors "singgah-pos-backend/internal/domain/errors"
	"singgah-pos-backend/internal/repository"
	"singgah-pos-backend/internal/repository/postgres"
	"time"

	"gorm.io/gorm"
)

// ShiftConfigUsecase defines business logic for managing shift configurations.
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
type ShiftConfigUsecase interface {
	// Create/Update mengembalikan daftar peringatan non-blocking (mis. celah jam
	// antar shift) bila penyimpanan tetap berhasil.
	Create(shift *entity.ShiftConfig) ([]string, error)
	Update(shift *entity.ShiftConfig) ([]string, error)
	GetAll(outletID uint) ([]entity.ShiftConfig, error)
	GetByID(id uint, outletID ...uint) (*entity.ShiftConfig, error)
	Delete(id uint, outletID uint) error
}

type shiftConfigUsecase struct {
	db              *gorm.DB
	shiftConfigRepo repository.ShiftConfigRepository
}

// NewShiftConfigUsecase creates a new ShiftConfigUsecase.
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func NewShiftConfigUsecase(db *gorm.DB) ShiftConfigUsecase {
	return &shiftConfigUsecase{
		db:              db,
		shiftConfigRepo: postgres.NewShiftConfigRepository(db),
	}
}

// validate checks business rules for a shift config.
func (uc *shiftConfigUsecase) validate(shift *entity.ShiftConfig) error {
	if shift.Name == "" {
		return domainErrors.NewInvalidInputError("nama shift wajib diisi")
	}
	if !isValidTimeFormat(shift.StartTime) {
		return domainErrors.NewInvalidInputError("format start_time tidak valid, gunakan HH:MM (contoh: 07:00)")
	}
	if !isValidTimeFormat(shift.EndTime) {
		return domainErrors.NewInvalidInputError("format end_time tidak valid, gunakan HH:MM (contoh: 14:00)")
	}
	// Allow overnight shifts (end_time < start_time means crosses midnight)
	// Only reject if exactly equal (zero duration)
	if shift.StartTime == shift.EndTime {
		return domainErrors.NewInvalidInputError("start_time dan end_time tidak boleh sama (durasi nol)")
	}
	if shift.OwnerPct < 0 || shift.OwnerPct > 100 {
		return domainErrors.NewInvalidInputError("owner_pct harus antara 0-100")
	}
	if shift.BaristaPoolPct < 0 || shift.BaristaPoolPct > 100 {
		return domainErrors.NewInvalidInputError("barista_pool_pct harus antara 0-100")
	}
	if shift.OwnerPct+shift.BaristaPoolPct != 100 {
		return domainErrors.NewInvalidInputError("owner_pct + barista_pool_pct harus = 100")
	}
	return nil
}

// isValidTimeFormat checks if a string is in HH:MM format.
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func isValidTimeFormat(s string) bool {
	if len(s) != 5 {
		return false
	}
	if s[2] != ':' {
		return false
	}
	h := int(s[0]-'0')*10 + int(s[1]-'0')
	m := int(s[3]-'0')*10 + int(s[4]-'0')
	return h >= 0 && h <= 23 && m >= 0 && m <= 59
}

// normalizeKode merapikan kode shift: uppercase, tanpa spasi, maks 3 karakter.
// Kosong berarti "ikut default": diturunkan dari nama (huruf pertama tiap kata).
func normalizeKode(kode, name string) string {
	k := strings.ToUpper(strings.ReplaceAll(strings.TrimSpace(kode), " ", ""))
	if k == "" {
		var inits []rune
		for _, w := range strings.Fields(name) {
			if r := []rune(w); len(r) > 0 {
				inits = append(inits, []rune(strings.ToUpper(w))[0])
			}
		}
		k = string(inits)
	}
	if utf8.RuneCountInString(k) > 3 {
		k = string([]rune(k)[:3])
	}
	return k
}

// ensureKodeUnique menolak kode duplikat dalam satu outlet (kecuali dirinya sendiri).
func (uc *shiftConfigUsecase) ensureKodeUnique(shift *entity.ShiftConfig) error {
	if shift.Kode == "" {
		return domainErrors.NewInvalidInputError("kode shift wajib diisi (maks 3 karakter)")
	}
	existing, err := uc.shiftConfigRepo.FindByOutletID(shift.OutletID, false)
	if err != nil {
		return err
	}
	for _, e := range existing {
		if e.ID != shift.ID && strings.EqualFold(e.Kode, shift.Kode) && shift.Kode != "" {
			return domainErrors.NewInvalidInputError("kode shift \"" + shift.Kode + "\" sudah dipakai shift \"" + e.Name + "\"")
		}
	}
	return nil
}

// parseHHMM mengubah "HH:MM" menjadi jumlah menit sejak 00:00.
func parseHHMM(s string) (int, bool) {
	if len(s) != 5 || s[2] != ':' {
		return 0, false
	}
	h := int(s[0]-'0')*10 + int(s[1]-'0')
	m := int(s[3]-'0')*10 + int(s[4]-'0')
	if h < 0 || h > 23 || m < 0 || m > 59 {
		return 0, false
	}
	return h*60 + m, true
}

// shiftWindowMinutes mengembalikan jendela [start,end) dalam menit. Bila
// end <= start (lintas tengah malam) maka end ditambah 1440. ok=false bila
// format tidak valid atau durasi nol.
func shiftWindowMinutes(start, end string) (int, int, bool) {
	s, ok1 := parseHHMM(start)
	e, ok2 := parseHHMM(end)
	if !ok1 || !ok2 || s == e {
		return 0, 0, false
	}
	if e < s {
		e += 1440
	}
	return s, e, true
}

// minutesLabel memformat menit (boleh > 1440 untuk lintas tengah malam) ke "HH:MM".
func minutesLabel(min int) string {
	m := ((min % 1440) + 1440) % 1440
	return fmt.Sprintf("%02d:%02d", m/60, m%60)
}

// analyzeShiftWindows membandingkan shift kandidat dengan shift aktif lain.
// Mengembalikan nama shift yang tumpang-tindih (bila ada) dan daftar celah jam
// "HH:MM–HH:MM" yang BERADA DI ANTARA dua shift (bukan sekadar jam tutup di luar
// jadwal) sehingga order pada jam tersebut tidak akan terbagi ke bagi hasil.
func analyzeShiftWindows(cand entity.ShiftConfig, others []entity.ShiftConfig) (overlapWith string, gaps []string) {
	cs, ce, ok := shiftWindowMinutes(cand.StartTime, cand.EndTime)
	if !ok {
		return "", nil
	}
	candSet := make([]bool, 1440)
	for m := cs; m < ce; m++ {
		candSet[m%1440] = true
	}
	union := make([]bool, 1440)
	copy(union, candSet)
	for _, o := range others {
		os, oe, ok := shiftWindowMinutes(o.StartTime, o.EndTime)
		if !ok {
			continue
		}
		for m := os; m < oe; m++ {
			if candSet[m%1440] && overlapWith == "" {
				overlapWith = o.Name
			}
			union[m%1440] = true
		}
	}
	if overlapWith != "" {
		return overlapWith, nil
	}
	return "", adjacentGaps(union, cs, ce, others)
}

// adjacentGaps mencari rentang menit tak tertutup yang diapit shift kandidat dan
// shift lain (celah internal), bukan jam tutup di tepi jadwal.
func adjacentGaps(union []bool, cs, ce int, others []entity.ShiftConfig) []string {
	startMod := cs % 1440
	endMod := ce % 1440
	otherStarts := map[int]bool{}
	otherEnds := map[int]bool{}
	for _, o := range others {
		if os, oe, ok := shiftWindowMinutes(o.StartTime, o.EndTime); ok {
			otherStarts[os%1440] = true
			otherEnds[oe%1440] = true
		}
	}
	var gaps []string
	runStart := -1
	for m := 0; m <= 1440; m++ {
		open := m < 1440 && !union[m]
		if open {
			if runStart == -1 {
				runStart = m
			}
			continue
		}
		if runStart != -1 {
			gs, ge := runStart, m
			boundedLeft := otherEnds[gs%1440] || gs%1440 == endMod
			boundedRight := otherStarts[ge%1440] || ge%1440 == startMod
			if boundedLeft && boundedRight {
				gaps = append(gaps, minutesLabel(gs)+"–"+minutesLabel(ge))
			}
			runStart = -1
		}
	}
	return gaps
}

// checkWindowConflicts menolak tumpang-tindih (menyebabkan dobel-hitung) dan
// melaporkan celah jam antar shift sebagai peringatan non-blocking.
func (uc *shiftConfigUsecase) checkWindowConflicts(shift *entity.ShiftConfig) ([]string, error) {
	if !shift.IsActive {
		return nil, nil
	}
	existing, err := uc.shiftConfigRepo.FindByOutletID(shift.OutletID, true)
	if err != nil {
		return nil, err
	}
	others := make([]entity.ShiftConfig, 0, len(existing))
	for _, e := range existing {
		if e.ID != shift.ID {
			others = append(others, e)
		}
	}
	overlapWith, gaps := analyzeShiftWindows(*shift, others)
	if overlapWith != "" {
		return nil, domainErrors.NewInvalidInputError("jam shift tumpang-tindih dengan shift \"" + overlapWith + "\"; perbaiki jam agar pendapatan tidak terhitung dua kali")
	}
	if len(gaps) == 0 {
		return nil, nil
	}
	return []string{"Shift tersimpan, tetapi menyisakan celah jam " + strings.Join(gaps, ", ") + " di antara shift. Order pada jam tersebut tidak akan terbagi ke bagi hasil; rapatkan jam shift bila itu bukan jam tutup."}, nil
}

// Create adds a new shift config.
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (uc *shiftConfigUsecase) Create(shift *entity.ShiftConfig) ([]string, error) {
	if err := uc.validate(shift); err != nil {
		return nil, err
	}
	shift.Kode = normalizeKode(shift.Kode, shift.Name)
	if err := uc.ensureKodeUnique(shift); err != nil {
		return nil, err
	}
	warnings, err := uc.checkWindowConflicts(shift)
	if err != nil {
		return nil, err
	}
	shift.CreatedAt = time.Now()
	shift.UpdatedAt = time.Now()
	if err := uc.shiftConfigRepo.Create(shift); err != nil {
		return nil, err
	}
	return warnings, nil
}

// Update modifies an existing shift config.
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (uc *shiftConfigUsecase) Update(shift *entity.ShiftConfig) ([]string, error) {
	if err := uc.validate(shift); err != nil {
		return nil, err
	}
	shift.Kode = normalizeKode(shift.Kode, shift.Name)
	if err := uc.ensureKodeUnique(shift); err != nil {
		return nil, err
	}
	warnings, err := uc.checkWindowConflicts(shift)
	if err != nil {
		return nil, err
	}
	shift.UpdatedAt = time.Now()
	if err := uc.shiftConfigRepo.Update(shift); err != nil {
		return nil, err
	}
	return warnings, nil
}

// GetAll returns all shift configs for an outlet.
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (uc *shiftConfigUsecase) GetAll(outletID uint) ([]entity.ShiftConfig, error) {
	return uc.shiftConfigRepo.FindByOutletID(outletID, false)
}

// GetByID returns a shift config by ID.
func (uc *shiftConfigUsecase) GetByID(id uint, outletID ...uint) (*entity.ShiftConfig, error) {
	cfg, err := uc.shiftConfigRepo.FindByID(id, outletID...)
	if err != nil {
		return nil, domainErrors.NewNotFoundError("shift")
	}
	return cfg, nil
}

// Delete removes a shift config. Refuses if any ProfitSharingPerson references it
// in their shift_ids JSON array.
// A0 FIX: guard lama query kolom "shift_id" yang TIDAK ADA di tabel
// profit_sharing_people (yang ada: shift_ids JSON "[1,2]") sehingga hapus
// shift selalu error. Sekarang memakai CountPeopleByShiftID yang aman-substring.
func (uc *shiftConfigUsecase) Delete(id uint, outletID uint) error {
	count, err := uc.shiftConfigRepo.CountPeopleByShiftID(id)
	if err != nil {
		return err
	}
	if count > 0 {
		return domainErrors.NewInvalidInputError("tidak dapat menghapus shift yang masih digunakan oleh barista")
	}
	if err := uc.shiftConfigRepo.Delete(id, outletID); err != nil {
		return domainErrors.NewNotFoundError("shift")
	}
	return nil
}