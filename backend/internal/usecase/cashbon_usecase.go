// Vetted by AI - Manual Review Required by Senior Engineer/Manager
package usecase

import (
	"fmt"
	"time"

	"singgah-pos-backend/internal/domain/entity"
	domainErrors "singgah-pos-backend/internal/domain/errors"
	"singgah-pos-backend/internal/repository"
	"singgah-pos-backend/internal/repository/postgres"

	"gorm.io/gorm"
)

type CashbonUsecase struct {
	db           *gorm.DB
	cashbonRepo  repository.BaristaCashbonRepository
	cashBookRepo repository.CashBookRepository
	periodRepo   repository.ProfitSharingPeriodRepository
}

func NewCashbonUsecase(db *gorm.DB) *CashbonUsecase {
	return &CashbonUsecase{
		db:           db,
		cashbonRepo:  postgres.NewBaristaCashbonRepository(db),
		cashBookRepo: postgres.NewCashBookRepository(db),
		periodRepo:   postgres.NewProfitSharingPeriodRepository(db),
	}
}

func cashbonRef(cashbonID uint) string {
	return fmt.Sprintf("cashbon:%d", cashbonID)
}

func syncCashbonToCashBook(cashBookRepo repository.CashBookRepository, c *entity.BaristaCashbon) {
	if c.ID == 0 || c.Amount <= 0 {
		return
	}
	ref := cashbonRef(c.ID)
	// Hapus entri lama jika ada
	_, _ = cashBookRepo.DeleteByReference(ref, c.OutletID)

	// Jika metode Cash, catat kas keluar dari laci kasir
	if c.PaymentMethod == "Cash" {
		date := c.CashbonDate
		if date.IsZero() {
			date = time.Now()
		}
		desc := fmt.Sprintf("Kasbon Barista: %s", c.BaristaName)
		if c.Reason != "" {
			desc += " (" + c.Reason + ")"
		}
		_ = cashBookRepo.Create(&entity.CashBook{
			OutletID:    c.OutletID,
			Date:        date,
			Method:      "Cash",
			Type:        "expense",
			Amount:      c.Amount,
			Description: desc,
			Reference:   ref,
		})
	}
}

func (uc *CashbonUsecase) Create(c *entity.BaristaCashbon, outletID uint) (*entity.BaristaCashbon, error) {
	if c.BaristaName == "" {
		return nil, domainErrors.NewInvalidInputError("nama barista tidak boleh kosong")
	}
	if c.Amount <= 0 {
		return nil, domainErrors.NewInvalidInputError("nominal kasbon harus lebih dari 0")
	}
	if c.CashbonDate.IsZero() {
		c.CashbonDate = time.Now()
	}
	if c.PaymentMethod == "" {
		c.PaymentMethod = "Cash"
	}
	c.OutletID = outletID
	if c.Status == "" {
		c.Status = "pending"
	}

	if err := uc.cashbonRepo.Create(c); err != nil {
		return nil, err
	}

	// Sinkronisasi otomatis ke Buku Kas jika metode Cash
	syncCashbonToCashBook(uc.cashBookRepo, c)

	return c, nil
}

func (uc *CashbonUsecase) Update(c *entity.BaristaCashbon, outletID uint) (*entity.BaristaCashbon, error) {
	if c.ID == 0 {
		return nil, domainErrors.NewInvalidInputError("ID kasbon tidak valid")
	}
	existing, err := uc.cashbonRepo.FindByID(c.ID, outletID)
	if err != nil {
		return nil, domainErrors.NewNotFoundError("data kasbon")
	}

	// Jika kasbon sudah terpotong pada periode yang sudah final, tidak boleh diedit
	if existing.Status == "settled" {
		return nil, domainErrors.NewInvalidInputError("kasbon yang sudah lunas (finalized) tidak dapat diedit")
	}

	if c.BaristaName != "" {
		existing.BaristaName = c.BaristaName
	}
	if c.Amount > 0 {
		existing.Amount = c.Amount
	}
	if !c.CashbonDate.IsZero() {
		existing.CashbonDate = c.CashbonDate
	}
	if c.PaymentMethod != "" {
		existing.PaymentMethod = c.PaymentMethod
	}
	existing.Reason = c.Reason
	if c.PersonID > 0 {
		existing.PersonID = c.PersonID
	}

	if err := uc.cashbonRepo.Update(existing); err != nil {
		return nil, err
	}

	syncCashbonToCashBook(uc.cashBookRepo, existing)
	return existing, nil
}

func (uc *CashbonUsecase) Delete(id uint, outletID uint) error {
	existing, err := uc.cashbonRepo.FindByID(id, outletID)
	if err != nil {
		return domainErrors.NewNotFoundError("data kasbon")
	}
	if existing.Status == "settled" {
		return domainErrors.NewInvalidInputError("kasbon yang sudah lunas (finalized) tidak dapat dihapus")
	}

	if err := uc.cashbonRepo.Delete(id, outletID); err != nil {
		return err
	}

	// Hapus entri dari buku kas
	ref := cashbonRef(id)
	_, _ = uc.cashBookRepo.DeleteByReference(ref, outletID)
	return nil
}

func (uc *CashbonUsecase) GetByID(id uint, outletID uint) (*entity.BaristaCashbon, error) {
	return uc.cashbonRepo.FindByID(id, outletID)
}

func (uc *CashbonUsecase) GetByOutlet(outletID uint, status string) ([]entity.BaristaCashbon, error) {
	return uc.cashbonRepo.FindByOutlet(outletID, status)
}

func (uc *CashbonUsecase) GetByPeriod(periodID uint, outletID uint) ([]entity.BaristaCashbon, error) {
	return uc.cashbonRepo.FindByPeriodID(periodID, outletID)
}
