-- Rollback script for PSAK backfill
-- WARNING: This will DELETE all backfilled journal entries (BACKFILL-* prefix)
-- Run this ONLY if you need to undo the backfill

-- 1. Delete journal entry items for backfilled entries
DELETE FROM psak_journal_entry_items
WHERE journal_entry_id IN (
    SELECT id FROM psak_journal_entries
    WHERE entry_number LIKE 'BACKFILL-%'
);

-- 2. Delete backfilled journal entries
DELETE FROM psak_journal_entries
WHERE entry_number LIKE 'BACKFILL-%';

-- Verify: Should return 0 rows
-- SELECT COUNT(*) FROM psak_journal_entries WHERE entry_number LIKE 'BACKFILL-%';
-- SELECT COUNT(*) FROM psak_journal_entry_items WHERE journal_entry_id IN (SELECT id FROM psak_journal_entries WHERE entry_number LIKE 'BACKFILL-%');
