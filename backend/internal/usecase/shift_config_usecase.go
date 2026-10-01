package usecase

import (
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
	Create(shift *entity.ShiftConfig) error
	Update(shift *entity.ShiftConfig) error
	GetAll(outletID uint) ([]entity.ShiftConfig, error)
	GetByID(id uint) (*entity.ShiftConfig, error)
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
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
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
	if shift.StartTime == shift.EndTime {
		return domainErrors.NewInvalidInputError("start_time dan end_time tidak boleh sama")
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

// Create adds a new shift config.
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (uc *shiftConfigUsecase) Create(shift *entity.ShiftConfig) error {
	if err := uc.validate(shift); err != nil {
		return err
	}
	shift.CreatedAt = time.Now()
	shift.UpdatedAt = time.Now()
	return uc.shiftConfigRepo.Create(shift)
}

// Update modifies an existing shift config.
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (uc *shiftConfigUsecase) Update(shift *entity.ShiftConfig) error {
	if err := uc.validate(shift); err != nil {
		return err
	}
	shift.UpdatedAt = time.Now()
	return uc.shiftConfigRepo.Update(shift)
}

// GetAll returns all shift configs for an outlet.
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (uc *shiftConfigUsecase) GetAll(outletID uint) ([]entity.ShiftConfig, error) {
	return uc.shiftConfigRepo.FindByOutletID(outletID, false)
}

// GetByID returns a shift config by ID.
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (uc *shiftConfigUsecase) GetByID(id uint) (*entity.ShiftConfig, error) {
	return uc.shiftConfigRepo.FindByID(id)
}

// Delete removes a shift config. Refuses if any ProfitSharingPerson references it.
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (uc *shiftConfigUsecase) Delete(id uint, outletID uint) error {
	// Check for referenced people via direct GORM query
	var count int64
	if err := uc.db.Model(&entity.ShiftConfig{}).Table("profit_sharing_people").
		Where("shift_id = ?", id).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return domainErrors.NewInvalidInputError("tidak dapat menghapus shift yang masih digunakan oleh barista")
	}
	return uc.shiftConfigRepo.Delete(id)
}