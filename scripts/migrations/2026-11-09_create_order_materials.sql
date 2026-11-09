-- Migration: Buat tabel order_materials
-- Dibuat: 2026-11-09
-- Alasan: Tabel ini baru ditambahkan ke kode (model OrderMaterial) tetapi
--         belum ada di database produksi karena RUN_MIGRATIONS tidak aktif.
--         Tanpa tabel ini, POST /api/orders gagal dengan Error 1146.
--
-- Jalankan di server produksi:
--   mysql -u <user> -p <database> < 2026-11-09_create_order_materials.sql
-- atau via cPanel phpMyAdmin.
--
-- Vetted by AI - Manual Review Required by Senior Engineer/Manager

CREATE TABLE IF NOT EXISTS `order_materials` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `created_at`    DATETIME(3)     NULL,
  `updated_at`    DATETIME(3)     NULL,
  `deleted_at`    DATETIME(3)     NULL,
  `order_id`      BIGINT UNSIGNED NOT NULL,
  `ingredient_id` BIGINT UNSIGNED NOT NULL,
  `quantity`      DOUBLE          NOT NULL DEFAULT 0,
  `location`      VARCHAR(191)    NOT NULL DEFAULT 'kedai',
  PRIMARY KEY (`id`),
  INDEX `idx_order_materials_order_id`    (`order_id`),
  INDEX `idx_order_materials_created_at` (`created_at`),
  INDEX `idx_order_materials_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
