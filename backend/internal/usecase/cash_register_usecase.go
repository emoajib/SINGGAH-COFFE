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
	registers, err := uc.cashRegisterRepo.FindAll(outletID, cashierName, dateFrom, dateTo, status, limit, offset)
	if err != nil {
		return nil, err
	}
	if registers == nil {
		registers = []entity.CashRegister{}
	}
	return registers, nil
}

func (uc *CashRegisterUsecase) GetAllOutlets() ([]entity.Outlet, error) {
	outlets, err := uc.outletRepo.FindAll()
	if err != nil {
		return nil, err
	}
	if outlets == nil {
		outlets = []entity.Outlet{}
	}
	return outlets, nil
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

func (uc *CashRegisterUsecase) CloseCashRegister(userID uint, closingAmount float64) error {
	return uc.cashRegisterRepo.Close(userID, closingAmount)
}