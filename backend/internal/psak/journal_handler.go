package psak

import (
	"encoding/json"
	"fmt"
	"log"
	"time"

	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/repository"
	"singgah-pos-backend/internal/repository/postgres"

	"gorm.io/gorm"
)

// JournalEventHandler implements EventHandler to process journal events.
type JournalEventHandler struct {
	db          *gorm.DB
	accountRepo repository.AccountRepository
	journalRepo repository.JournalRepository
}

// OrderEventPayload is the JSON structure for order.completed / order.voided events.
type OrderEventPayload struct {
	ID            uint              `json:"id"`
	OrderNumber   string            `json:"order_number"`
	TotalAmount   float64           `json:"total_amount"`
	TaxAmount     float64           `json:"tax_amount"`
	ServiceAmount float64           `json:"service_amount"`
	Items         []OrderEventItem  `json:"items"`
	OutletID      uint              `json:"outlet_id"`
	CashierName   string            `json:"cashier_name"`
	PaymentMethod string            `json:"payment_method"`
}

// OrderEventItem carries per-line COGS for HPP journal posting.
type OrderEventItem struct {
	ProductID uint    `json:"product_id"`
	Name      string  `json:"name"`
	Quantity  int     `json:"quantity"`
	Price     float64 `json:"price"`
	Cost      float64 `json:"cost"`
}

// ExpenseEventPayload is the JSON structure for expense.* events.
type ExpenseEventPayload struct {
	ID            uint    `json:"id"`
	Title         string  `json:"title"`
	Amount        float64 `json:"amount"`
	Category      string  `json:"category"`
	PaymentMethod string  `json:"payment_method"`
	OutletID      uint    `json:"outlet_id"`
	Date          string  `json:"date"`
}

// expenseCategoryToAccount maps expense categories to PSAK account codes.
var expenseCategoryToAccount = map[string]string{
	"Operational": "5201",
	"Marketing":   "5202",
	"Maintenance": "5203",
	"Salary":      "5204",
	"Utilities":   "5205",
}

// NewJournalEventHandler creates a handler with repos wired from db.
func NewJournalEventHandler(db *gorm.DB) *JournalEventHandler {
	return &JournalEventHandler{
		db:          db,
		accountRepo: postgres.NewAccountRepository(db),
		journalRepo: postgres.NewJournalRepository(db),
	}
}

// ProcessEvent dispatches to specific handlers based on event type.
func (h *JournalEventHandler) ProcessEvent(event *entity.EventOutbox) error {
	switch event.EventType {
	case "order.completed":
		return h.handleOrderCompleted(event)
	case "order.voided":
		return h.handleOrderVoided(event)
	case "expense.created":
		return h.handleExpenseCreated(event)
	case "expense.updated":
		return h.handleExpenseUpdated(event)
	case "expense.deleted":
		return h.handleExpenseDeleted(event)
	default:
		return fmt.Errorf("unknown event type: %s", event.EventType)
	}
}

// handleOrderCompleted creates a double-entry journal for a completed order.
//
//	DR 1101 Kas (totalAmount)            — or DR 1102 Piutang if QRIS
//	CR 4101 Pendapatan Penjualan (net)
//	CR 2102 Utang Pajak PPN (tax)
//	CR 4102 Pendapatan Service (service)
//
// If COGS items exist:
//
//	DR 5101 HPP (totalCOGS)
//	CR 1103 Persediaan (totalCOGS)
func (h *JournalEventHandler) handleOrderCompleted(event *entity.EventOutbox) error {
	var payload OrderEventPayload
	if err := json.Unmarshal(event.Payload, &payload); err != nil {
		return fmt.Errorf("unmarshal order payload: %w", err)
	}

	netRevenue := payload.TotalAmount - payload.TaxAmount - payload.ServiceAmount
	if netRevenue < 0 {
		netRevenue = 0
	}

	// Determine cash vs receivable account
	cashAccountCode := "1101" // Kas
	if payload.PaymentMethod == "QRIS" || payload.PaymentMethod == "Transfer" {
		cashAccountCode = "1102" // Piutang Usaha
	}

	// Look up all needed accounts
	accounts, err := h.lookupAccounts(payload.OutletID,
		cashAccountCode, "4101", "2102", "4102", "5101", "1103")
	if err != nil {
		return fmt.Errorf("lookup accounts: %w", err)
	}

	now := time.Now()
	sourceID := payload.ID
	entryNumber, err := h.journalRepo.GetNextEntryNumber(payload.OutletID)
	if err != nil {
		return fmt.Errorf("get entry number: %w", err)
	}

	// Build journal items
	var items []entity.JournalEntryItem
	addItem := func(code string, debit, credit int64, desc string) {
		a := accounts[code]
		items = append(items, entity.JournalEntryItem{
			AccountID:   a.ID,
			AccountCode: a.Code,
			AccountName: a.Name,
			Debit:       debit,
			Credit:      credit,
			Description: desc,
			OutletID:    payload.OutletID,
		})
	}

	// Revenue entry
	addItem(cashAccountCode, toIDR(payload.TotalAmount), 0,
		fmt.Sprintf("Order #%s - %s", payload.OrderNumber, payload.CashierName))
	addItem("4101", 0, toIDR(netRevenue),
		fmt.Sprintf("Pendapatan Penjualan #%s", payload.OrderNumber))
	if payload.TaxAmount > 0 {
		addItem("2102", 0, toIDR(payload.TaxAmount),
			fmt.Sprintf("PPN Order #%s", payload.OrderNumber))
	}
	if payload.ServiceAmount > 0 {
		addItem("4102", 0, toIDR(payload.ServiceAmount),
			fmt.Sprintf("Service Charge #%s", payload.OrderNumber))
	}

	// COGS entry
	var totalCOGS float64
	for _, item := range payload.Items {
		totalCOGS += item.Cost * float64(item.Quantity)
	}
	if totalCOGS > 0 {
		addItem("5101", toIDR(totalCOGS), 0,
			fmt.Sprintf("HPP Order #%s", payload.OrderNumber))
		addItem("1103", 0, toIDR(totalCOGS),
			fmt.Sprintf("Persediaan Order #%s", payload.OrderNumber))
	}

	entry := &entity.JournalEntry{
		EntryNumber: entryNumber,
		Date:        now,
		Description: fmt.Sprintf("Order #%s - %s", payload.OrderNumber, payload.CashierName),
		SourceType:  "order",
		SourceID:    &sourceID,
		Status:      "posted",
		OutletID:    payload.OutletID,
	}

	return h.journalRepo.Create(entry, items)
}

// handleOrderVoided creates a reversing journal entry for a voided order.
// It finds the original posted entry by source_type="order" and source_id,
// then creates a new entry with DR↔CR swapped.
func (h *JournalEventHandler) handleOrderVoided(event *entity.EventOutbox) error {
	var payload OrderEventPayload
	if err := json.Unmarshal(event.Payload, &payload); err != nil {
		return fmt.Errorf("unmarshal order payload: %w", err)
	}

	// Find the original journal entry
	originalEntry, err := h.findOriginalEntry("order", payload.ID)
	if err != nil {
		return fmt.Errorf("find original entry for order %d: %w", payload.ID, err)
	}
	if originalEntry == nil {
		log.Printf("[JournalHandler] WARN: no posted entry found for order %d, skipping void", payload.ID)
		return nil
	}

	// Load original items
	originalItems, err := h.journalRepo.FindItemsByEntryID(originalEntry.ID)
	if err != nil {
		return fmt.Errorf("find original items: %w", err)
	}

	// Build reversing items (swap DR↔CR)
	reverseItems := make([]entity.JournalEntryItem, len(originalItems))
	for i, item := range originalItems {
		reverseItems[i] = entity.JournalEntryItem{
			AccountID:   item.AccountID,
			AccountCode: item.AccountCode,
			AccountName: item.AccountName,
			Debit:       item.Credit, // swapped
			Credit:      item.Debit,  // swapped
			Description: fmt.Sprintf("REVERSAL: %s", item.Description),
			OutletID:    item.OutletID,
		}
	}

	now := time.Now()
	sourceID := payload.ID
	entryNumber, err := h.journalRepo.GetNextEntryNumber(payload.OutletID)
	if err != nil {
		return fmt.Errorf("get entry number: %w", err)
	}

	entry := &entity.JournalEntry{
		EntryNumber: entryNumber,
		Date:        now,
		Description: fmt.Sprintf("VOID Order #%s", payload.OrderNumber),
		SourceType:  "order",
		SourceID:    &sourceID,
		Status:      "posted",
		OutletID:    payload.OutletID,
	}

	return h.journalRepo.Create(entry, reverseItems)
}

// handleExpenseCreated creates a journal entry for a new expense.
//
//	DR 5201-5205 Beban (amount, mapped by category)
//	CR 1101 Kas (amount) — or CR 1102 if non-cash
func (h *JournalEventHandler) handleExpenseCreated(event *entity.EventOutbox) error {
	var payload ExpenseEventPayload
	if err := json.Unmarshal(event.Payload, &payload); err != nil {
		return fmt.Errorf("unmarshal expense payload: %w", err)
	}

	// Determine expense account code from category
	expenseCode, ok := expenseCategoryToAccount[payload.Category]
	if !ok {
		expenseCode = "5201" // default to Operational
	}

	// Determine credit account (cash vs non-cash)
	creditCode := "1101" // Kas
	if payload.PaymentMethod != "" && payload.PaymentMethod != "Cash" {
		creditCode = "1102" // Piutang / Bank
	}

	accounts, err := h.lookupAccounts(payload.OutletID, expenseCode, creditCode)
	if err != nil {
		return fmt.Errorf("lookup accounts: %w", err)
	}

	// Parse date
	expenseDate := time.Now()
	if payload.Date != "" {
		if t, err := time.Parse("2006-01-02", payload.Date); err == nil {
			expenseDate = t
		}
	}

	sourceID := payload.ID
	entryNumber, err := h.journalRepo.GetNextEntryNumber(payload.OutletID)
	if err != nil {
		return fmt.Errorf("get entry number: %w", err)
	}

	expenseAcc := accounts[expenseCode]
	creditAcc := accounts[creditCode]

	items := []entity.JournalEntryItem{
		{
			AccountID:   expenseAcc.ID,
			AccountCode: expenseAcc.Code,
			AccountName: expenseAcc.Name,
			Debit:       toIDR(payload.Amount),
			Credit:      0,
			Description: fmt.Sprintf("Beban %s: %s", payload.Category, payload.Title),
			OutletID:    payload.OutletID,
		},
		{
			AccountID:   creditAcc.ID,
			AccountCode: creditAcc.Code,
			AccountName: creditAcc.Name,
			Debit:       0,
			Credit:      toIDR(payload.Amount),
			Description: fmt.Sprintf("Pembayaran %s", payload.Title),
			OutletID:    payload.OutletID,
		},
	}

	entry := &entity.JournalEntry{
		EntryNumber: entryNumber,
		Date:        expenseDate,
		Description: fmt.Sprintf("Beban %s: %s", payload.Category, payload.Title),
		SourceType:  "expense",
		SourceID:    &sourceID,
		Status:      "posted",
		OutletID:    payload.OutletID,
	}

	return h.journalRepo.Create(entry, items)
}

// handleExpenseUpdated voids the original expense journal and creates a new one.
func (h *JournalEventHandler) handleExpenseUpdated(event *entity.EventOutbox) error {
	// Void the original entry
	var payload ExpenseEventPayload
	if err := json.Unmarshal(event.Payload, &payload); err != nil {
		return fmt.Errorf("unmarshal expense payload: %w", err)
	}

	if err := h.voidOriginalEntry("expense", payload.ID, fmt.Sprintf("VOID (update) Expense: %s", payload.Title)); err != nil {
		return fmt.Errorf("void original expense entry: %w", err)
	}

	// Create new entry with updated data
	return h.handleExpenseCreated(event)
}

// handleExpenseDeleted voids the original expense journal entry.
func (h *JournalEventHandler) handleExpenseDeleted(event *entity.EventOutbox) error {
	var payload ExpenseEventPayload
	if err := json.Unmarshal(event.Payload, &payload); err != nil {
		return fmt.Errorf("unmarshal expense payload: %w", err)
	}

	return h.voidOriginalEntry("expense", payload.ID, fmt.Sprintf("VOID (delete) Expense: %s", payload.Title))
}

// lookupAccounts fetches multiple accounts by code, returning a map keyed by code.
func (h *JournalEventHandler) lookupAccounts(outletID uint, codes ...string) (map[string]*entity.Account, error) {
	result := make(map[string]*entity.Account, len(codes))
	for _, code := range codes {
		if _, exists := result[code]; exists {
			continue
		}
		acc, err := h.accountRepo.FindByCode(code, outletID)
		if err != nil {
			return nil, fmt.Errorf("account code %s: %w", code, err)
		}
		result[code] = acc
	}
	return result, nil
}

// findOriginalEntry finds a posted journal entry by source type and ID.
func (h *JournalEventHandler) findOriginalEntry(sourceType string, sourceID uint) (*entity.JournalEntry, error) {
	entries, err := h.journalRepo.FindAllFiltered("", "", "posted", sourceType, 100, 0, 0)
	if err != nil {
		return nil, err
	}
	for i := range entries {
		if entries[i].SourceID != nil && *entries[i].SourceID == sourceID {
			return &entries[i], nil
		}
	}
	return nil, nil
}

// voidOriginalEntry finds and voids a journal entry by source type and ID.
func (h *JournalEventHandler) voidOriginalEntry(sourceType string, sourceID uint, reason string) error {
	original, err := h.findOriginalEntry(sourceType, sourceID)
	if err != nil {
		return fmt.Errorf("find original entry: %w", err)
	}
	if original == nil {
		log.Printf("[JournalHandler] WARN: no posted entry found for %s/%d, skipping void", sourceType, sourceID)
		return nil
	}

	// Load original items to create reversal
	originalItems, err := h.journalRepo.FindItemsByEntryID(original.ID)
	if err != nil {
		return fmt.Errorf("find original items: %w", err)
	}

	reverseItems := make([]entity.JournalEntryItem, len(originalItems))
	for i, item := range originalItems {
		reverseItems[i] = entity.JournalEntryItem{
			AccountID:   item.AccountID,
			AccountCode: item.AccountCode,
			AccountName: item.AccountName,
			Debit:       item.Credit, // swapped
			Credit:      item.Debit,  // swapped
			Description: fmt.Sprintf("REVERSAL: %s", item.Description),
			OutletID:    item.OutletID,
		}
	}

	entryNumber, err := h.journalRepo.GetNextEntryNumber(original.OutletID)
	if err != nil {
		return fmt.Errorf("get entry number: %w", err)
	}

	reversal := &entity.JournalEntry{
		EntryNumber: entryNumber,
		Date:        time.Now(),
		Description: reason,
		SourceType:  sourceType,
		SourceID:    &sourceID,
		Status:      "posted",
		OutletID:    original.OutletID,
	}

	return h.journalRepo.Create(reversal, reverseItems)
}

// toIDR converts float64 amount to int64 (Rupiah has no fractional unit).
func toIDR(amount float64) int64 {
	return int64(amount)
}
