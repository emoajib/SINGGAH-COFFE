-- Audit data Singgah Coffee POS
-- Jalankan: mysql -u user -p db < scripts/audit-data.sql

SELECT 'stok_negatif' AS issue, COUNT(*) AS cnt FROM ingredients WHERE current_stock<0 OR kedai_stock<0 OR warehouse_stock<0;
SELECT 'stok_tidak_sinkron' AS issue, COUNT(*) AS cnt FROM ingredients WHERE current_stock <> (warehouse_stock + kedai_stock);
SELECT 'order_tanpa_item' AS issue, COUNT(*) AS cnt FROM orders o LEFT JOIN order_items oi ON oi.order_id=o.id WHERE oi.id IS NULL;
SELECT 'target_tanpa_produk' AS issue, COUNT(*) AS cnt FROM production_targets pt LEFT JOIN products p ON p.id=pt.product_id WHERE p.id IS NULL;
SELECT 'item_tanpa_produk' AS issue, COUNT(*) AS cnt FROM order_items oi LEFT JOIN products p ON p.id=oi.product_id WHERE p.id IS NULL;
