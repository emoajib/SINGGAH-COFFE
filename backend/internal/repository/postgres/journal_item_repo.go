package postgres

import (
	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/models"

	"gorm.io/gorm"
)

type journalItemRepository struct {
	db *gorm.DB
}

func NewJournalItemRepository(db *gorm.DB) *journalItemRepository {
	return &journalItemRepository{db: db}
}

func (r *journalItemRepository) FindByAccountID(accountID uint, start, end string, outletID ...uint) ([]entity.JournalEntryItem, error) {
	tx := r.db.Table("psak_journal_entry_items").
		Where("account_id = ?", accountID)
	if start != "" {
		tx = tx.Joins("JOIN psak_journal_entries ON psak_journal_entries.id = psak_journal_entry_items.journal_entry_id").
			Where("psak_journal_entries.date >= ?", start)
	}
	if end != "" {
		tx = tx.Joins("JOIN psak_journal_entries ON psak_journal_entries.id = psak_journal_entry_items.journal_entry_id").
			Where("psak_journal_entries.date <= ?", end)
	}
	if len(outletID) > 0 && outletID[0] > 0 {
		tx = tx.Where("psak_journal_entry_items.outlet_id = ? OR psak_journal_entry_items.outlet_id = 0", outletID[0])
	}
	tx = tx.Where("psak_journal_entry_items.journal_entry_id IN (SELECT id FROM psak_journal_entries WHERE status = 'posted')")

	var ms []models.PSAKJournalEntryItem
	if err := tx.Order("id asc").Find(&ms).Error; err != nil {
		return nil, err
	}
	result := make([]entity.JournalEntryItem, len(ms))
	for i, m := range ms {
		result[i] = *toDomainJournalEntryItem(&m)
	}
	return result, nil
}

func (r *journalItemRepository) GetBalanceByAccount(accountID uint, start, end string, outletID ...uint) (debit int64, credit int64, err error) {
	tx := r.db.Table("psak_journal_entry_items").
		Where("account_id = ?", accountID).
		Where("psak_journal_entry_items.journal_entry_id IN (SELECT id FROM psak_journal_entries WHERE status = 'posted')")
	if start != "" {
		tx = tx.Joins("JOIN psak_journal_entries ON psak_journal_entries.id = psak_journal_entry_items.journal_entry_id").
			Where("psak_journal_entries.date >= ?", start)
	}
	if end != "" {
		tx = tx.Joins("JOIN psak_journal_entries ON psak_journal_entries.id = psak_journal_entry_items.journal_entry_id").
			Where("psak_journal_entries.date <= ?", end)
	}
	if len(outletID) > 0 && outletID[0] > 0 {
		tx = tx.Where("psak_journal_entry_items.outlet_id = ? OR psak_journal_entry_items.outlet_id = 0", outletID[0])
	}
	if err = tx.Select("COALESCE(SUM(debit), 0), COALESCE(SUM(credit), 0)").Row().Scan(&debit, &credit); err != nil {
		return 0, 0, err
	}
	return debit, credit, nil
}

func (r *journalItemRepository) GetTrialBalance(start, end string, outletID ...uint) ([]entity.TrialBalanceRow, error) {
	tx := r.db.Table("psak_journal_entry_items").
		Select("psak_journal_entry_items.account_code, psak_journal_entry_items.account_name, psak_accounts.type as account_type, COALESCE(SUM(psak_journal_entry_items.debit), 0) as debit, COALESCE(SUM(psak_journal_entry_items.credit), 0) as credit").
		Joins("JOIN psak_journal_entries ON psak_journal_entries.id = psak_journal_entry_items.journal_entry_id").
		Joins("JOIN psak_accounts ON psak_accounts.id = psak_journal_entry_items.account_id").
		Where("psak_journal_entries.status = ?", "posted").
		Group("psak_journal_entry_items.account_code, psak_journal_entry_items.account_name, psak_accounts.type")
	if start != "" {
		tx = tx.Where("psak_journal_entries.date >= ?", start)
	}
	if end != "" {
		tx = tx.Where("psak_journal_entries.date <= ?", end)
	}
	if len(outletID) > 0 && outletID[0] > 0 {
		tx = tx.Where("psak_journal_entry_items.outlet_id = ? OR psak_journal_entry_items.outlet_id = 0", outletID[0])
	}

	var rows []entity.TrialBalanceRow
	if err := tx.Order("psak_journal_entry_items.account_code asc").Find(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}

func (r *journalItemRepository) GetGeneralLedger(accountID uint, start, end string, limit, offset int, outletID ...uint) ([]entity.GeneralLedgerRow, error) {
	tx := r.db.Table("psak_journal_entry_items").
		Select("psak_journal_entries.date, psak_journal_entries.entry_number as journal_entry_number, psak_journal_entry_items.account_code, psak_journal_entry_items.account_name, psak_journal_entry_items.description, psak_journal_entry_items.debit, psak_journal_entry_items.credit").
		Joins("JOIN psak_journal_entries ON psak_journal_entries.id = psak_journal_entry_items.journal_entry_id").
		Where("psak_journal_entry_items.account_id = ?", accountID).
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

	var rows []entity.GeneralLedgerRow
	if err := tx.Order("psak_journal_entries.date asc, psak_journal_entries.id asc").Limit(limit).Offset(offset).Find(&rows).Error; err != nil {
		return nil, err
	}

	// Calculate running balance
	var balance int64
	for i := range rows {
		balance = balance + rows[i].Debit - rows[i].Credit
		rows[i].Balance = balance
	}
	return rows, nil
}
