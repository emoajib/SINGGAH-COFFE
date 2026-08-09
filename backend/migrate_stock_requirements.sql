-- Migration: Kebutuhan Stok (purchase_unit + production_targets)
-- Generated from Excel by gen_stok_migrate_sql.py

ALTER TABLE ingredients
  ADD COLUMN category VARCHAR(50) NOT NULL DEFAULT '' AFTER name,
  ADD COLUMN purchase_unit VARCHAR(20) NOT NULL DEFAULT '' AFTER unit,
  ADD COLUMN purchase_unit_size DOUBLE NOT NULL DEFAULT 1 AFTER purchase_unit;

CREATE TABLE IF NOT EXISTS production_targets (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id BIGINT UNSIGNED NOT NULL,
  target_cup DOUBLE NOT NULL DEFAULT 0,
  outlet_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME(3) NULL,
  updated_at DATETIME(3) NULL,
  deleted_at DATETIME(3) NULL,
  UNIQUE KEY uq_product_outlet (product_id, outlet_id)
);

-- Backfill purchase unit & category (from Master Bahan Baku)
UPDATE ingredients SET category = 'Bubuk Rasa', purchase_unit = 'gram', purchase_unit_size = 100 WHERE name = 'Bubuk Matcha' AND (purchase_unit = '' OR purchase_unit IS NULL);
UPDATE ingredients SET category = 'Kemasan', purchase_unit = 'pcs', purchase_unit_size = 1 WHERE name = 'Cup Plastik 12oz + Tutup' AND (purchase_unit = '' OR purchase_unit IS NULL);
UPDATE ingredients SET category = 'Es', purchase_unit = 'kg', purchase_unit_size = 1000 WHERE name = 'Es Batu' AND (purchase_unit = '' OR purchase_unit IS NULL);
UPDATE ingredients SET category = 'Topping', purchase_unit = 'kg', purchase_unit_size = 1000 WHERE name = 'Garam Laut (Sea Salt)' AND (purchase_unit = '' OR purchase_unit IS NULL);
UPDATE ingredients SET category = 'Pemanis', purchase_unit = 'liter', purchase_unit_size = 1000 WHERE name = 'Gula Aren Cair (Palm Sugar Syrup)' AND (purchase_unit = '' OR purchase_unit IS NULL);
UPDATE ingredients SET category = 'Pemanis', purchase_unit = 'liter', purchase_unit_size = 1000 WHERE name = 'Gula Cair (Simple Syrup)' AND (purchase_unit = '' OR purchase_unit IS NULL);
UPDATE ingredients SET category = 'Kopi', purchase_unit = 'kg', purchase_unit_size = 1000 WHERE name = 'Kopi Blend Bubuk/Biji' AND (purchase_unit = '' OR purchase_unit IS NULL);
UPDATE ingredients SET category = 'Kopi', purchase_unit = 'kg', purchase_unit_size = 1000 WHERE name = 'Kopi Robusta Bubuk/Biji' AND (purchase_unit = '' OR purchase_unit IS NULL);
UPDATE ingredients SET category = 'Susu', purchase_unit = 'kg', purchase_unit_size = 1000 WHERE name = 'Krimer Bubuk' AND (purchase_unit = '' OR purchase_unit IS NULL);
UPDATE ingredients SET category = 'Kemasan', purchase_unit = 'pcs', purchase_unit_size = 1 WHERE name = 'Sedotan' AND (purchase_unit = '' OR purchase_unit IS NULL);
UPDATE ingredients SET category = 'Pemanis', purchase_unit = 'liter', purchase_unit_size = 1000 WHERE name = 'Sirup Butterscotch' AND (purchase_unit = '' OR purchase_unit IS NULL);
UPDATE ingredients SET category = 'Susu', purchase_unit = 'liter', purchase_unit_size = 1000 WHERE name = 'Susu Full Cream UHT' AND (purchase_unit = '' OR purchase_unit IS NULL);
UPDATE ingredients SET category = 'Pemanis', purchase_unit = 'liter', purchase_unit_size = 1000 WHERE name = 'Susu Kental Manis (SKM)' AND (purchase_unit = '' OR purchase_unit IS NULL);
UPDATE ingredients SET category = 'Susu', purchase_unit = 'liter', purchase_unit_size = 1000 WHERE name = 'Susu Oat (Oatside Barista Blend)' AND (purchase_unit = '' OR purchase_unit IS NULL);

-- Default production targets (50 cup/menu, matching Excel baseline)
INSERT INTO production_targets (product_id, target_cup, outlet_id, created_at, updated_at) SELECT id, 50, 1, NOW(), NOW() FROM products WHERE name = 'Americano (Es)' ON DUPLICATE KEY UPDATE target_cup = VALUES(target_cup);
INSERT INTO production_targets (product_id, target_cup, outlet_id, created_at, updated_at) SELECT id, 50, 1, NOW(), NOW() FROM products WHERE name = 'Butterscotch Latte' ON DUPLICATE KEY UPDATE target_cup = VALUES(target_cup);
INSERT INTO production_targets (product_id, target_cup, outlet_id, created_at, updated_at) SELECT id, 50, 1, NOW(), NOW() FROM products WHERE name = 'Cappuccino (Panas)' ON DUPLICATE KEY UPDATE target_cup = VALUES(target_cup);
INSERT INTO production_targets (product_id, target_cup, outlet_id, created_at, updated_at) SELECT id, 50, 1, NOW(), NOW() FROM products WHERE name = 'Kopsu Original' ON DUPLICATE KEY UPDATE target_cup = VALUES(target_cup);
INSERT INTO production_targets (product_id, target_cup, outlet_id, created_at, updated_at) SELECT id, 50, 1, NOW(), NOW() FROM products WHERE name = 'Kopsu Singgah' ON DUPLICATE KEY UPDATE target_cup = VALUES(target_cup);
INSERT INTO production_targets (product_id, target_cup, outlet_id, created_at, updated_at) SELECT id, 50, 1, NOW(), NOW() FROM products WHERE name = 'Kopsu Singgah Aren' ON DUPLICATE KEY UPDATE target_cup = VALUES(target_cup);
INSERT INTO production_targets (product_id, target_cup, outlet_id, created_at, updated_at) SELECT id, 50, 1, NOW(), NOW() FROM products WHERE name = 'Matcha' ON DUPLICATE KEY UPDATE target_cup = VALUES(target_cup);
INSERT INTO production_targets (product_id, target_cup, outlet_id, created_at, updated_at) SELECT id, 50, 1, NOW(), NOW() FROM products WHERE name = 'Oatside Signature' ON DUPLICATE KEY UPDATE target_cup = VALUES(target_cup);
INSERT INTO production_targets (product_id, target_cup, outlet_id, created_at, updated_at) SELECT id, 50, 1, NOW(), NOW() FROM products WHERE name = 'Oatside Signature Gula Aren' ON DUPLICATE KEY UPDATE target_cup = VALUES(target_cup);
INSERT INTO production_targets (product_id, target_cup, outlet_id, created_at, updated_at) SELECT id, 50, 1, NOW(), NOW() FROM products ON DUPLICATE KEY UPDATE target_cup = VALUES(target_cup);

-- Planning period (days) setting
INSERT INTO settings (`key`, `value`, setting_group, outlet_id, created_at, updated_at)
SELECT 'stock_planning_period_days', '10', 'inventory', 0, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE `key` = 'stock_planning_period_days' AND outlet_id = 0);

