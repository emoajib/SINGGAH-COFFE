-- 1. Standardize Units
UPDATE ingredients
SET unit = 'gram'
WHERE unit IN ('gr', 'g', 'gram');
UPDATE ingredients
SET unit = 'ml'
WHERE unit IN ('ml', 'mililiter');
-- 2. Clean up Duplicates (Merging IDs)
-- We will move all references from old IDs to master IDs
-- Merge KOPI ARABIKA (3) -> Kopi Arabika (8)
UPDATE recipe_items
SET ingredient_id = 8
WHERE ingredient_id = 3;
UPDATE stock_mutations
SET ingredient_id = 8
WHERE ingredient_id = 3;
UPDATE ingredients
SET current_stock = current_stock + (
        SELECT current_stock
        FROM ingredients
        WHERE id = 3
    )
WHERE id = 8;
DELETE FROM ingredients
WHERE id = 3;
-- Merge KOPI BLEND (4) -> Kopi Blend (7)
UPDATE recipe_items
SET ingredient_id = 7
WHERE ingredient_id = 4;
UPDATE stock_mutations
SET ingredient_id = 7
WHERE ingredient_id = 4;
UPDATE ingredients
SET current_stock = current_stock + (
        SELECT current_stock
        FROM ingredients
        WHERE id = 4
    )
WHERE id = 7;
DELETE FROM ingredients
WHERE id = 4;
-- Merge GULA AREN (5) -> Gula Pasir/Cair or keep one. Let's make it consistent Title Case.
UPDATE ingredients
SET name = 'Gula Aren'
WHERE id = 5;
-- 3. Fix Product Costs (Reset to 0 for recalculation if needed, though the service will handle this)
-- Ensure 'kopi hitam' has a recipe link if it's supposed to use coffee beans.
-- 4. Final Polish: Title Case for all ingredients
UPDATE ingredients
SET name = INITCAP(name);