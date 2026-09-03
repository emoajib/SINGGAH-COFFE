package usecase

import (
	"fmt"
	"strconv"
	"time"

	"singgah-pos-backend/internal/domain/entity"
	domainErrors "singgah-pos-backend/internal/domain/errors"
	"singgah-pos-backend/internal/repository"
	"singgah-pos-backend/internal/repository/postgres"

	"gorm.io/gorm"
)

type CashRegisterUsecase struct {
	db              *gorm.DB
	cashRegisterRepo repository.CashRegisterRepository
	userRepo         repository.UserRepository
	outletRepo       repository.OutletRepository
	settingRepo      repository.SettingRepository
}

func NewCashRegisterUsecase(db *gorm.DB) *CashRegisterUsecase {
	return &CashRegisterUsecase{
		db:              db,
		cashRegisterRepo: postgres.NewCashRegisterRepository(db),
		userRepo:         postgres.NewUserRepository(db),
		outletRepo:       postgres.NewOutletRepository(db),
		settingRepo:      postgres.NewSettingRepository(db),
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

	// Vetted by AI - Manual Review Required by Senior Engineer/Manager
	// Sinkronisasi otomatis ke Buku Kas sebagai pemasukan modal kas awal laci kasir
	if req.OpeningAmount > 0 {
		cbRepo := postgres.NewCashBookRepository(uc.db)
		_ = cbRepo.Create(&entity.CashBook{
			OutletID:    outletID,
			Date:        now,
			Method:      "Cash",
			Type:        "income",
			Amount:      req.OpeningAmount,
			Description: fmt.Sprintf("Modal Awal Kasir (%s)", user.Name),
			Reference:   fmt.Sprintf("cash_register_open:%d", cashRegister.ID),
			CreatedBy:   userID,
		})
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

func (uc *CashRegisterUsecase) CloseCashRegister(userID uint, closingAmount float64) (*entity.CashRegister, error) {
	reg, err := uc.cashRegisterRepo.FindOpenByUserID(userID)
	if err != nil {
		return nil, err
	}

	cashSales, err := uc.cashRegisterRepo.SumCashSalesForShift(reg.CashierName, reg.OpenedAt, time.Now())
	if err != nil {
		return nil, err
	}

	expectedCash := reg.OpeningAmount + cashSales
	variance := closingAmount - expectedCash

	if err := uc.cashRegisterRepo.Close(userID, closingAmount, expectedCash, variance); err != nil {
		return nil, err
	}

	now := time.Now()
	reg.ClosingAmount = &closingAmount
	reg.ExpectedCash = expectedCash
	reg.Variance = variance
	reg.Status = "closed"
	reg.ClosedAt = &now
	if err := NewCashBookUsecase(uc.db).EnsureRegisterClose(reg, reg.OutletID); err != nil {
		return nil, err
	}
	return reg, nil
}

func (uc *CashRegisterUsecase) GetSuggestedOpening(userID uint, outletID uint) (float64, string, error) {
	latest, err := uc.cashRegisterRepo.FindLatestClosed(userID, outletID)
	if err == nil && latest != nil && latest.ClosingAmount != nil {
		return *latest.ClosingAmount, "carry_over", nil
	}

	setting, err := uc.settingRepo.FindByKey("default_opening_float")
	if err == nil && setting != nil && setting.Value != "" {
		val, parseErr := strconv.ParseFloat(setting.Value, 64)
		if parseErr == nil {
			return val, "setting_default", nil
		}
	}

	return 0, "none", nil
}