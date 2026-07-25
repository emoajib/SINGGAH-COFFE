-- ============================================
-- DATABASE CLEANUP & STANDARDIZATION SCRIPT
-- Date: 2026-02-05
-- Purpose: Standardize ingredients and fix data
-- ============================================
BEGIN;
-- ============================================
-- STEP 1: STANDARDIZE UNITS
-- ============================================
-- Change 'gr' to 'gram'
UPDATE ingredients
SET unit = 'gram'
WHERE unit = 'gr';
-- Change 'l' (liter) to 'ml' and adjust values
-- SUSU UHT: 1 liter = 1000 ml, cost 19000/l = 19/ml
UPDATE ingredients
SET unit = 'ml',
    current_stock = current_stock * 1000,
    cost_per_unit = cost_per_unit / 1000
WHERE unit = 'l';
-- ============================================
-- STEP 2: MERGE DUPLICATE INGREDIENTS
-- ============================================
-- 2.1 GULA AREN (keep id=11, merge id=5)
-- Update recipe_items to use id=11 instead of id=5
UPDATE recipe_items
SET ingredient_id = 11
WHERE ingredient_id = 5;
-- Add stock from id=5 to id=11
UPDATE ingredients
SET current_stock = current_stock + (
        SELECT current_stock
        FROM ingredients
        WHERE id = 5
    )
WHERE id = 11;
-- Delete duplicate
DELETE FROM ingredients
WHERE id = 5;
-- 2.2 KOPI ARABIKA (keep id=8, merge id=3)
-- Update recipe_items to use id=8 instead of id=3
UPDATE recipe_items
SET ingredient_id = 8
WHERE ingredient_id = 3;
-- Add stock from id=3 to id=8
UPDATE ingredients
SET current_stock = current_stock + (
        SELECT current_stock
        FROM ingredients
        WHERE id = 3
    )
WHERE id = 8;
-- Delete duplicate
DELETE FROM ingredients
WHERE id = 3;
-- 2.3 KOPI BLEND (keep id=7, merge id=4)
-- Update recipe_items to use id=7 instead of id=4
UPDATE recipe_items
SET ingredient_id = 7
WHERE ingredient_id = 4;
-- Add stock from id=4 to id=7
UPDATE ingredients
SET current_stock = current_stock + (
        SELECT current_stock
        FROM ingredients
        WHERE id = 4
    )
WHERE id = 7;
-- Delete duplicate
DELETE FROM ingredients
WHERE id = 4;
-- 2.4 KOPI ROBUSTA (keep id=6, merge id=2)
-- Update recipe_items to use id=6 instead of id=2
UPDATE recipe_items
SET ingredient_id = 6
WHERE ingredient_id = 2;
-- Add stock from id=2 to id=6
UPDATE ingredients
SET current_stock = current_stock + (
        SELECT current_stock
        FROM ingredients
        WHERE id = 2
    )
WHERE id = 6;
-- Delete duplicate
DELETE FROM ingredients
WHERE id = 2;
-- 2.5 SUSU UHT (keep id=9, merge id=1)
-- Note: id=1 was in liters, already converted to ml in STEP 1
-- Update recipe_items to use id=9 instead of id=1
UPDATE recipe_items
SET ingredient_id = 9
WHERE ingredient_id = 1;
-- Add stock from id=1 to id=9 (both now in ml)
UPDATE ingredients
SET current_stock = current_stock + (
        SELECT current_stock
        FROM ingredients
        WHERE id = 1
    )
WHERE id = 9;
-- Delete duplicate
DELETE FROM ingredients
WHERE id = 1;
-- ============================================
-- STEP 3: STANDARDIZE INGREDIENT NAMES (Title Case)
-- ============================================
UPDATE ingredients
SET name = 'Air Mineral'
WHERE id = 14;
UPDATE ingredients
SET name = 'Cup'
WHERE id = 13;
UPDATE ingredients
SET name = 'Gula Aren'
WHERE id = 11;
UPDATE ingredients
SET name = 'Gula Cair'
WHERE id = 15;
UPDATE ingredients
SET name = 'Gula Pasir'
WHERE id = 12;
UPDATE ingredients
SET name = 'Kopi Arabika'
WHERE id = 8;
UPDATE ingredients
SET name = 'Kopi Blend'
WHERE id = 7;
UPDATE ingredients
SET name = 'Kopi Robusta'
WHERE id = 6;
UPDATE ingredients
SET name = 'Susu Outside'
WHERE id = 10;
UPDATE ingredients
SET name = 'Susu UHT'
WHERE id = 9;
-- ============================================
-- STEP 4: ADD MISSING RECIPE FOR "kopi hitam" (id=2)
-- ============================================
-- First, check if recipe already exists
DELETE FROM recipe_items
WHERE product_id = 2;
-- Add recipe for "kopi hitam"
-- Recipe: Kopi Robusta 15g, Gula Pasir 20g, Cup 1pcs, Air Mineral 100ml
INSERT INTO recipe_items (
        product_id,
        ingredient_id,
        quantity,
        created_at,
        updated_at
    )
VALUES (2, 6, 15, NOW(), NOW()),
    -- Kopi Robusta 15 gram
    (2, 12, 20, NOW(), NOW()),
    -- Gula Pasir 20 gram
    (2, 13, 1, NOW(), NOW()),
    -- Cup 1 pcs
    (2, 14, 100, NOW(), NOW());
-- Air Mineral 100 ml
-- ============================================
-- STEP 5: RECALCULATE PRODUCT COSTS
-- ============================================
-- Product id=2: kopi hitam
-- Cost = (15 * 150) + (20 * 15) + (1 * 500) + (100 * 1) = 2250 + 300 + 500 + 100 = 3150
UPDATE products
SET cost = 3150
WHERE id = 2;
-- Product id=3: Kopi Hitam (already has recipe, recalculate)
-- Recipe: Kopi Robusta 15g, Gula Pasir 20g, Cup 1pcs, Air Mineral 100ml
-- Cost = (15 * 150) + (20 * 15) + (1 * 500) + (100 * 1) = 3150
UPDATE products
SET cost = 3150
WHERE id = 3;
-- Product id=4: Kopi Susu
-- Recipe: Kopi Robusta 15g, Susu UHT 90g, Cup 1pcs, Air Mineral 50ml
-- Cost = (15 * 150) + (90 * 25) + (1 * 500) + (50 * 1) = 2250 + 2250 + 500 + 50 = 5050
UPDATE products
SET cost = 5050
WHERE id = 4;
-- Product id=5: Kopi Susu Outside
-- Recipe: Kopi Robusta 15g, Susu Outside 90g, Cup 1pcs, Air Mineral 50ml
-- Cost = (15 * 150) + (90 * 30) + (1 * 500) + (50 * 1) = 2250 + 2700 + 500 + 50 = 5500
UPDATE products
SET cost = 5500
WHERE id = 5;
-- Product id=1: Kopi Susu Gula Aren
-- Recipe: Kopi Robusta 15g, Susu UHT 90g, Gula Aren 25g, Cup 1pcs, Air Mineral 50ml
-- Cost = (15 * 150) + (90 * 25) + (25 * 50) + (1 * 500) + (50 * 1) = 2250 + 2250 + 1250 + 500 + 50 = 6300
UPDATE products
SET cost = 6300
WHERE id = 1;
-- ============================================
-- STEP 6: STANDARDIZE PRODUCT NAMES
-- ============================================
UPDATE products
SET name = 'Kopi Hitam'
WHERE id = 2;
UPDATE products
SET category = 'Kopi'
WHERE id = 2;
COMMIT;
-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Check ingredients after cleanup
SELECT id,
    name,
    unit,
    current_stock,
    cost_per_unit
FROM ingredients
ORDER BY name;
-- Check products with costs
SELECT id,
    name,
    category,
    price,
    cost,
    (price - cost) as profit,
    ROUND(
        ((price - cost)::numeric / price::numeric * 100),
        2
    ) as margin_pct
FROM products
ORDER BY id;
-- Check recipe items
SELECT ri.id,
    p.name as product,
    i.name as ingredient,
    ri.quantity,
    i.unit
FROM recipe_items ri
    JOIN products p ON ri.product_id = p.id
    JOIN ingredients i ON ri.ingredient_id = i.id
ORDER BY p.name,
    ri.id;