-- Migration: Buat tabel stock_opnames dan stock_opname_items
-- Dibuat: 2026-11-24
-- Alasan: Tabel ini ada di kode (models.StockOpname & models.StockOpnameItem)
--         tetapi belum ada di database produksi karena RUN_MIGRATIONS default off.
--         Tanpa tabel ini, POST /api/inventory/opname gagal dengan Error 1146 (Table doesn't exist).
--
-- Jalankan di server produksi:
--   mysql -u <user> -p <database> < 2026-11-24_create_stock_opnames.sql
-- atau otomatis via update-webhosting.sh (Step 4b)
--
-- Vetted by AI - Manual Review Required by Senior Engineer/Manager

CREATE TABLE IF NOT EXISTS `stock_opnames` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `created_at`  DATETIME(3)     NULL,
  `updated_at`  DATETIME(3)     NULL,
  `deleted_at`  DATETIME(3)     NULL,
  `outlet_id`   BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `period_from` DATETIME(3)     NULL,
  `period_to`   DATETIME(3)     NULL,
  `notes`       TEXT            NULL,
  `created_by`  BIGINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  INDEX `idx_stock_opnames_outlet_id`  (`outlet_id`),
  INDEX `idx_stock_opnames_created_at` (`created_at`),
  INDEX `idx_stock_opnames_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `stock_opname_items` (
  `id`             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `created_at`     DATETIME(3)     NULL,
  `updated_at`     DATETIME(3)     NULL,
  `deleted_at`     DATETIME(3)     NULL,
  `opname_id`      BIGINT UNSIGNED NOT NULL,
  `ingredient_id`  BIGINT UNSIGNED NOT NULL,
  `system_stock`   DOUBLE          NOT NULL DEFAULT 0,
  `physical_stock` DOUBLE          NOT NULL DEFAULT 0,
  `difference`     DOUBLE          NOT NULL DEFAULT 0,
  `unit`           VARCHAR(50)     NOT NULL DEFAULT '',
  `note`           TEXT            NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_stock_opname_items_opname_id`     (`opname_id`),
  INDEX `idx_stock_opname_items_ingredient_id` (`ingredient_id`),
  INDEX `idx_stock_opname_items_created_at`    (`created_at`),
  INDEX `idx_stock_opname_items_deleted_at`    (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
