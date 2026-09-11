package models

import "time"

// PSAKAccount represents a chart of accounts per PSAK standards.
type PSAKAccount struct {
	BaseModel
	Code        string `gorm:"uniqueIndex:idx_account_code_outlet" json:"code"`
	Name        string `json:"name"`
	Type        string `json:"type"` // asset, liability, equity, revenue, expense
	ParentID    *uint  `json:"parent_id"`
	IsActive    bool   `gorm:"default:true" json:"is_active"`
	Description string `json:"description"`
	OutletID    uint   `gorm:"uniqueIndex:idx_account_code_outlet" json:"outlet_id"`
}
// PSAKJournalEntry represents a double-entry journal header.
type PSAKJournalEntry struct {
	BaseModel
	EntryNumber string    `gorm:"unique" json:"entry_number"`
	Date        time.Time `gorm:"index" json:"date"`
	Description string    `json:"description"`
	SourceType  string    `json:"source_type"` // order, expense, adjustment, opening, closing
	SourceID    *uint     `json:"source_id"`
	Status      string    `gorm:"default:draft;index" json:"status"` // draft, posted, void
	OutletID    uint      `gorm:"index" json:"outlet_id"`
	CreatedBy   uint      `json:"created_by"`
}

// PSAKJournalEntryItem represents a line item in a journal entry.
type PSAKJournalEntryItem struct {
	BaseModel
	JournalEntryID uint   `gorm:"index" json:"journal_entry_id"`
	AccountID      uint   `gorm:"index" json:"account_id"`
	AccountCode    string `json:"account_code"` // denormalized for read performance
	AccountName    string `json:"account_name"` // denormalized for read performance
	Debit          int64  `gorm:"default:0" json:"debit"`
	Credit         int64  `gorm:"default:0" json:"credit"`
	Description    string `json:"description"`
	OutletID       uint   `gorm:"index" json:"outlet_id"`
}

// PSAKEventOutbox stores domain events for reliable outbox-pattern publishing.
type PSAKEventOutbox struct {
	BaseModel
	EventType      string     `gorm:"uniqueIndex:idx_outbox_event_ref;index" json:"event_type"`
	ReferenceType  string     `gorm:"uniqueIndex:idx_outbox_event_ref" json:"reference_type"`
	ReferenceID    uint       `gorm:"uniqueIndex:idx_outbox_event_ref;index" json:"reference_id"`
	Payload        []byte     `json:"payload"`
	Status         string     `gorm:"default:pending;index" json:"status"` // pending, processing, success, failed, dead_letter
	RetryCount     int        `gorm:"default:0" json:"retry_count"`
	MaxRetries     int        `gorm:"default:3" json:"max_retries"`
	LastError      string     `json:"last_error"`
	ProcessedAt    *time.Time `json:"processed_at"`
	SequenceNumber int64      `gorm:"autoIncrement" json:"sequence_number"`
}

// PSAKSchemaVersion tracks applied PSAK migration versions.
type PSAKSchemaVersion struct {
	Version   int       `json:"version"`
	AppliedAt time.Time `json:"applied_at"`
}
