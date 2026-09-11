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

// JournalUsecase manages journal entries and generates standard PSAK reports
type JournalUsecase struct {
	db              *gorm.DB
	journalRepo     repository.JournalRepository
	journalItemRepo repository.JournalItemRepository
	accountRepo     repository.AccountRepository
	outboxRepo      repository.OutboxRepository
}

func NewJournalUsecase(db *gorm.DB) *JournalUsecase {
	return &JournalUsecase{
		db:              db,
		journalRepo:     postgres.NewJournalRepository(db),
		journalItemRepo: postgres.NewJournalItemRepository(db),
		accountRepo:     postgres.NewAccountRepository(db),
		outboxRepo:      postgres.NewOutboxRepository(db),
	}
}

func (uc *JournalUsecase) GetAll(limit, offset int, outletID ...uint) ([]entity.JournalEntryResponse, error) {
	entries, err := uc.journalRepo.FindAll(limit, offset, outletID...)
	if err != nil {
		return nil, err
	}
	resp := make([]entity.JournalEntryResponse, len(entries))
	for i, e := range entries {
		resp[i] = e.ToResponse()
	}
	return resp, nil
}

func (uc *JournalUsecase) GetAllFiltered(start, end, status, sourceType string, limit, offset int, outletID ...uint) ([]entity.JournalEntryResponse, error) {
	entries, err := uc.journalRepo.FindAllFiltered(start, end, status, sourceType, limit, offset, outletID...)
	if err != nil {
		return nil, err
	}
	resp := make([]entity.JournalEntryResponse, len(entries))
	for i, e := range entries {
		resp[i] = e.ToResponse()
	}
	return resp, nil
}

func (uc *JournalUsecase) GetByID(id uint) (*entity.JournalEntryResponse, error) {
	entry, err := uc.journalRepo.FindByIDWithItems(id)
	if err != nil {
		return nil, domainErrors.NewNotFoundError("journal entry")
	}
	resp := entry.ToResponse()
	return &resp, nil
}

// PostEntry validates debit==credit and status==draft, then posts the entry
func (uc *JournalUsecase) PostEntry(id uint) error {
	entry, err := uc.journalRepo.FindByIDWithItems(id)
	if err != nil {
		return domainErrors.NewNotFoundError("journal entry")
	}
	if entry.Status != "draft" {
		return domainErrors.NewInvalidInputError("journal entry must be in draft status to post")
	}
	// Validate double-entry: total debit must equal total credit
	var totalDebit, totalCredit int64
	for _, item := range entry.Items {
		totalDebit += item.Debit
		totalCredit += item.Credit
	}
	if totalDebit != totalCredit {
		return domainErrors.NewInvalidInputError("total debit must equal total credit")
	}
	return uc.journalRepo.UpdateStatus(id, "posted")
}

// VoidEntry changes status from posted/draft to void
func (uc *JournalUsecase) VoidEntry(id uint) error {
	entry, err := uc.journalRepo.FindByID(id)
	if err != nil {
		return domainErrors.NewNotFoundError("journal entry")
	}
	if entry.Status != "posted" && entry.Status != "draft" {
		return domainErrors.NewInvalidInputError("journal entry must be posted or draft to void")
	}
	return uc.journalRepo.UpdateStatus(id, "void")
}

// CreateManualEntry creates a journal entry with items in a single transaction
// Validates debit==credit and all account codes exist
func (uc *JournalUsecase) CreateManualEntry(entry *entity.JournalEntry, items []entity.JournalEntryItem, outletID, createdBy uint) (*entity.JournalEntryResponse, error) {
	if len(items) == 0 {
		return nil, domainErrors.NewInvalidInputError("journal entry must have at least one item")
	}
	// Validate double-entry: total debit must equal total credit
	var totalDebit, totalCredit int64
	for _, item := range items {
		totalDebit += item.Debit
		totalCredit += item.Credit
	}
	if totalDebit != totalCredit {
		return nil, domainErrors.NewInvalidInputError("total debit must equal total credit")
	}
	// Validate all account codes exist
	for _, item := range items {
		if item.AccountID == 0 {
			return nil, domainErrors.NewInvalidInputError(fmt.Sprintf("account ID is required for item with code %s", item.AccountCode))
		}
		if _, err := uc.accountRepo.FindByID(item.AccountID); err != nil {
			return nil, domainErrors.NewInvalidInputError(fmt.Sprintf("account with ID %d not found", item.AccountID))
		}
	}
	// Auto-generate entry number
	entryNumber, err := uc.journalRepo.GetNextEntryNumber(outletID)
	if err != nil {
		return nil, fmt.Errorf("failed to generate entry number: %w", err)
	}
	entry.EntryNumber = entryNumber
	entry.OutletID = outletID
	entry.CreatedBy = createdBy
	entry.Status = "draft"
	if entry.Date.IsZero() {
		entry.Date = time.Now()
	}
	// Set outletID on items
	for i := range items {
		items[i].OutletID = outletID
	}
	// Create in single transaction
	if err := uc.journalRepo.Create(entry, items); err != nil {
		return nil, err
	}
	// Reload with items
	created, err := uc.journalRepo.FindByIDWithItems(entry.ID)
	if err != nil {
		return nil, err
	}
	resp := created.ToResponse()
	return &resp, nil
}

// GetTrialBalance sums all posted entries grouped by account
func (uc *JournalUsecase) GetTrialBalance(start, end string, outletID ...uint) ([]entity.TrialBalanceRow, error) {
	return uc.journalItemRepo.GetTrialBalance(start, end, outletID...)
}

// GetBalanceSheet returns Assets, Liabilities, and Equity as of a date
func (uc *JournalUsecase) GetBalanceSheet(asOf string, outletID ...uint) ([]entity.BalanceSheetItem, error) {
	// Get all posted entries up to asOf date
	rows, err := uc.journalItemRepo.GetTrialBalance("", asOf, outletID...)
	if err != nil {
		return nil, err
	}
	var items []entity.BalanceSheetItem
	for _, row := range rows {
		balance := row.Debit - row.Credit
		if balance == 0 {
			continue
		}
		var amount int64
		var level int
		switch row.AccountType {
		case "asset":
			// Assets: debit balance is positive
			amount = balance
			if balance < 0 {
				amount = -balance
			}
			level = 1
		case "liability", "equity":
			// Liabilities & Equity: credit balance is positive
			amount = -balance
			if balance < 0 {
				amount = balance
			}
			level = 2
		default:
			continue
		}
		items = append(items, entity.BalanceSheetItem{
			AccountCode: row.AccountCode,
			AccountName: row.AccountName,
			Amount:      amount,
			Level:       level,
		})
	}
	return items, nil
}

// GetIncomeStatement returns Revenue - Expenses = Net Income
func (uc *JournalUsecase) GetIncomeStatement(start, end string, outletID ...uint) ([]entity.IncomeStatementItem, error) {
	rows, err := uc.journalItemRepo.GetTrialBalance(start, end, outletID...)
	if err != nil {
		return nil, err
	}
	// Group by revenue and expense accounts
	var revenueItems []entity.IncomeStatementLine
	var expenseItems []entity.IncomeStatementLine
	var revenueTotal, expenseTotal int64
	for _, row := range rows {
		balance := row.Debit - row.Credit
		if balance == 0 {
			continue
		}
		switch row.AccountType {
		case "revenue":
			// Revenue: credit balance is positive income
			amount := -balance
			if balance < 0 {
				amount = balance
			}
			revenueItems = append(revenueItems, entity.IncomeStatementLine{
				AccountCode: row.AccountCode,
				AccountName: row.AccountName,
				Amount:      amount,
			})
			revenueTotal += amount
		case "expense":
			// Expense: debit balance is positive cost
			amount := balance
			if balance < 0 {
				amount = -balance
			}
			expenseItems = append(expenseItems, entity.IncomeStatementLine{
				AccountCode: row.AccountCode,
				AccountName: row.AccountName,
				Amount:      amount,
			})
			expenseTotal += amount
		}
	}
	var result []entity.IncomeStatementItem
	if len(revenueItems) > 0 {
		result = append(result, entity.IncomeStatementItem{
			Category: "Revenue",
			Items:    revenueItems,
			Total:    revenueTotal,
		})
	}
	if len(expenseItems) > 0 {
		result = append(result, entity.IncomeStatementItem{
			Category: "Expenses",
			Items:    expenseItems,
			Total:    expenseTotal,
		})
	}
	return result, nil
}

// GetCashFlow returns cash flow statement using indirect method
func (uc *JournalUsecase) GetCashFlow(start, end string, outletID ...uint) ([]entity.CashFlowItem, error) {
	// Get all posted entries in period
	rows, err := uc.journalItemRepo.GetTrialBalance(start, end, outletID...)
	if err != nil {
		return nil, err
	}
	// Identify cash-related accounts (asset accounts with "cash" or "bank" in name)
	var cashAccounts []string
	for _, row := range rows {
		if row.AccountType == "asset" {
			code := row.AccountCode
			// Cash accounts typically start with 1101-1109
			if len(code) >= 4 && code[:4] >= "1101" && code[:4] <= "1109" {
				cashAccounts = append(cashAccounts, row.AccountCode)
			}
		}
	}
	// Build cash flow items from revenue and expense accounts
	var items []entity.CashFlowItem
	for _, row := range rows {
		balance := row.Debit - row.Credit
		if balance == 0 {
			continue
		}
		// Skip cash accounts themselves
		isCash := false
		for _, ca := range cashAccounts {
			if row.AccountCode == ca {
				isCash = true
				break
			}
		}
		if isCash {
			continue
		}
		switch row.AccountType {
		case "revenue":
			amount := -balance
			if balance < 0 {
				amount = balance
			}
			items = append(items, entity.CashFlowItem{
				Category:    "Operating",
				Description: row.AccountName,
				Amount:      amount,
			})
		case "expense":
			amount := balance
			if balance < 0 {
				amount = -balance
			}
			items = append(items, entity.CashFlowItem{
				Category:    "Operating",
				Description: row.AccountName,
				Amount:      -amount,
			})
		case "asset":
			// Asset changes (non-cash) = investing activities
			amount := balance
			if balance < 0 {
				amount = -balance
			}
			items = append(items, entity.CashFlowItem{
				Category:    "Investing",
				Description: row.AccountName,
				Amount:      amount,
			})
		case "liability", "equity":
			// Liability/equity changes = financing activities
			amount := -balance
			if balance < 0 {
				amount = balance
			}
			items = append(items, entity.CashFlowItem{
				Category:    "Financing",
				Description: row.AccountName,
				Amount:      amount,
			})
		}
	}
	return items, nil
}

// GetGeneralLedger returns ledger for a specific account
func (uc *JournalUsecase) GetGeneralLedger(accountID uint, start, end string, limit, offset int, outletID ...uint) ([]entity.GeneralLedgerRow, error) {
	// Validate account exists
	if _, err := uc.accountRepo.FindByID(accountID); err != nil {
		return nil, domainErrors.NewNotFoundError("account")
	}
	return uc.journalItemRepo.GetGeneralLedger(accountID, start, end, limit, offset, outletID...)
}
