package postgres

import (
	"fmt"
	"time"

	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/models"

	"gorm.io/gorm"
)

type journalRepository struct {
	db *gorm.DB
}

func NewJournalRepository(db *gorm.DB) *journalRepository {
	return &journalRepository{db: db}
}

func (r *journalRepository) FindAll(limit, offset int, outletID ...uint) ([]entity.JournalEntry, error) {
	tx := r.db.Order("date desc, id desc").Limit(limit).Offset(offset)
	if len(outletID) > 0 && outletID[0] > 0 {
		tx = tx.Where("outlet_id = ? OR outlet_id = 0", outletID[0])
	}
	var ms []models.PSAKJournalEntry
	if err := tx.Find(&ms).Error; err != nil {
		return nil, err
	}
	result := make([]entity.JournalEntry, len(ms))
	for i, m := range ms {
		result[i] = *toDomainJournalEntry(&m)
	}
	return result, nil
}

func (r *journalRepository) FindAllFiltered(start, end, status, sourceType string, limit, offset int, outletID ...uint) ([]entity.JournalEntry, error) {
	tx := r.db.Order("date desc, id desc").Limit(limit).Offset(offset)
	if start != "" {
		tx = tx.Where("DATE(date) >= ?", start)
	}
	if end != "" {
		tx = tx.Where("DATE(date) <= ?", end)
	}
	if status != "" {
		tx = tx.Where("status = ?", status)
	}
	if sourceType != "" {
		tx = tx.Where("source_type = ?", sourceType)
	}
	if len(outletID) > 0 && outletID[0] > 0 {
		tx = tx.Where("outlet_id = ? OR outlet_id = 0", outletID[0])
	}
	var ms []models.PSAKJournalEntry
	if err := tx.Find(&ms).Error; err != nil {
		return nil, err
	}
	result := make([]entity.JournalEntry, len(ms))
	for i, m := range ms {
		result[i] = *toDomainJournalEntry(&m)
	}
	return result, nil
}

func (r *journalRepository) FindByID(id uint) (*entity.JournalEntry, error) {
	var m models.PSAKJournalEntry
	if err := r.db.First(&m, id).Error; err != nil {
		return nil, err
	}
	return toDomainJournalEntry(&m), nil
}

func (r *journalRepository) FindByIDWithItems(id uint) (*entity.JournalEntry, error) {
	var m models.PSAKJournalEntry
	if err := r.db.First(&m, id).Error; err != nil {
		return nil, err
	}
	entry := toDomainJournalEntry(&m)

	var items []models.PSAKJournalEntryItem
	if err := r.db.Where("journal_entry_id = ?", id).Order("id asc").Find(&items).Error; err != nil {
		return nil, err
	}
	entry.Items = make([]entity.JournalEntryItem, len(items))
	for i, item := range items {
		entry.Items[i] = *toDomainJournalEntryItem(&item)
	}
	return entry, nil
}

func (r *journalRepository) Create(entry *entity.JournalEntry, items []entity.JournalEntryItem) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		m := toModelJournalEntry(entry)
		if err := tx.Create(m).Error; err != nil {
			return err
		}
		entry.ID = m.ID
		entry.CreatedAt = m.CreatedAt
		entry.UpdatedAt = m.UpdatedAt

		if len(items) > 0 {
			modelItems := make([]models.PSAKJournalEntryItem, len(items))
			for i, item := range items {
				modelItems[i] = models.PSAKJournalEntryItem{
					JournalEntryID: m.ID,
					AccountID:      item.AccountID,
					AccountCode:    item.AccountCode,
					AccountName:    item.AccountName,
					Debit:          item.Debit,
					Credit:         item.Credit,
					Description:    item.Description,
					OutletID:       item.OutletID,
				}
			}
			if err := tx.Create(&modelItems).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *journalRepository) UpdateStatus(id uint, status string) error {
	updates := map[string]interface{}{"status": status}
	if status == "posted" {
		updates["posted_at"] = time.Now()
	}
	return r.db.Model(&models.PSAKJournalEntry{}).Where("id = ?", id).Updates(updates).Error
}

func (r *journalRepository) GetNextEntryNumber(outletID uint) (string, error) {
	today := time.Now().Format("20060102")
	prefix := fmt.Sprintf("JE-%s-", today)

	var count int64
	tx := r.db.Model(&models.PSAKJournalEntry{}).
		Where("entry_number LIKE ?", prefix+"%")
	if outletID > 0 {
		tx = tx.Where("outlet_id = ? OR outlet_id = 0", outletID)
	}
	if err := tx.Count(&count).Error; err != nil {
		return "", err
	}
	return fmt.Sprintf("%s%03d", prefix, count+1), nil
}

func (r *journalRepository) GetTotalDebitCredit(start, end string, outletID ...uint) (debit int64, credit int64, err error) {
	tx := r.db.Model(&models.PSAKJournalEntryItem{}).
		Joins("JOIN psak_journal_entries ON psak_journal_entries.id = psak_journal_entry_items.journal_entry_id").
		Where("psak_journal_entries.status = ?", "posted")
	if start != "" {
		tx = tx.Where("psak_journal_entries.date >= ?", start)
	}
	if end != "" {
		tx = tx.Where("psak_journal_entries.date <= ?", end)
	}
	if len(outletID) > 0 && outletID[0] > 0 {
		tx = tx.Where("psak_journal_entry_items.outlet_id = ? OR psak_journal_entry_items.outlet_id = 0", outletID[0])
	}
	if err = tx.Select("COALESCE(SUM(debit), 0), COALESCE(SUM(credit), 0)").Row().Scan(&debit, &credit); err != nil {
		return 0, 0, err
	}
	return debit, credit, nil
}

func (r *journalRepository) FindItemsByEntryID(entryID uint) ([]entity.JournalEntryItem, error) {
	var ms []models.PSAKJournalEntryItem
	if err := r.db.Where("journal_entry_id = ?", entryID).Order("id asc").Find(&ms).Error; err != nil {
		return nil, err
	}
	result := make([]entity.JournalEntryItem, len(ms))
	for i, m := range ms {
		result[i] = *toDomainJournalEntryItem(&m)
	}
	return result, nil
}

func toDomainJournalEntry(m *models.PSAKJournalEntry) *entity.JournalEntry {
	return &entity.JournalEntry{
		ID:          m.ID,
		EntryNumber: m.EntryNumber,
		Date:        m.Date,
		Description: m.Description,
		SourceType:  m.SourceType,
		SourceID:    m.SourceID,
		Status:      m.Status,
		OutletID:    m.OutletID,
		CreatedBy:   m.CreatedBy,
		CreatedAt:   m.CreatedAt,
		UpdatedAt:   m.UpdatedAt,
	}
}

func toModelJournalEntry(e *entity.JournalEntry) *models.PSAKJournalEntry {
	return &models.PSAKJournalEntry{
		EntryNumber: e.EntryNumber,
		Date:        e.Date,
		Description: e.Description,
		SourceType:  e.SourceType,
		SourceID:    e.SourceID,
		Status:      e.Status,
		OutletID:    e.OutletID,
		CreatedBy:   e.CreatedBy,
	}
}

func toDomainJournalEntryItem(m *models.PSAKJournalEntryItem) *entity.JournalEntryItem {
	return &entity.JournalEntryItem{
		ID:             m.ID,
		JournalEntryID: m.JournalEntryID,
		AccountID:      m.AccountID,
		AccountCode:    m.AccountCode,
		AccountName:    m.AccountName,
		Debit:          m.Debit,
		Credit:         m.Credit,
		Description:    m.Description,
		OutletID:       m.OutletID,
		CreatedAt:      m.CreatedAt,
	}
}
