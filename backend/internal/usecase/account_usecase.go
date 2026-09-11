package usecase

import (
	"fmt"

	"singgah-pos-backend/internal/domain/entity"
	domainErrors "singgah-pos-backend/internal/domain/errors"
	"singgah-pos-backend/internal/repository"
	"singgah-pos-backend/internal/repository/postgres"

	"gorm.io/gorm"
)

// AccountUsecase manages Chart of Accounts CRUD
type AccountUsecase struct {
	db          *gorm.DB
	accountRepo repository.AccountRepository
}

func NewAccountUsecase(db *gorm.DB) *AccountUsecase {
	return &AccountUsecase{
		db:          db,
		accountRepo: postgres.NewAccountRepository(db),
	}
}

// GetAll fetches all accounts for an outlet
func (uc *AccountUsecase) GetAll(outletID ...uint) ([]entity.AccountResponse, error) {
	accounts, err := uc.accountRepo.FindAll(outletID...)
	if err != nil {
		return nil, err
	}
	resp := make([]entity.AccountResponse, len(accounts))
	for i, a := range accounts {
		resp[i] = a.ToResponse()
	}
	return resp, nil
}

// GetByID fetches a single account by ID
func (uc *AccountUsecase) GetByID(id uint) (*entity.AccountResponse, error) {
	account, err := uc.accountRepo.FindByID(id)
	if err != nil {
		return nil, domainErrors.NewNotFoundError("account not found")
	}
	resp := account.ToResponse()
	return &resp, nil
}

// Create validates code uniqueness and creates a new account
func (uc *AccountUsecase) Create(account *entity.Account, outletID ...uint) (*entity.AccountResponse, error) {
	if len(outletID) > 0 {
		account.OutletID = outletID[0]
	}

	// Validate code uniqueness per outlet
	count, err := uc.accountRepo.CountByCode(account.Code, account.OutletID)
	if err != nil {
		return nil, fmt.Errorf("failed to validate account code: %w", err)
	}
	if count > 0 {
		return nil, domainErrors.NewInvalidInputError(fmt.Sprintf("account code '%s' already exists", account.Code))
	}

	if err := uc.accountRepo.Create(account); err != nil {
		return nil, err
	}
	resp := account.ToResponse()
	return &resp, nil
}

// Update modifies an existing account
func (uc *AccountUsecase) Update(id uint, account *entity.Account) (*entity.AccountResponse, error) {
	existing, err := uc.accountRepo.FindByID(id)
	if err != nil {
		return nil, domainErrors.NewNotFoundError("account not found")
	}

	existing.Name = account.Name
	existing.Type = account.Type
	existing.ParentID = account.ParentID
	existing.IsActive = account.IsActive
	existing.Description = account.Description

	if err := uc.accountRepo.Update(existing); err != nil {
		return nil, err
	}
	resp := existing.ToResponse()
	return &resp, nil
}

// Delete removes an account
func (uc *AccountUsecase) Delete(id uint) error {
	if _, err := uc.accountRepo.FindByID(id); err != nil {
		return domainErrors.NewNotFoundError("account not found")
	}
	return uc.accountRepo.Delete(id)
}

// SeedDefaultAccounts creates 17 PSAK default accounts for an outlet
func (uc *AccountUsecase) SeedDefaultAccounts(outletID uint) error {
	defaults := []entity.Account{
		{Code: "1101", Name: "Kas", Type: "asset", IsActive: true, OutletID: outletID},
		{Code: "1102", Name: "Piutang Usaha", Type: "asset", IsActive: true, OutletID: outletID},
		{Code: "1103", Name: "Persediaan", Type: "asset", IsActive: true, OutletID: outletID},
		{Code: "1201", Name: "Peralatan", Type: "asset", IsActive: true, OutletID: outletID},
		{Code: "1202", Name: "Akumulasi Depresiasi", Type: "asset", IsActive: true, OutletID: outletID},
		{Code: "2101", Name: "Utang Usaha", Type: "liability", IsActive: true, OutletID: outletID},
		{Code: "2102", Name: "Utang Pajak (PPN)", Type: "liability", IsActive: true, OutletID: outletID},
		{Code: "3101", Name: "Modal Usaha", Type: "equity", IsActive: true, OutletID: outletID},
		{Code: "3102", Name: "Laba Ditahan", Type: "equity", IsActive: true, OutletID: outletID},
		{Code: "4101", Name: "Pendapatan Penjualan", Type: "revenue", IsActive: true, OutletID: outletID},
		{Code: "4102", Name: "Pendapatan Service", Type: "revenue", IsActive: true, OutletID: outletID},
		{Code: "5101", Name: "HPP / Beban Pokok", Type: "expense", IsActive: true, OutletID: outletID},
		{Code: "5201", Name: "Beban Operasional", Type: "expense", IsActive: true, OutletID: outletID},
		{Code: "5202", Name: "Beban Gaji", Type: "expense", IsActive: true, OutletID: outletID},
		{Code: "5203", Name: "Beban Sewa", Type: "expense", IsActive: true, OutletID: outletID},
		{Code: "5204", Name: "Beban Listrik & Air", Type: "expense", IsActive: true, OutletID: outletID},
		{Code: "5205", Name: "Beban Depresiasi", Type: "expense", IsActive: true, OutletID: outletID},
	}

	for _, a := range defaults {
		// Skip if code already exists for this outlet
		count, err := uc.accountRepo.CountByCode(a.Code, outletID)
		if err != nil {
			return fmt.Errorf("failed to check code %s: %w", a.Code, err)
		}
		if count > 0 {
			continue
		}
		if err := uc.accountRepo.Create(&a); err != nil {
			return fmt.Errorf("failed to seed account %s: %w", a.Code, err)
		}
	}
	return nil
}
