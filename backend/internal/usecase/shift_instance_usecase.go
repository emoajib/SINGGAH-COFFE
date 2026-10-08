package usecase

import (
	"time"

	"singgah-pos-backend/internal/domain/entity"
	domainErrors "singgah-pos-backend/internal/domain/errors"
	"singgah-pos-backend/internal/repository"
	"singgah-pos-backend/internal/repository/postgres"

	"gorm.io/gorm"
)

// ShiftInstanceUsecase: siklus shift operasional (owner & manajer). C3.
type ShiftInstanceUsecase struct {
	db       *gorm.DB
	repo     repository.ShiftInstanceRepository
	configs  repository.ShiftConfigRepository
	attend   repository.AttendanceRepository
	period   repository.ProfitSharingPeriodRepository
	expenses repository.ExpenseRepository
	cashbons repository.BaristaCashbonRepository
	audit    *AuditWriter
}

func NewShiftInstanceUsecase(db *gorm.DB) *ShiftInstanceUsecase {
	return &ShiftInstanceUsecase{
		db: db, repo: postgres.NewShiftInstanceRepository(db),
		configs: postgres.NewShiftConfigRepository(db),
		attend:  postgres.NewAttendanceRepository(db),
		period:  postgres.NewProfitSharingPeriodRepository(db),
		expenses: postgres.NewExpenseRepository(db),
		cashbons: postgres.NewBaristaCashbonRepository(db),
		audit:   NewAuditWriter(db),
	}
}

// transisi legal antar status shift.
var shiftTransitions = map[string][]string{
	"terjadwal":           {"aktif"},
	"aktif":               {"ditutup"},
	"ditutup":             {"menunggu_pemeriksaan"},
	"menunggu_pemeriksaan": {"disetujui"},
	"disetujui":           {"dikunci"},
}

func validShiftTransition(dari, ke string) bool {
	for _, t := range shiftTransitions[dari] {
		if t == ke {
			return true
		}
	}
	return false
}

func (uc *ShiftInstanceUsecase) Create(outletID, shiftConfigID uint, tanggal string, userID uint, userName string) (*entity.ShiftInstance, error) {
	cfg, err := uc.configs.FindByID(shiftConfigID)
	if err != nil {
		return nil, domainErrors.NewNotFoundError("shift")
	}
	if !cfg.IsActive {
		return nil, domainErrors.NewInvalidInputError("konfigurasi shift nonaktif")
	}
	tgl, err := time.Parse("2006-01-02", tanggal)
	if err != nil {
		return nil, domainErrors.NewInvalidInputError("format tanggal harus YYYY-MM-DD")
	}
	s := &entity.ShiftInstance{
		OutletID: outletID, ShiftConfigID: shiftConfigID, Tanggal: tgl,
		JamMulaiAktual: cfg.StartTime, JamSelesaiAktual: cfg.EndTime,
		Status: "terjadwal", ShiftName: cfg.Name,
	}
	if err := uc.repo.Create(s); err != nil {
		return nil, domainErrors.NewInvalidInputError("shift untuk tanggal ini sudah ada")
	}
	_ = uc.audit.Write(outletID, userID, userName, "create", "shift_instance", s.ID, nil, s, "", "disetujui")
	return s, nil
}

func (uc *ShiftInstanceUsecase) SetStatus(id, outletID uint, ke string, userID uint, userName string) error {
	s, err := uc.repo.FindByID(id, outletID)
	if err != nil {
		return domainErrors.NewNotFoundError("shift")
	}
	if !validShiftTransition(s.Status, ke) {
		return domainErrors.NewInvalidInputError("transisi status " + s.Status + " -> " + ke + " tidak diizinkan")
	}
	lama := s.Status
	s.Status = ke
	if err := uc.repo.Update(s); err != nil {
		return err
	}
	_ = uc.audit.Write(outletID, userID, userName, "set_status", "shift_instance", id, lama, ke, "", "disetujui")
	return nil
}

func (uc *ShiftInstanceUsecase) GetByDate(outletID uint, tanggal string) ([]entity.ShiftInstance, error) {
	return uc.repo.FindByOutletDate(outletID, tanggal)
}

func (uc *ShiftInstanceUsecase) GetOpen(outletID uint) ([]entity.ShiftInstance, error) {
	return uc.repo.FindOpen(outletID)
}
