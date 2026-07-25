-- ========================================
-- SINGGAH COFFEE - RECIPE MANAGEMENT SETUP (FIXED)
-- ========================================
-- ========================================
-- 1. INSERT INGREDIENTS (Raw Materials)
-- ========================================
-- Coffee Ingredients
INSERT INTO ingredients (
        name,
        unit,
        current_stock,
        min_stock,
        cost_per_unit,
        created_at,
        updated_at
    )
VALUES (
        'Kopi Robusta',
        'gram',
        5000,
        500,
        150,
        NOW(),
        NOW()
    );
INSERT INTO ingredients (
        name,
        unit,
        current_stock,
        min_stock,
        cost_per_unit,
        created_at,
        updated_at
    )
VALUES (
        'Kopi Blend',
        'gram',
        5000,
        500,
        180,
        NOW(),
        NOW()
    );
INSERT INTO ingredients (
        name,
        unit,
        current_stock,
        min_stock,
        cost_per_unit,
        created_at,
        updated_at
    )
VALUES (
        'Kopi Arabika',
        'gram',
        5000,
        500,
        250,
        NOW(),
        NOW()
    );
-- Milk & Sweeteners
INSERT INTO ingredients (
        name,
        unit,
        current_stock,
        min_stock,
        cost_per_unit,
        created_at,
        updated_at
    )
VALUES (
        'Susu UHT',
        'gram',
        10000,
        1000,
        25,
        NOW(),
        NOW()
    );
INSERT INTO ingredients (
        name,
        unit,
        current_stock,
        min_stock,
        cost_per_unit,
        created_at,
        updated_at
    )
VALUES (
        'Susu Outside',
        'gram',
        10000,
        1000,
        30,
        NOW(),
        NOW()
    );
INSERT INTO ingredients (
        name,
        unit,
        current_stock,
        min_stock,
        cost_per_unit,
        created_at,
        updated_at
    )
VALUES ('Gula Aren', 'gram', 3000, 300, 50, NOW(), NOW());
INSERT INTO ingredients (
        name,
        unit,
        current_stock,
        min_stock,
        cost_per_unit,
        created_at,
        updated_at
    )
VALUES (
        'Gula Pasir',
        'gram',
        5000,
        500,
        15,
        NOW(),
        NOW()
    );
-- Packaging & Other
INSERT INTO ingredients (
        name,
        unit,
        current_stock,
        min_stock,
        cost_per_unit,
        created_at,
        updated_at
    )
VALUES ('Cup', 'pcs', 1000, 100, 500, NOW(), NOW());
INSERT INTO ingredients (
        name,
        unit,
        current_stock,
        min_stock,
        cost_per_unit,
        created_at,
        updated_at
    )
VALUES (
        'Air Mineral',
        'ml',
        50000,
        5000,
        1,
        NOW(),
        NOW()
    );
-- ========================================
-- 2. CREATE/UPDATE PRODUCTS
-- ========================================
-- Update existing product (Kopi Susu Gula Aren)
UPDATE products
SET name = 'Kopi Susu Gula Aren',
    category = 'Kopi Susu',
    price = 12000,
    sku = 'KSGA-001',
    description = 'Kopi dengan susu UHT dan gula aren',
    updated_at = NOW()
WHERE id = 1;
-- Insert other products
INSERT INTO products (
        name,
        category,
        price,
        cost,
        stock,
        sku,
        description,
        created_at,
        updated_at
    )
VALUES (
        'Kopi Hitam',
        'Kopi',
        8000,
        0,
        0,
        'KH-001',
        'Kopi hitam dengan pilihan robusta/blend/arabika',
        NOW(),
        NOW()
    );
INSERT INTO products (
        name,
        category,
        price,
        cost,
        stock,
        sku,
        description,
        created_at,
        updated_at
    )
VALUES (
        'Kopi Susu',
        'Kopi Susu',
        10000,
        0,
        0,
        'KS-001',
        'Kopi susu dengan pilihan robusta/blend/arabika',
        NOW(),
        NOW()
    );
INSERT INTO products (
        name,
        category,
        price,
        cost,
        stock,
        sku,
        description,
        created_at,
        updated_at
    )
VALUES (
        'Kopi Susu Outside',
        'Kopi Susu',
        11000,
        0,
        0,
        'KSO-001',
        'Kopi susu dengan susu outside',
        NOW(),
        NOW()
    );
-- ========================================
-- 3. DELETE EXISTING RECIPES (Clean Slate)
-- ========================================
DELETE FROM recipe_items
WHERE product_id IN (1, 2, 3, 4, 5);
-- ========================================
-- 4. CREATE RECIPES
-- ========================================
-- Recipe for: Kopi Susu Gula Aren (Product ID 1)
-- Kopi Robusta: 15g, Susu UHT: 90g, Gula Aren: 25g, Cup: 1 pcs, Air: 50ml
INSERT INTO recipe_items (
        product_id,
        ingredient_id,
        quantity,
        created_at,
        updated_at
    )
VALUES (
        1,
        (
            SELECT id
            FROM ingredients
            WHERE name = 'Kopi Robusta'
        ),
        15,
        NOW(),
        NOW()
    ),
    (
        1,
        (
            SELECT id
            FROM ingredients
            WHERE name = 'Susu UHT'
        ),
        90,
        NOW(),
        NOW()
    ),
    (
        1,
        (
            SELECT id
            FROM ingredients
            WHERE name = 'Gula Aren'
        ),
        25,
        NOW(),
        NOW()
    ),
    (
        1,
        (
            SELECT id
            FROM ingredients
            WHERE name = 'Cup'
        ),
        1,
        NOW(),
        NOW()
    ),
    (
        1,
        (
            SELECT id
            FROM ingredients
            WHERE name = 'Air Mineral'
        ),
        50,
        NOW(),
        NOW()
    );
-- Recipe for: Kopi Hitam (Product with SKU KH-001)
-- Kopi Robusta: 15g, Gula: 20g, Cup: 1 pcs, Air: 100ml
INSERT INTO recipe_items (
        product_id,
        ingredient_id,
        quantity,
        created_at,
        updated_at
    )
VALUES (
        (
            SELECT id
            FROM products
            WHERE sku = 'KH-001'
        ),
        (
            SELECT id
            FROM ingredients
            WHERE name = 'Kopi Robusta'
        ),
        15,
        NOW(),
        NOW()
    ),
    (
        (
            SELECT id
            FROM products
            WHERE sku = 'KH-001'
        ),
        (
            SELECT id
            FROM ingredients
            WHERE name = 'Gula Pasir'
        ),
        20,
        NOW(),
        NOW()
    ),
    (
        (
            SELECT id
            FROM products
            WHERE sku = 'KH-001'
        ),
        (
            SELECT id
            FROM ingredients
            WHERE name = 'Cup'
        ),
        1,
        NOW(),
        NOW()
    ),
    (
        (
            SELECT id
            FROM products
            WHERE sku = 'KH-001'
        ),
        (
            SELECT id
            FROM ingredients
            WHERE name = 'Air Mineral'
        ),
        100,
        NOW(),
        NOW()
    );
-- Recipe for: Kopi Susu (Product with SKU KS-001)
-- Kopi Robusta: 15g, Susu UHT: 90g, Cup: 1 pcs, Air: 50ml
INSERT INTO recipe_items (
        product_id,
        ingredient_id,
        quantity,
        created_at,
        updated_at
    )
VALUES (
        (
            SELECT id
            FROM products
            WHERE sku = 'KS-001'
        ),
        (
            SELECT id
            FROM ingredients
            WHERE name = 'Kopi Robusta'
        ),
        15,
        NOW(),
        NOW()
    ),
    (
        (
            SELECT id
            FROM products
            WHERE sku = 'KS-001'
        ),
        (
            SELECT id
            FROM ingredients
            WHERE name = 'Susu UHT'
        ),
        90,
        NOW(),
        NOW()
    ),
    (
        (
            SELECT id
            FROM products
            WHERE sku = 'KS-001'
        ),
        (
            SELECT id
            FROM ingredients
            WHERE name = 'Cup'
        ),
        1,
        NOW(),
        NOW()
    ),
    (
        (
            SELECT id
            FROM products
            WHERE sku = 'KS-001'
        ),
        (
            SELECT id
            FROM ingredients
            WHERE name = 'Air Mineral'
        ),
        50,
        NOW(),
        NOW()
    );
-- Recipe for: Kopi Susu Outside (Product with SKU KSO-001)
-- Kopi Robusta: 15g, Susu Outside: 90g, Cup: 1 pcs, Air: 50ml
INSERT INTO recipe_items (
        product_id,
        ingredient_id,
        quantity,
        created_at,
        updated_at
    )
VALUES (
        (
            SELECT id
            FROM products
            WHERE sku = 'KSO-001'
        ),
        (
            SELECT id
            FROM ingredients
            WHERE name = 'Kopi Robusta'
        ),
        15,
        NOW(),
        NOW()
    ),
    (
        (
            SELECT id
            FROM products
            WHERE sku = 'KSO-001'
        ),
        (
            SELECT id
            FROM ingredients
            WHERE name = 'Susu Outside'
        ),
        90,
        NOW(),
        NOW()
    ),
    (
        (
            SELECT id
            FROM products
            WHERE sku = 'KSO-001'
        ),
        (
            SELECT id
            FROM ingredients
            WHERE name = 'Cup'
        ),
        1,
        NOW(),
        NOW()
    ),
    (
        (
            SELECT id
            FROM products
            WHERE sku = 'KSO-001'
        ),
        (
            SELECT id
            FROM ingredients
            WHERE name = 'Air Mineral'
        ),
        50,
        NOW(),
        NOW()
    );
-- ========================================
-- 5. UPDATE PRODUCT COSTS (Based on Recipe)
-- ========================================
-- Update cost for all products based on their recipes
UPDATE products p
SET cost = COALESCE(
        (
            SELECT SUM(ri.quantity * i.cost_per_unit)
            FROM recipe_items ri
                JOIN ingredients i ON ri.ingredient_id = i.id
            WHERE ri.product_id = p.id
        ),
        0
    ),
    updated_at = NOW()
WHERE p.id IN (
        1,
        (
            SELECT id
            FROM products
            WHERE sku = 'KH-001'
        ),
        (
            SELECT id
            FROM products
            WHERE sku = 'KS-001'
        ),
        (
            SELECT id
            FROM products
            WHERE sku = 'KSO-001'
        )
    );
-- ========================================
-- 6. VERIFICATION QUERIES
-- ========================================
\ echo '========================================';
\ echo 'INGREDIENTS LIST';
\ echo '========================================';
SELECT id,
    name,
    current_stock,
    unit,
    min_stock,
    cost_per_unit
FROM ingredients
ORDER BY name;
\ echo '';
\ echo '========================================';
\ echo 'PRODUCTS WITH COST CALCULATION';
\ echo '========================================';
SELECT p.id,
    p.name as product_name,
    p.price,
    p.cost,
    (p.price - p.cost) as profit,
    ROUND((p.price - p.cost) / p.price * 100, 2) as profit_margin_pct,
    p.sku
FROM products p
WHERE p.id IN (
        1,
        (
            SELECT id
            FROM products
            WHERE sku = 'KH-001'
        ),
        (
            SELECT id
            FROM products
            WHERE sku = 'KS-001'
        ),
        (
            SELECT id
            FROM products
            WHERE sku = 'KSO-001'
        )
    )
ORDER BY p.name;
\ echo '';
\ echo '========================================';
\ echo 'RECIPE DETAILS FOR EACH PRODUCT';
\ echo '========================================';
SELECT p.name as product_name,
    i.name as ingredient_name,
    ri.quantity,
    i.unit,
    i.cost_per_unit,
    ROUND(ri.quantity * i.cost_per_unit, 2) as ingredient_cost
FROM products p
    JOIN recipe_items ri ON p.id = ri.product_id
    JOIN ingredients i ON ri.ingredient_id = i.id
WHERE p.id IN (
        1,
        (
            SELECT id
            FROM products
            WHERE sku = 'KH-001'
        ),
        (
            SELECT id
            FROM products
            WHERE sku = 'KS-001'
        ),
        (
            SELECT id
            FROM products
            WHERE sku = 'KSO-001'
        )
    )
ORDER BY p.name,
    i.name;