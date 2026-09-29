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
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (uc *JournalUsecase) GetBalanceSheet(asOf string, outletID ...uint) ([]entity.BalanceSheetItem, error) {
	// Get all posted entries up to asOf date
	rows, err := uc.journalItemRepo.GetTrialBalance("", asOf, outletID...)
	if err != nil {
		return nil, err
	}
	var items []entity.BalanceSheetItem
	var totalRevenue, totalExpense int64

	for _, row := range rows {
		balance := row.Debit - row.Credit
		if balance == 0 {
			continue
		}
		var amount int64
		var level int
		switch row.AccountType {
		case "asset":
			// Assets: debit balance is normal. Saldo positif = debit > credit.
			amount = balance
			level = 1
			items = append(items, entity.BalanceSheetItem{
				AccountCode: row.AccountCode,
				AccountName: row.AccountName,
				AccountType: row.AccountType,
				Amount:      amount,
				Level:       level,
			})
		case "liability":
			// Liabilities: credit balance is normal.
			amount = -balance // Credit - Debit
			level = 2
			items = append(items, entity.BalanceSheetItem{
				AccountCode: row.AccountCode,
				AccountName: row.AccountName,
				AccountType: row.AccountType,
				Amount:      amount,
				Level:       level,
			})
		case "equity":
			// Equity: credit balance is normal.
			amount = -balance // Credit - Debit
			level = 2
			items = append(items, entity.BalanceSheetItem{
				AccountCode: row.AccountCode,
				AccountName: row.AccountName,
				AccountType: row.AccountType,
				Amount:      amount,
				Level:       level,
			})
		case "revenue":
			// Akun nominal pendapatan (kredit - debit)
			totalRevenue += (row.Credit - row.Debit)
		case "expense":
			// Akun nominal beban (debit - kredit)
			totalExpense += (row.Debit - row.Credit)
		default:
			continue
		}
	}

	// SAK EMKM / PSAK 1: Neraca wajib memperhitungkan Laba / (Rugi) Periode Berjalan pada Ekuitas
	// sehingga Persamaan Dasar Akuntansi (Aset = Liabilitas + Ekuitas) selalu seimbang (balance).
	netIncome := totalRevenue - totalExpense
	if netIncome != 0 {
		items = append(items, entity.BalanceSheetItem{
			AccountCode: "3103",
			AccountName: "Laba (Rugi) Periode Berjalan",
			AccountType: "equity",
			Amount:      netIncome,
			Level:       2,
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
			// Vetted by AI - Manual Review Required by Senior Engineer/Manager
			// Revenue: saldo normal Kredit. Nilai pendapatan bersih = Kredit - Debit.
			amount := row.Credit - row.Debit
			revenueItems = append(revenueItems, entity.IncomeStatementLine{
				AccountCode: row.AccountCode,
				AccountName: row.AccountName,
				Amount:      amount,
			})
			revenueTotal += amount
		case "expense":
			// Vetted by AI - Manual Review Required by Senior Engineer/Manager
			// Expense: saldo normal Debit. Beban bersih = Debit - Kredit.
			amount := row.Debit - row.Credit
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

// GetCashFlow returns cash flow statement
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (uc *JournalUsecase) GetCashFlow(start, end string, outletID ...uint) ([]entity.CashFlowItem, error) {
	// Get all posted entries in period
	rows, err := uc.journalItemRepo.GetTrialBalance(start, end, outletID...)
	if err != nil {
		return nil, err
	}

	var items []entity.CashFlowItem
	for _, row := range rows {
		balance := row.Debit - row.Credit
		if balance == 0 {
			continue
		}

		// Kas & Setara Kas (1101 Kas Tunai, 1104 Bank/QRIS)
		if row.AccountCode == "1101" || row.AccountCode == "1104" {
			continue
		}

		switch row.AccountType {
		case "revenue":
			// Penerimaan kas dari penjualan (Kredit - Debit)
			amount := row.Credit - row.Debit
			items = append(items, entity.CashFlowItem{
				Category:    "Operating",
				Description: row.AccountName,
				Amount:      amount,
			})
		case "expense":
			// Pengeluaran kas untuk beban (arus keluar bernilai negatif)
			amount := row.Debit - row.Credit
			items = append(items, entity.CashFlowItem{
				Category:    "Operating",
				Description: row.AccountName,
				Amount:      -amount,
			})
		case "asset":
			// Non-cash current assets (Persediaan, Piutang) masuk ke Operating (Modal Kerja)
			if row.AccountCode == "1102" || row.AccountCode == "1103" {
				amount := row.Debit - row.Credit
				items = append(items, entity.CashFlowItem{
					Category:    "Operating",
					Description: row.AccountName,
					Amount:      -amount, // Kenaikan aset lancar = arus keluar kas
				})
			} else {
				// Fixed assets (Peralatan, dsb.) = Investing
				amount := row.Debit - row.Credit
				items = append(items, entity.CashFlowItem{
					Category:    "Investing",
					Description: row.AccountName,
					Amount:      -amount, // Pembelian aset tetap = arus keluar kas
				})
			}
		case "liability":
			// Hutang lancar (Utang usaha, Utang Pajak) = Operating, Hutang Jangka Panjang = Financing
			amount := row.Credit - row.Debit
			category := "Operating"
			if row.AccountCode == "2201" {
				category = "Financing"
			}
			items = append(items, entity.CashFlowItem{
				Category:    category,
				Description: row.AccountName,
				Amount:      amount,
			})
		case "equity":
			// Modal Usaha / Laba Ditahan = Financing
			amount := row.Credit - row.Debit
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
