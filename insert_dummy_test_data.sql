-- ===================================================
-- SCRIPT PENAMBAHAN DATA DUMMY TESTING TEMPORARY
-- Digunakan untuk Uji Coba Fitur Kasir & POS
-- ===================================================

BEGIN;

-- Insert Sample Categories & Products
INSERT INTO products (name, category, price, cost, stock, sku, description, image_url, created_at, updated_at)
VALUES 
  ('Es Kopi Singgah (Dummy)', 'Coffee', 22000, 8000, 100, 'DMY-KOP-01', 'Kopi Susu Gula Aren khas Singgah Coffee (Dummy)', 'https://images.unsplash.com/photo-1541167760496-162955ed8a9f?w=400', NOW(), NOW()),
  ('Americano Hot (Dummy)', 'Coffee', 18000, 5000, 50, 'DMY-KOP-02', 'Espresso double shot dengan air panas (Dummy)', 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400', NOW(), NOW()),
  ('Matcha Latte (Dummy)', 'Non-Coffee', 25000, 10000, 40, 'DMY-NCF-01', 'Pure Uji Matcha dengan Susu Segar (Dummy)', 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=400', NOW(), NOW()),
  ('Croissant Cokelat (Dummy)', 'Pastry', 20000, 9000, 25, 'DMY-PAS-01', 'Croissant mentega renyah isi cokelat melt (Dummy)', 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Insert Sample Ingredients
INSERT INTO ingredients (name, unit, current_stock, min_stock, cost_per_unit, created_at, updated_at)
VALUES 
  ('Biji Kopi House Blend (Dummy)', 'gram', 5000, 500, 180, NOW(), NOW()),
  ('Susu Fresh Milk (Dummy)', 'ml', 10000, 1000, 22, NOW(), NOW()),
  ('Sirup Gula Aren (Dummy)', 'ml', 2000, 200, 35, NOW(), NOW())
ON CONFLICT DO NOTHING;

COMMIT;
