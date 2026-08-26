package usecase

import (
	"time"

	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/repository"
	"singgah-pos-backend/internal/repository/postgres"

	"gorm.io/gorm"
)

type CashBookUsecase struct {
	cashBookRepo repository.CashBookRepository
}

func NewCashBookUsecase(db *gorm.DB) *CashBookUsecase {
	return &CashBookUsecase{
		cashBookRepo: postgres.NewCashBookRepository(db),
	}
}

func (uc *CashBookUsecase) GetAllFiltered(start, end, method, tipe string, outletID ...uint) ([]entity.CashBookResponse, error) {
	items, err := uc.cashBookRepo.FindAllRange(start, end, method, tipe, outletID...)
	if err != nil {
		return nil, err
	}
	resp := make([]entity.CashBookResponse, len(items))
	for i, c := range items {
		resp[i] = c.ToResponse()
	}
	return resp, nil
}

func (uc *CashBookUsecase) GetByID(id uint) (*entity.CashBookResponse, error) {
	c, err := uc.cashBookRepo.FindByID(id)
	if err != nil {
		return nil, err
	}
	resp := c.ToResponse()
	return &resp, nil
}

func (uc *CashBookUsecase) Create(c *entity.CashBook, outletID ...uint) (*entity.CashBookResponse, error) {
	if c.Date.IsZero() {
		c.Date = time.Now()
	}
	if len(outletID) > 0 {
		c.OutletID = outletID[0]
	}
	if err := uc.cashBookRepo.Create(c); err != nil {
		return nil, err
	}
	resp := c.ToResponse()
	return &resp, nil
}

func (uc *CashBookUsecase) Update(id uint, c *entity.CashBook) (*entity.CashBookResponse, error) {
	existing, err := uc.cashBookRepo.FindByID(id)
	if err != nil {
		return nil, err
	}
	existing.Date = c.Date
	existing.Method = c.Method
	existing.Type = c.Type
	existing.Amount = c.Amount
	existing.Description = c.Description
	existing.Reference = c.Reference
	if err := uc.cashBookRepo.Update(existing); err != nil {
		return nil, err
	}
	resp := existing.ToResponse()
	return &resp, nil
}

func (uc *CashBookUsecase) Delete(id uint) error {
	return uc.cashBookRepo.Delete(id)
}

func (uc *CashBookUsecase) GetTotalsSince(since string, outletID ...uint) (income float64, expense float64, err error) {
	return uc.cashBookRepo.GetTotalsSince(since, outletID...)
}
