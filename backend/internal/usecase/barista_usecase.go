package usecase

import (
	"strings"

	"singgah-pos-backend/internal/domain/entity"
	domainErrors "singgah-pos-backend/internal/domain/errors"
	"singgah-pos-backend/internal/repository"
	"singgah-pos-backend/internal/repository/postgres"

	"gorm.io/gorm"
)

// BaristaUsecase handles business logic for barista management
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
type BaristaUsecase struct {
	db          *gorm.DB
	baristaRepo repository.BaristaRepository
}

func NewBaristaUsecase(db *gorm.DB) *BaristaUsecase {
	return &BaristaUsecase{
		db:          db,
		baristaRepo: postgres.NewBaristaRepository(db),
	}
}

func (uc *BaristaUsecase) Create(b *entity.Barista) error {
	name := strings.TrimSpace(b.Name)
	if name == "" {
		return domainErrors.NewInvalidInputError("nama barista tidak boleh kosong")
	}
	b.Name = name
	if b.DefaultSharePct < 0 || b.DefaultSharePct > 100 {
		return domainErrors.NewInvalidInputError("persentase bagi hasil default harus antara 0 dan 100")
	}
	if b.Status == "" {
		b.Status = "active"
	}
	return uc.baristaRepo.Create(b)
}

func (uc *BaristaUsecase) GetByID(id uint, outletID uint) (*entity.Barista, error) {
	return uc.baristaRepo.FindByID(id, outletID)
}

func (uc *BaristaUsecase) GetAll(outletID uint, status string) ([]entity.Barista, error) {
	return uc.baristaRepo.FindByOutlet(outletID, status)
}

func (uc *BaristaUsecase) Update(b *entity.Barista) error {
	name := strings.TrimSpace(b.Name)
	if name == "" {
		return domainErrors.NewInvalidInputError("nama barista tidak boleh kosong")
	}
	b.Name = name
	if b.DefaultSharePct < 0 || b.DefaultSharePct > 100 {
		return domainErrors.NewInvalidInputError("persentase bagi hasil default harus antara 0 dan 100")
	}
	if b.Status == "" {
		b.Status = "active"
	}
	return uc.baristaRepo.Update(b)
}

func (uc *BaristaUsecase) Delete(id uint, outletID uint) error {
	return uc.baristaRepo.Delete(id, outletID)
}
