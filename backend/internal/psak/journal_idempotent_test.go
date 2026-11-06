package psak

import (
	"encoding/json"
	"testing"
	"time"

	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/models"
	"singgah-pos-backend/internal/repository/postgres"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupJournalDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(
		&models.PSAKJournalEntry{}, &models.PSAKJournalEntryItem{}, &models.PSAKAccount{},
	))
	return db
}

// D3 regression: CreateIdempotent hanya menyimpan satu jurnal + satu set item
// walaupun dipanggil berulang dengan kunci yang sama.
func TestJournalRepository_CreateIdempotent(t *testing.T) {
	db := setupJournalDB(t)
	repo := postgres.NewJournalRepository(db)

	entry := &entity.JournalEntry{
		EntryNumber:    "JE-TEST-001",
		Date:           time.Now(),
		Description:    "Test",
		SourceType:     "expense",
		Status:         "posted",
		OutletID:       1,
		IdempotencyKey: "outbox:42",
	}
	items := []entity.JournalEntryItem{
		{AccountID: 1, AccountCode: "5201", AccountName: "Beban", Debit: 10000, OutletID: 1},
		{AccountID: 2, AccountCode: "1101", AccountName: "Kas", Credit: 10000, OutletID: 1},
	}

	created, err := repo.CreateIdempotent(entry, items)
	require.NoError(t, err)
	assert.True(t, created)

	duplicate := &entity.JournalEntry{
		EntryNumber:    "JE-TEST-002",
		Date:           time.Now(),
		Description:    "Test retry",
		SourceType:     "expense",
		Status:         "posted",
		OutletID:       1,
		IdempotencyKey: "outbox:42",
	}
	created, err = repo.CreateIdempotent(duplicate, items)
	require.NoError(t, err, "duplicate-key tidak boleh jadi error")
	assert.False(t, created)

	var entryCount int64
	db.Model(&models.PSAKJournalEntry{}).Count(&entryCount)
	assert.Equal(t, int64(1), entryCount)

	var itemCount int64
	db.Model(&models.PSAKJournalEntryItem{}).Count(&itemCount)
	assert.Equal(t, int64(2), itemCount, "item tidak boleh ikut tergandakan")
}

// D3 regression: replay event outbox yang sama tidak membuat jurnal ganda.
func TestJournalEventHandler_ReplayIsIdempotent(t *testing.T) {
	db := setupJournalDB(t)

	for _, acc := range []models.PSAKAccount{
		{Code: "5201", Name: "Beban Operasional", Type: "expense", OutletID: 1},
		{Code: "1101", Name: "Kas", Type: "asset", OutletID: 1},
	} {
		require.NoError(t, db.Create(&acc).Error)
	}

	handler := NewJournalEventHandler(db)

	payload, err := json.Marshal(ExpenseEventPayload{
		ID: 5, Title: "Listrik", Amount: 250000, Category: "Operasional",
		PaymentMethod: "Cash", OutletID: 1, Date: "2026-11-06",
	})
	require.NoError(t, err)

	event := &entity.EventOutbox{
		ID: 100, EventType: "expense.created", ReferenceType: "expense", ReferenceID: 5,
		Payload: payload, Status: "pending",
	}

	require.NoError(t, handler.ProcessEvent(event))
	require.NoError(t, handler.ProcessEvent(event), "replay harus no-op, bukan error")

	var entryCount int64
	db.Model(&models.PSAKJournalEntry{}).Count(&entryCount)
	assert.Equal(t, int64(1), entryCount, "replay event tidak boleh membuat jurnal ganda")

	var itemCount int64
	db.Model(&models.PSAKJournalEntryItem{}).Count(&itemCount)
	assert.Equal(t, int64(2), itemCount)

	var posted models.PSAKJournalEntry
	require.NoError(t, db.First(&posted).Error)
	require.NotNil(t, posted.IdempotencyKey)
	assert.Equal(t, "outbox:100", *posted.IdempotencyKey)
}

// D3 regression: event berbeda tetap menghasilkan jurnal masing-masing
// (kunci idempotensi tidak boleh terlalu agresif).
func TestJournalEventHandler_DistinctEventsCreateDistinctJournals(t *testing.T) {
	db := setupJournalDB(t)

	for _, acc := range []models.PSAKAccount{
		{Code: "5201", Name: "Beban Operasional", Type: "expense", OutletID: 1},
		{Code: "1101", Name: "Kas", Type: "asset", OutletID: 1},
	} {
		require.NoError(t, db.Create(&acc).Error)
	}

	handler := NewJournalEventHandler(db)
	mkEvent := func(id uint, expenseID uint, title string) *entity.EventOutbox {
		p, err := json.Marshal(ExpenseEventPayload{
			ID: expenseID, Title: title, Amount: 10000, Category: "Operasional",
			PaymentMethod: "Cash", OutletID: 1, Date: "2026-11-06",
		})
		require.NoError(t, err)
		return &entity.EventOutbox{
			ID: id, EventType: "expense.created", ReferenceType: "expense",
			ReferenceID: expenseID, Payload: p, Status: "pending",
		}
	}

	require.NoError(t, handler.ProcessEvent(mkEvent(201, 11, "Listrik")))
	require.NoError(t, handler.ProcessEvent(mkEvent(202, 12, "Air")))

	var entryCount int64
	db.Model(&models.PSAKJournalEntry{}).Count(&entryCount)
	assert.Equal(t, int64(2), entryCount)
}
