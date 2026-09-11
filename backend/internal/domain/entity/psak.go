package entity

import "time"

type Account struct {
	ID          uint
	Code        string
	Name        string
	Type        string
	ParentID    *uint
	IsActive    bool
	Description string
	OutletID    uint
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type AccountResponse struct {
	ID          uint      `json:"id"`
	Code        string    `json:"code"`
	Name        string    `json:"name"`
	Type        string    `json:"type"`
	ParentID    *uint     `json:"parent_id"`
	IsActive    bool      `json:"is_active"`
	Description string    `json:"description"`
	OutletID    uint      `json:"outlet_id"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (a *Account) ToResponse() AccountResponse {
	return AccountResponse{
		ID:          a.ID,
		Code:        a.Code,
		Name:        a.Name,
		Type:        a.Type,
		ParentID:    a.ParentID,
		IsActive:    a.IsActive,
		Description: a.Description,
		OutletID:    a.OutletID,
		CreatedAt:   a.CreatedAt,
		UpdatedAt:   a.UpdatedAt,
	}
}

type JournalEntry struct {
	ID          uint
	EntryNumber string
	Date        time.Time
	Description string
	SourceType  string
	SourceID    *uint
	Status      string
	OutletID    uint
	CreatedBy   uint
	Items       []JournalEntryItem
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type JournalEntryResponse struct {
	ID          uint                       `json:"id"`
	EntryNumber string                     `json:"entry_number"`
	Date        time.Time                  `json:"date"`
	Description string                     `json:"description"`
	SourceType  string                     `json:"source_type"`
	SourceID    *uint                      `json:"source_id"`
	Status      string                     `json:"status"`
	OutletID    uint                       `json:"outlet_id"`
	CreatedBy   uint                       `json:"created_by"`
	Items       []JournalEntryItemResponse `json:"items"`
	CreatedAt   time.Time                  `json:"created_at"`
	UpdatedAt   time.Time                  `json:"updated_at"`
}

func (je *JournalEntry) ToResponse() JournalEntryResponse {
	items := make([]JournalEntryItemResponse, len(je.Items))
	for i, item := range je.Items {
		items[i] = JournalEntryItemResponse{
			ID:              item.ID,
			JournalEntryID:  item.JournalEntryID,
			AccountID:       item.AccountID,
			AccountCode:     item.AccountCode,
			AccountName:     item.AccountName,
			Debit:           item.Debit,
			Credit:          item.Credit,
			Description:     item.Description,
			CreatedAt:       item.CreatedAt,
		}
	}
	return JournalEntryResponse{
		ID:          je.ID,
		EntryNumber: je.EntryNumber,
		Date:        je.Date,
		Description: je.Description,
		SourceType:  je.SourceType,
		SourceID:    je.SourceID,
		Status:      je.Status,
		OutletID:    je.OutletID,
		CreatedBy:   je.CreatedBy,
		Items:       items,
		CreatedAt:   je.CreatedAt,
		UpdatedAt:   je.UpdatedAt,
	}
}

type JournalEntryItem struct {
	ID              uint
	JournalEntryID  uint
	AccountID       uint
	AccountCode     string
	AccountName     string
	Debit           int64
	Credit          int64
	Description     string
	OutletID        uint
	CreatedAt       time.Time
}

type JournalEntryItemResponse struct {
	ID              uint      `json:"id"`
	JournalEntryID  uint      `json:"journal_entry_id"`
	AccountID       uint      `json:"account_id"`
	AccountCode     string    `json:"account_code"`
	AccountName     string    `json:"account_name"`
	Debit           int64     `json:"debit"`
	Credit          int64     `json:"credit"`
	Description     string    `json:"description"`
	CreatedAt       time.Time `json:"created_at"`
}

func (ji *JournalEntryItem) ToResponse() JournalEntryItemResponse {
	return JournalEntryItemResponse{
		ID:             ji.ID,
		JournalEntryID: ji.JournalEntryID,
		AccountID:      ji.AccountID,
		AccountCode:    ji.AccountCode,
		AccountName:    ji.AccountName,
		Debit:          ji.Debit,
		Credit:         ji.Credit,
		Description:    ji.Description,
		CreatedAt:      ji.CreatedAt,
	}
}

type EventOutbox struct {
	ID             uint
	EventType      string
	ReferenceType  string
	ReferenceID    uint
	Payload        []byte
	Status         string
	RetryCount     int
	MaxRetries     int
	LastError      string
	ProcessedAt    *time.Time
	SequenceNumber int64
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

type EventOutboxResponse struct {
	ID             uint       `json:"id"`
	EventType      string     `json:"event_type"`
	ReferenceType  string     `json:"reference_type"`
	ReferenceID    uint       `json:"reference_id"`
	Payload        []byte     `json:"payload"`
	Status         string     `json:"status"`
	RetryCount     int        `json:"retry_count"`
	LastError      string     `json:"last_error"`
	ProcessedAt    *time.Time `json:"processed_at"`
	SequenceNumber int64      `json:"sequence_number"`
	CreatedAt      time.Time  `json:"created_at"`
}

func (eo *EventOutbox) ToResponse() EventOutboxResponse {
	return EventOutboxResponse{
		ID:             eo.ID,
		EventType:      eo.EventType,
		ReferenceType:  eo.ReferenceType,
		ReferenceID:    eo.ReferenceID,
		Payload:        eo.Payload,
		Status:         eo.Status,
		RetryCount:     eo.RetryCount,
		LastError:      eo.LastError,
		ProcessedAt:    eo.ProcessedAt,
		SequenceNumber: eo.SequenceNumber,
		CreatedAt:      eo.CreatedAt,
	}
}

type TrialBalanceRow struct {
	AccountCode string `json:"account_code"`
	AccountName string `json:"account_name"`
	AccountType string `json:"account_type"`
	Debit       int64  `json:"debit"`
	Credit      int64  `json:"credit"`
}

type BalanceSheetItem struct {
	AccountCode string `json:"account_code"`
	AccountName string `json:"account_name"`
	Amount      int64  `json:"amount"`
	Level       int    `json:"level"`
}

type IncomeStatementItem struct {
	Category string                  `json:"category"`
	Items    []IncomeStatementLine   `json:"items"`
	Total    int64                   `json:"total"`
}

type IncomeStatementLine struct {
	AccountCode string `json:"account_code"`
	AccountName string `json:"account_name"`
	Amount      int64  `json:"amount"`
}

type CashFlowItem struct {
	Category    string `json:"category"`
	Description string `json:"description"`
	Amount      int64  `json:"amount"`
}

type GeneralLedgerRow struct {
	Date               time.Time `json:"date"`
	JournalEntryNumber string    `json:"journal_entry_number"`
	AccountCode        string    `json:"account_code"`
	AccountName        string    `json:"account_name"`
	Description        string    `json:"description"`
	Debit              int64     `json:"debit"`
	Credit             int64     `json:"credit"`
	Balance            int64     `json:"balance"`
}
