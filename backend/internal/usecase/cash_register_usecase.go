package usecase

import (
	"time"

	"singgah-pos-backend/internal/domain/entity"
	domainErrors "singgah-pos-backend/internal/domain/errors"
	"singgah-pos-backend/internal/repository"
	"singgah-pos-backend/internal/repository/postgres"

	"gorm.io/gorm"
)

type CashRegisterUsecase struct {
	cashRegisterRepo repository.CashRegisterRepository
	userRepo         repository.UserRepository
	outletRepo       repository.OutletRepository
}

func NewCashRegisterUsecase(db *gorm.DB) *CashRegisterUsecase {
	return &CashRegisterUsecase{
		cashRegisterRepo: postgres.NewCashRegisterRepository(db),
		userRepo:         postgres.NewUserRepository(db),
		outletRepo:       postgres.NewOutletRepository(db),
	}
}

func (uc *CashRegisterUsecase) OpenCashRegister(userID uint, outletID uint, req *entity.CashRegister) (*entity.CashRegister, error) {
	existing, err := uc.cashRegisterRepo.FindOpenByUserID(userID)
	if err == nil && existing != nil {
		return nil, domainErrors.NewInvalidInputError("cashier already has an open cash register")
	}

	user, err := uc.userRepo.FindByID(userID)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	cashRegister := &entity.CashRegister{
		UserID:        userID,
		CashierName:   user.Name,
		OutletID:      outletID,
		OpeningAmount: req.OpeningAmount,
		Notes:         req.Notes,
		OpenedAt:      now,
		Status:        "open",
	}

	if err := uc.cashRegisterRepo.Create(cashRegister); err != nil {
		return nil, err
	}
	return cashRegister, nil
}

func (uc *CashRegisterUsecase) GetCashRegisters(outletID uint, cashierName string, dateFrom string, dateTo string, status string, limit int, offset int) ([]entity.CashRegister, error) {
	return uc.cashRegisterRepo.FindAll(outletID, cashierName, dateFrom, dateTo, status, limit, offset)
}

func (uc *CashRegisterUsecase) CountOpenByOutlet(outletID uint) (int64, error) {
	return uc.cashRegisterRepo.CountOpenByOutlet(outletID)
}

func (uc *CashRegisterUsecase) GetAllOutlets() ([]entity.Outlet, error) {
	return uc.outletRepo.FindAll()
}

func (uc *CashRegisterUsecase) UpdateCashRegister(cashRegister *entity.CashRegister) (*entity.CashRegister, error) {
	if err := uc.cashRegisterRepo.Update(cashRegister); err != nil {
		return nil, err
	}
	return uc.cashRegisterRepo.FindByID(cashRegister.ID)
}

func (uc *CashRegisterUsecase) DeleteCashRegister(id uint) error {
	return uc.cashRegisterRepo.Delete(id)
}