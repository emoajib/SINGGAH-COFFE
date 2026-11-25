-- Perbaiki current_stock = warehouse_stock + kedai_stock (aman: hanya update yang tidak sinkron)
UPDATE ingredients
SET current_stock = warehouse_stock + kedai_stock
WHERE current_stock <> (warehouse_stock + kedai_stock);

-- Clamp stok negatif ke 0 (opsional, review dulu)
-- UPDATE ingredients SET current_stock = GREATEST(current_stock,0), warehouse_stock = GREATEST(warehouse_stock,0), kedai_stock = GREATEST(kedai_stock,0)
-- WHERE current_stock < 0 OR warehouse_stock < 0 OR kedai_stock < 0;
