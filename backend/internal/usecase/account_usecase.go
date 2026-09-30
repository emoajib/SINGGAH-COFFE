package usecase

import (
	"fmt"
	"strings"

	"singgah-pos-backend/internal/delivery/request"
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
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (uc *AccountUsecase) Create(account *entity.Account, outletID ...uint) (*entity.AccountResponse, error) {
	if len(outletID) > 0 {
		account.OutletID = outletID[0]
	}

	account.Type = strings.ToLower(account.Type)
	account.IsActive = true
	if account.Level <= 0 {
		if account.IsHeader {
			account.Level = 1
		} else {
			account.Level = 3
		}
	}
	if account.NormalBalance == "" {
		if account.Type == "asset" || account.Type == "expense" {
			account.NormalBalance = "debit"
		} else {
			account.NormalBalance = "credit"
		}
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
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (uc *AccountUsecase) Update(id uint, req *request.UpdateAccountRequest) (*entity.AccountResponse, error) {
	existing, err := uc.accountRepo.FindByID(id)
	if err != nil {
		return nil, domainErrors.NewNotFoundError("account not found")
	}

	if req.Code != "" && req.Code != existing.Code {
		count, err := uc.accountRepo.CountByCode(req.Code, existing.OutletID)
		if err != nil {
			return nil, fmt.Errorf("failed to validate account code: %w", err)
		}
		if count > 0 {
			return nil, domainErrors.NewInvalidInputError(fmt.Sprintf("account code '%s' already exists", req.Code))
		}
		existing.Code = req.Code
	}

	if req.Name != "" {
		existing.Name = req.Name
	}
	if req.Type != "" {
		existing.Type = strings.ToLower(req.Type)
	}
	existing.ParentID = req.ParentID
	if req.Level != nil {
		existing.Level = *req.Level
	}
	if req.IsHeader != nil {
		existing.IsHeader = *req.IsHeader
	}
	if req.IsContra != nil {
		existing.IsContra = *req.IsContra
	}
	if req.NormalBalance != "" {
		existing.NormalBalance = strings.ToLower(req.NormalBalance)
	}
	// Crucial: Only update IsActive if explicitly provided in request!
	if req.IsActive != nil {
		existing.IsActive = *req.IsActive
	}
	existing.Description = req.Description

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

type defaultSeedAccount struct {
	Code          string
	Name          string
	Type          string
	Level         int
	IsHeader      bool
	IsContra      bool
	NormalBalance string
	ParentCode    string
}

// SeedDefaultAccounts creates standardized PSAK default hierarchical accounts for an outlet
// Returns the number of accounts newly created
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (uc *AccountUsecase) SeedDefaultAccounts(outletID uint) (int, error) {
	defaults := []defaultSeedAccount{
		// Level 1: Induk Utama
		{Code: "1000", Name: "ASET", Type: "asset", Level: 1, IsHeader: true, NormalBalance: "debit"},
		{Code: "2000", Name: "KEWAJIBAN", Type: "liability", Level: 1, IsHeader: true, NormalBalance: "credit"},
		{Code: "3000", Name: "EKUITAS", Type: "equity", Level: 1, IsHeader: true, NormalBalance: "credit"},
		{Code: "4000", Name: "PENDAPATAN", Type: "revenue", Level: 1, IsHeader: true, NormalBalance: "credit"},
		{Code: "5000", Name: "BEBAN", Type: "expense", Level: 1, IsHeader: true, NormalBalance: "debit"},

		// Level 2: Sub-Induk
		{Code: "1100", Name: "Aset Lancar", Type: "asset", Level: 2, IsHeader: true, NormalBalance: "debit", ParentCode: "1000"},
		{Code: "1200", Name: "Aset Tetap", Type: "asset", Level: 2, IsHeader: true, NormalBalance: "debit", ParentCode: "1000"},
		{Code: "2100", Name: "Kewajiban Lancar", Type: "liability", Level: 2, IsHeader: true, NormalBalance: "credit", ParentCode: "2000"},
		{Code: "2200", Name: "Kewajiban Jangka Panjang", Type: "liability", Level: 2, IsHeader: true, NormalBalance: "credit", ParentCode: "2000"},
		{Code: "5100", Name: "Harga Pokok Penjualan", Type: "expense", Level: 2, IsHeader: true, NormalBalance: "debit", ParentCode: "5000"},
		{Code: "5200", Name: "Beban Operasional", Type: "expense", Level: 2, IsHeader: true, NormalBalance: "debit", ParentCode: "5000"},
		{Code: "5300", Name: "Beban Non-Operasional & Lainnya", Type: "expense", Level: 2, IsHeader: true, NormalBalance: "debit", ParentCode: "5000"},

		// Level 3 & Posting Accounts
		{Code: "1101", Name: "Kas", Type: "asset", Level: 3, IsHeader: false, NormalBalance: "debit", ParentCode: "1100"},
		{Code: "1102", Name: "Piutang Usaha", Type: "asset", Level: 3, IsHeader: false, NormalBalance: "debit", ParentCode: "1100"},
		{Code: "1103", Name: "Persediaan", Type: "asset", Level: 3, IsHeader: false, NormalBalance: "debit", ParentCode: "1100"},
		{Code: "1104", Name: "Bank / QRIS", Type: "asset", Level: 3, IsHeader: false, NormalBalance: "debit", ParentCode: "1100"},
		{Code: "1105", Name: "PPN Masukan", Type: "asset", Level: 3, IsHeader: false, NormalBalance: "debit", ParentCode: "1100"},
		{Code: "1201", Name: "Peralatan", Type: "asset", Level: 3, IsHeader: false, NormalBalance: "debit", ParentCode: "1200"},
		{Code: "1202", Name: "Akumulasi Depresiasi", Type: "asset", Level: 3, IsHeader: false, IsContra: true, NormalBalance: "credit", ParentCode: "1200"},

		{Code: "2101", Name: "Utang Usaha", Type: "liability", Level: 3, IsHeader: false, NormalBalance: "credit", ParentCode: "2100"},
		{Code: "2102", Name: "Utang Pajak (PPN/PB1)", Type: "liability", Level: 3, IsHeader: false, NormalBalance: "credit", ParentCode: "2100"},
		{Code: "2201", Name: "Utang Jangka Panjang", Type: "liability", Level: 3, IsHeader: false, NormalBalance: "credit", ParentCode: "2200"},

		{Code: "3101", Name: "Modal Usaha", Type: "equity", Level: 2, IsHeader: false, NormalBalance: "credit", ParentCode: "3000"},
		{Code: "3102", Name: "Laba Ditahan", Type: "equity", Level: 2, IsHeader: false, NormalBalance: "credit", ParentCode: "3000"},
		{Code: "3103", Name: "Prive", Type: "equity", Level: 2, IsHeader: false, IsContra: true, NormalBalance: "debit", ParentCode: "3000"},

		{Code: "4101", Name: "Pendapatan Penjualan", Type: "revenue", Level: 2, IsHeader: false, NormalBalance: "credit", ParentCode: "4000"},
		{Code: "4102", Name: "Pendapatan Service", Type: "revenue", Level: 2, IsHeader: false, NormalBalance: "credit", ParentCode: "4000"},
		{Code: "4103", Name: "Pendapatan Lain-lain", Type: "revenue", Level: 2, IsHeader: false, NormalBalance: "credit", ParentCode: "4000"},

		{Code: "5101", Name: "HPP / Beban Pokok", Type: "expense", Level: 3, IsHeader: false, NormalBalance: "debit", ParentCode: "5100"},
		{Code: "5201", Name: "Beban Operasional", Type: "expense", Level: 3, IsHeader: false, NormalBalance: "debit", ParentCode: "5200"},
		{Code: "5202", Name: "Beban Gaji", Type: "expense", Level: 3, IsHeader: false, NormalBalance: "debit", ParentCode: "5200"},
		{Code: "5203", Name: "Beban Sewa", Type: "expense", Level: 3, IsHeader: false, NormalBalance: "debit", ParentCode: "5200"},
		{Code: "5204", Name: "Beban Listrik & Air", Type: "expense", Level: 3, IsHeader: false, NormalBalance: "debit", ParentCode: "5200"},
		{Code: "5205", Name: "Beban Depresiasi", Type: "expense", Level: 3, IsHeader: false, NormalBalance: "debit", ParentCode: "5200"},
		{Code: "5206", Name: "Beban Pemeliharaan Peralatan", Type: "expense", Level: 3, IsHeader: false, NormalBalance: "debit", ParentCode: "5200"},
		{Code: "5301", Name: "Beban Bunga", Type: "expense", Level: 3, IsHeader: false, NormalBalance: "debit", ParentCode: "5300"},
		{Code: "5302", Name: "Beban Lain-lain", Type: "expense", Level: 3, IsHeader: false, NormalBalance: "debit", ParentCode: "5300"},
	}

	var created int
	codeToID := make(map[string]uint)

	// Pre-populate existing codes map
	existingAccounts, err := uc.accountRepo.FindAll(outletID)
	if err == nil {
		for _, acc := range existingAccounts {
			codeToID[acc.Code] = acc.ID
		}
	}

	for _, d := range defaults {
		var parentID *uint
		if d.ParentCode != "" {
			if pid, ok := codeToID[d.ParentCode]; ok {
				parentID = &pid
			}
		}

		existingID, exists := codeToID[d.Code]
		if exists {
			// Backfill parent and flags for existing accounts if unlinked or outdated
			if acc, err := uc.accountRepo.FindByID(existingID); err == nil {
				changed := false
				if acc.ParentID == nil && parentID != nil {
					acc.ParentID = parentID
					changed = true
				}
				if acc.Level != d.Level {
					acc.Level = d.Level
					changed = true
				}
				if acc.IsHeader != d.IsHeader {
					acc.IsHeader = d.IsHeader
					changed = true
				}
				if acc.IsContra != d.IsContra {
					acc.IsContra = d.IsContra
					changed = true
				}
				if acc.NormalBalance != d.NormalBalance {
					acc.NormalBalance = d.NormalBalance
					changed = true
				}
				if changed {
					_ = uc.accountRepo.Update(acc)
				}
			}
			continue
		}

		newAcc := entity.Account{
			Code:          d.Code,
			Name:          d.Name,
			Type:          d.Type,
			ParentID:      parentID,
			Level:         d.Level,
			IsHeader:      d.IsHeader,
			IsContra:      d.IsContra,
			NormalBalance: d.NormalBalance,
			IsActive:      true,
			OutletID:      outletID,
		}

		if err := uc.accountRepo.Create(&newAcc); err != nil {
			return created, fmt.Errorf("failed to seed account %s: %w", d.Code, err)
		}
		codeToID[newAcc.Code] = newAcc.ID
		created++
	}

	return created, nil
}
