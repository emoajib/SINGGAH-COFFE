-- 1. INGREDIENTS (from Excel Master Bahan Baku, unit = small unit, cost_per_unit = per small unit)
INSERT INTO ingredients (name, unit, current_stock, min_stock, cost_per_unit, outlet_id, created_at, updated_at) VALUES ('Kopi Robusta Bubuk/Biji', 'gram', 0, 0, 126, 1, NOW(), NOW());
INSERT INTO ingredients (name, unit, current_stock, min_stock, cost_per_unit, outlet_id, created_at, updated_at) VALUES ('Kopi Blend Bubuk/Biji', 'gram', 0, 0, 200, 1, NOW(), NOW());
INSERT INTO ingredients (name, unit, current_stock, min_stock, cost_per_unit, outlet_id, created_at, updated_at) VALUES ('Susu Full Cream UHT', 'ml', 0, 0, 22, 1, NOW(), NOW());
INSERT INTO ingredients (name, unit, current_stock, min_stock, cost_per_unit, outlet_id, created_at, updated_at) VALUES ('Gula Aren Cair (Palm Sugar Syrup)', 'ml', 0, 0, 35, 1, NOW(), NOW());
INSERT INTO ingredients (name, unit, current_stock, min_stock, cost_per_unit, outlet_id, created_at, updated_at) VALUES ('Gula Cair (Simple Syrup)', 'ml', 0, 0, 15, 1, NOW(), NOW());
INSERT INTO ingredients (name, unit, current_stock, min_stock, cost_per_unit, outlet_id, created_at, updated_at) VALUES ('Garam Laut (Sea Salt)', 'gram', 0, 0, 20, 1, NOW(), NOW());
INSERT INTO ingredients (name, unit, current_stock, min_stock, cost_per_unit, outlet_id, created_at, updated_at) VALUES ('Bubuk Matcha', 'gram', 0, 0, 1170, 1, NOW(), NOW());
INSERT INTO ingredients (name, unit, current_stock, min_stock, cost_per_unit, outlet_id, created_at, updated_at) VALUES ('Es Batu', 'gram', 0, 0, 3, 1, NOW(), NOW());
INSERT INTO ingredients (name, unit, current_stock, min_stock, cost_per_unit, outlet_id, created_at, updated_at) VALUES ('Cup Plastik 12oz + Tutup', 'pcs', 0, 0, 850, 1, NOW(), NOW());
INSERT INTO ingredients (name, unit, current_stock, min_stock, cost_per_unit, outlet_id, created_at, updated_at) VALUES ('Sedotan', 'pcs', 0, 0, 100, 1, NOW(), NOW());
INSERT INTO ingredients (name, unit, current_stock, min_stock, cost_per_unit, outlet_id, created_at, updated_at) VALUES ('Sirup Butterscotch', 'ml', 0, 0, 48, 1, NOW(), NOW());
INSERT INTO ingredients (name, unit, current_stock, min_stock, cost_per_unit, outlet_id, created_at, updated_at) VALUES ('Krimer Bubuk', 'gram', 0, 0, 55, 1, NOW(), NOW());
INSERT INTO ingredients (name, unit, current_stock, min_stock, cost_per_unit, outlet_id, created_at, updated_at) VALUES ('Susu Oat (Oatside Barista Blend)', 'ml', 0, 0, 38, 1, NOW(), NOW());
INSERT INTO ingredients (name, unit, current_stock, min_stock, cost_per_unit, outlet_id, created_at, updated_at) VALUES ('Susu Kental Manis (SKM)', 'ml', 0, 0, 20, 1, NOW(), NOW());

-- 2. PRODUCTS (name/category/price/sku from Excel, cost recalculated from recipe)
INSERT INTO products (name, category, price, cost, stock, sku, description, created_at, updated_at) VALUES ('Kopsu Gula Aren', 'Kopi Susu', 14500, 0, 0, 'KGA-001', 'Kopi robusta, susu full cream, krimer, gula aren cair', NOW(), NOW());
INSERT INTO products (name, category, price, cost, stock, sku, description, created_at, updated_at) VALUES ('Kopsu Original', 'Kopi Susu', 14000, 0, 0, 'KOR-001', 'Kopi robusta, susu full cream, krimer, SKM', NOW(), NOW());
INSERT INTO products (name, category, price, cost, stock, sku, description, created_at, updated_at) VALUES ('Americano (Es)', 'Kopi Susu', 9000, 0, 0, 'AME-001', 'Kopi robusta es dengan simple syrup', NOW(), NOW());
INSERT INTO products (name, category, price, cost, stock, sku, description, created_at, updated_at) VALUES ('Cappuccino (Panas)', 'Kopi Susu', 15000, 0, 0, 'CAP-001', 'Kopi blend panas dengan susu dan krimer', NOW(), NOW());
INSERT INTO products (name, category, price, cost, stock, sku, description, created_at, updated_at) VALUES ('Matcha', 'Non-Kopi', 22000, 0, 0, 'MAT-001', 'Matcha dengan susu dan simple syrup', NOW(), NOW());
INSERT INTO products (name, category, price, cost, stock, sku, description, created_at, updated_at) VALUES ('Kopsu Singgah Aren', 'Kopi Susu', 17000, 0, 0, 'KSA-001', 'Kopi blend, susu, krimer, gula aren, sea salt', NOW(), NOW());
INSERT INTO products (name, category, price, cost, stock, sku, description, created_at, updated_at) VALUES ('Butterscotch Latte', 'Kopi Susu', 17000, 0, 0, 'BSL-001', 'Kopi blend, susu, krimer, sirup butterscotch', NOW(), NOW());
INSERT INTO products (name, category, price, cost, stock, sku, description, created_at, updated_at) VALUES ('Kopsu Singgah', 'Kopi Susu', 16000, 0, 0, 'KSS-001', 'Kopi blend, susu, krimer, SKM', NOW(), NOW());
INSERT INTO products (name, category, price, cost, stock, sku, description, created_at, updated_at) VALUES ('Oatside Signature', 'Kopi Susu', 15500, 0, 0, 'OSS-001', 'Kopi blend dengan susu oat dan SKM', NOW(), NOW());
INSERT INTO products (name, category, price, cost, stock, sku, description, created_at, updated_at) VALUES ('Oatside Signature Gula Aren', 'Kopi Susu', 16500, 0, 0, 'OSG-001', 'Kopi blend dengan susu oat dan gula aren', NOW(), NOW());

-- 3. RECIPE ITEMS (per product, joined by sku / ingredient name)
INSERT INTO recipe_items (product_id, ingredient_id, quantity, created_at, updated_at) VALUES
    ((SELECT id FROM products WHERE sku = 'KGA-001'), (SELECT id FROM ingredients WHERE name = 'Kopi Robusta Bubuk/Biji'), 15, NOW(), NOW()),
    ((SELECT id FROM products WHERE sku = 'KGA-001'), (SELECT id FROM ingredients WHERE name = 'Susu Full Cream UHT'), 100, NOW(), NOW()),
    ((SELECT id FROM products WHERE sku = 'KGA-001'), (SELECT id FROM ingredients WHERE name = 'Krimer Bubuk'), 25, NOW(), NOW()),
    ((SELECT id FROM products WHERE sku = 'KGA-001'), (SELECT id FROM ingredients WHERE name = 'Gula Aren Cair (Palm Sugar Syrup)'), 30, NOW(), NOW()),
    ((SELECT id FROM products WHERE sku = 'KGA-001'), (SELECT id FROM ingredients WHERE name = 'Es Batu'), 100, NOW(), NOW()),
    ((SELECT id FROM products WHERE sku = 'KGA-001'), (SELECT id FROM ingredients WHERE name = 'Cup Plastik 12oz + Tutup'), 1, NOW(), NOW()),
    ((SELECT id FROM products WHERE sku = 'KGA-001'), (SELECT id FROM ingredients WHERE name = 'Sedotan'), 1, NOW(), NOW());
INSERT INTO recipe_items (product_id, ingredient_id, quantity, created_at, updated_at) VALUES
    ((SELECT id FROM products WHERE sku = 'KOR-001'), (SELECT id FROM ingredients WHERE name = 'Kopi Robusta Bubuk/Biji'), 15, NOW(), NOW()),
    ((SELECT id FROM products WHERE sku = 'KOR-001'), (SELECT id FROM ingredients WHERE name = 'Susu Full Cream UHT'), 100, NOW(), NOW()),
    ((SELECT id FROM products WHERE sku = 'KOR-001'), (SELECT id FROM ingredients WHERE name = 'Krimer Bubuk'), 25, NOW(), NOW()),
    ((SELECT id FROM products WHERE sku = 'KOR-001'), (SELECT id FROM ingredients WHERE name = 'Susu Kental Manis (SKM)'), 25, NOW(), NOW()),
    ((SELECT id FROM products WHERE sku = 'KOR-001'), (SELECT id FROM ingredients WHERE name = 'Es Batu'), 100, NOW(), NOW()),
    ((SELECT id FROM products WHERE sku = 'KOR-001'), (SELECT id FROM ingredients WHERE name = 'Cup Plastik 12oz + Tutup'), 1, NOW(), NOW()),
    ((SELECT id FROM products WHERE sku = 'KOR-001'), (SELECT id FROM ingredients WHERE name = 'Sedotan'), 1, NOW(), NOW());
INSERT INTO recipe_items (product_id, ingredient_id, quantity, created_at, updated_at) VALUES
    ((SELECT id FROM products WHERE sku = 'AME-001'), (SELECT id FROM ingredients WHERE name = 'Kopi Robusta Bubuk/Biji'), 15, NOW(), NOW()),
    ((SELECT id FROM products WHERE sku = 'AME-001'), (SELECT id FROM ingredients WHERE name = 'Gula Cair (Simple Syrup)'), 10, NOW(), NOW()),
    ((SELECT id FROM products WHERE sku = 'AME-001'), (SELECT id FROM ingredients WHERE name = 'Es Batu'), 100, NOW(), NOW()),
    ((SELECT id FROM products WHERE sku = 'AME-001'), (SELECT id FROM ingredients WHERE name = 'Cup Plastik 12oz + Tutup'), 1, NOW(), NOW()),
    ((SELECT id FROM products WHERE sku = 'AME-001'), (SELECT id FROM ingredients WHERE name = 'Sedotan'), 1, NOW(), NOW());
INSERT INTO recipe_items (product_id, ingredient_id, quantity, created_at, updated_at) VALUES
    ((SELECT id FROM products WHERE sku = 'CAP-001'), (SELECT id FROM ingredients WHERE name = 'Kopi Blend Bubuk/Biji'), 18, NOW(), NOW()),
    ((SELECT id FROM products WHERE sku = 'CAP-001'), (SELECT id FROM ingredients WHERE name = 'Susu Full Cream UHT'), 100, NOW(), NOW()),
    ((SELECT id FROM products WHERE sku = 'CAP-001'), (SELECT id FROM ingredients WHERE name = 'Krimer Bubuk'), 25, NOW(), NOW()),
    ((SELECT id FROM products WHERE sku = 'CAP-001'), (SELECT id FROM ingredients WHERE name = 'Cup Plastik 12oz + Tutup'), 1, NOW(), NOW());
INSERT INTO recipe_items (product_id, ingredient_id, quantity, created_at, updated_at) VALUES
    ((SELECT id FROM products WHERE sku = 'MAT-001'), (SELECT id FROM ingredients WHERE name = 'Bubuk Matcha'), 8, NOW(), NOW()),
    ((SELECT id FROM products WHERE sku = 'MAT-001'), (SELECT id FROM ingredients WHERE name = 'Susu Full Cream UHT'), 100, NOW(), NOW()),
    ((SELECT id FROM products WHERE sku = 'MAT-001'), (SELECT id FROM ingredients WHERE name = 'Krimer Bubuk'), 10, NOW(), NOW()),
    ((SELECT id FROM products WHERE sku = 'MAT-001'), (SELECT id FROM ingredients WHERE name = 'Gula Cair (Simple Syrup)'), 20, NOW(), NOW()),
    ((SELECT id FROM products WHERE sku = 'MAT-001'), (SELECT id FROM ingredients WHERE name = 'Es Batu'), 100, NOW(), NOW()),
    ((SELECT id FROM products WHERE sku = 'MAT-001'), (SELECT id FROM ingredients WHERE name = 'Cup Plastik 12oz + Tutup'), 1, NOW(), NOW()),
    ((SELECT id FROM products WHERE sku = 'MAT-001'), (SELECT id FROM ingredients WHERE name = 'Sedotan'), 1, NOW(), NOW());
INSERT INTO recipe_items (product_id, ingredient_id, quantity, created_at, updated_at) VALUES
    ((SELECT id FROM products WHERE sku = 'KSA-001'), (SELECT id FROM ingredients WHERE name = 'Kopi Blend Bubuk/Biji'), 18, NOW(), NOW()),
    ((SELECT id FROM products WHERE sku = 'KSA-001'), (SELECT id FROM ingredients WHERE name = 'Susu Full Cream UHT'), 100, NOW(), NOW()),
    ((SELECT id FROM products WHERE sku = 'KSA-001'), (SELECT id FROM ingredients WHERE name = 'Krimer Bubuk'), 25, NOW(), NOW()),
    ((SELECT id FROM products WHERE sku = 'KSA-001'), (SELECT id FROM ingredients WHERE name = 'Gula Aren Cair (Palm Sugar Syrup)'), 30, NOW(), NOW()),
    ((SELECT id FROM products WHERE sku = 'KSA-001'), (SELECT id FROM ingredients WHERE name = 'Garam Laut (Sea Salt)'), 1, NOW(), NOW()),
    ((SELECT id FROM products WHERE sku = 'KSA-001'), (SELECT id FROM ingredients WHERE name = 'Es Batu'), 100, NOW(), NOW()),
    ((SELECT id FROM products WHERE sku = 'KSA-001'), (SELECT id FROM ingredients WHERE name = 'Cup Plastik 12oz + Tutup'), 1, NOW(), NOW()),
    ((SELECT id FROM products WHERE sku = 'KSA-001'), (SELECT id FROM ingredients WHERE name = 'Sedotan'), 1, NOW(), NOW());
INSERT INTO recipe_items (product_id, ingredient_id, quantity, created_at, updated_at) VALUES
    ((SELECT id FROM products WHERE sku = 'BSL-001'), (SELECT id FROM ingredients WHERE name = 'Kopi Blend Bubuk/Biji'), 18, NOW(), NOW()),
    ((SELECT id FROM products WHERE sku = 'BSL-001'), (SELECT id FROM ingredients WHERE name = 'Susu Full Cream UHT'), 100, NOW(), NOW()),
    ((SELECT id FROM products WHERE sku = 'BSL-001'), (SELECT id FROM ingredients WHERE name = 'Krimer Bubuk'), 25, NOW(), NOW()),
    ((SELECT id FROM products WHERE sku = 'BSL-001'), (SELECT id FROM ingredients WHERE name = 'Sirup Butterscotch'), 25, NOW(), NOW()),
    ((SELECT id FROM products WHERE sku = 'BSL-001'), (SELECT id FROM ingredients WHERE name = 'Es Batu'), 100, NOW(), NOW()),
    ((SELECT id FROM products WHERE sku = 'BSL-001'), (SELECT id FROM ingredients WHERE name = 'Cup Plastik 12oz + Tutup'), 1, NOW(), NOW()),
    ((SELECT id FROM products WHERE sku = 'BSL-001'), (SELECT id FROM ingredients WHERE name = 'Sedotan'), 1, NOW(), NOW());
INSERT INTO recipe_items (product_id, ingredient_id, quantity, created_at, updated_at) VALUES
    ((SELECT id FROM products WHERE sku = 'KSS-001'), (SELECT id FROM ingredients WHERE name = 'Kopi Blend Bubuk/Biji'), 18, NOW(), NOW()),
    ((SELECT id FROM products WHERE sku = 'KSS-001'), (SELECT id FROM ingredients WHERE name = 'Susu Full Cream UHT'), 100, NOW(), NOW()),
    ((SELECT id FROM products WHERE sku = 'KSS-001'), (SELECT id FROM ingredients WHERE name = 'Krimer Bubuk'), 25, NOW(), NOW()),
    ((SELECT id FROM products WHERE sku = 'KSS-001'), (SELECT id FROM ingredients WHERE name = 'Susu Kental Manis (SKM)'), 20, NOW(), NOW()),
    ((SELECT id FROM products WHERE sku = 'KSS-001'), (SELECT id FROM ingredients WHERE name = 'Es Batu'), 100, NOW(), NOW()),
    ((SELECT id FROM products WHERE sku = 'KSS-001'), (SELECT id FROM ingredients WHERE name = 'Cup Plastik 12oz + Tutup'), 1, NOW(), NOW()),
    ((SELECT id FROM products WHERE sku = 'KSS-001'), (SELECT id FROM ingredients WHERE name = 'Sedotan'), 1, NOW(), NOW());
INSERT INTO recipe_items (product_id, ingredient_id, quantity, created_at, updated_at) VALUES
    ((SELECT id FROM products WHERE sku = 'OSS-001'), (SELECT id FROM ingredients WHERE name = 'Kopi Blend Bubuk/Biji'), 15, NOW(), NOW()),
    ((SELECT id FROM products WHERE sku = 'OSS-001'), (SELECT id FROM ingredients WHERE name = 'Susu Oat (Oatside Barista Blend)'), 100, NOW(), NOW()),
    ((SELECT id FROM products WHERE sku = 'OSS-001'), (SELECT id FROM ingredients WHERE name = 'Susu Kental Manis (SKM)'), 20, NOW(), NOW()),
    ((SELECT id FROM products WHERE sku = 'OSS-001'), (SELECT id FROM ingredients WHERE name = 'Es Batu'), 100, NOW(), NOW()),
    ((SELECT id FROM products WHERE sku = 'OSS-001'), (SELECT id FROM ingredients WHERE name = 'Cup Plastik 12oz + Tutup'), 1, NOW(), NOW()),
    ((SELECT id FROM products WHERE sku = 'OSS-001'), (SELECT id FROM ingredients WHERE name = 'Sedotan'), 1, NOW(), NOW());
INSERT INTO recipe_items (product_id, ingredient_id, quantity, created_at, updated_at) VALUES
    ((SELECT id FROM products WHERE sku = 'OSG-001'), (SELECT id FROM ingredients WHERE name = 'Kopi Blend Bubuk/Biji'), 15, NOW(), NOW()),
    ((SELECT id FROM products WHERE sku = 'OSG-001'), (SELECT id FROM ingredients WHERE name = 'Susu Oat (Oatside Barista Blend)'), 100, NOW(), NOW()),
    ((SELECT id FROM products WHERE sku = 'OSG-001'), (SELECT id FROM ingredients WHERE name = 'Gula Aren Cair (Palm Sugar Syrup)'), 30, NOW(), NOW()),
    ((SELECT id FROM products WHERE sku = 'OSG-001'), (SELECT id FROM ingredients WHERE name = 'Es Batu'), 100, NOW(), NOW()),
    ((SELECT id FROM products WHERE sku = 'OSG-001'), (SELECT id FROM ingredients WHERE name = 'Cup Plastik 12oz + Tutup'), 1, NOW(), NOW()),
    ((SELECT id FROM products WHERE sku = 'OSG-001'), (SELECT id FROM ingredients WHERE name = 'Sedotan'), 1, NOW(), NOW());

-- 4. RECALC products.cost = food cost from recipe (matches Excel)
UPDATE products p SET cost = COALESCE((SELECT SUM(ri.quantity * i.cost_per_unit) FROM recipe_items ri JOIN ingredients i ON ri.ingredient_id = i.id WHERE ri.product_id = p.id), 0), updated_at = NOW();

-- 5. FIXED EXPENSES (from Excel BEP sheet, cost_type = fixed, current month)
INSERT INTO expenses (title, amount, category, cost_type, date, description, outlet_id, created_at, updated_at) VALUES ('Retribusi/Parkir Lokasi Jualan', 600000, 'Biaya Tetap', 'fixed', '2026-08-01 00:00:00', 'Estimasi Rp20.000/hari x 30 hari — sesuaikan dgn lokasi mangkal Anda', 1, NOW(), NOW());
INSERT INTO expenses (title, amount, category, cost_type, date, description, outlet_id, created_at, updated_at) VALUES ('Gaji/Upah Pemilik-Operator (diri sendiri)', 1.5e+06, 'Biaya Tetap', 'fixed', '2026-08-01 00:00:00', 'Upah kerja sendiri sebagai barista solo — WAJIB dihitung agar tidak "gratis kerja"', 1, NOW(), NOW());
INSERT INTO expenses (title, amount, category, cost_type, date, description, outlet_id, created_at, updated_at) VALUES ('BBM (Bensin) Mobil Kijang', 500000, 'Biaya Tetap', 'fixed', '2026-08-01 00:00:00', 'Estimasi mobilitas harian ke lokasi jualan', 1, NOW(), NOW());
INSERT INTO expenses (title, amount, category, cost_type, date, description, outlet_id, created_at, updated_at) VALUES ('Gas LPG + Listrik/Charge Alat', 200000, 'Biaya Tetap', 'fixed', '2026-08-01 00:00:00', 'Kompor/pemanas air, charge alat elektronik', 1, NOW(), NOW());
INSERT INTO expenses (title, amount, category, cost_type, date, description, outlet_id, created_at, updated_at) VALUES ('Penyusutan Peralatan & Kendaraan', 300000, 'Biaya Tetap', 'fixed', '2026-08-01 00:00:00', 'Mesin espresso portable, grinder, modifikasi mobil (disusutkan bulanan)', 1, NOW(), NOW());
INSERT INTO expenses (title, amount, category, cost_type, date, description, outlet_id, created_at, updated_at) VALUES ('Perawatan & Servis Kendaraan', 500000, 'Biaya Tetap', 'fixed', '2026-08-01 00:00:00', 'Servis rutin, ganti oli, dll', 1, NOW(), NOW());
INSERT INTO expenses (title, amount, category, cost_type, date, description, outlet_id, created_at, updated_at) VALUES ('Lain-lain / Tak Terduga (marketing, internet, dll)', 300000, 'Biaya Tetap', 'fixed', '2026-08-01 00:00:00', 'Media sosial, POS, kuota internet, dan tak terduga', 1, NOW(), NOW());
