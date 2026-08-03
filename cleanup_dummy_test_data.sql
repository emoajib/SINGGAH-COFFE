-- ===================================================
-- SCRIPT PEMBERSIHAN DATA DUMMY TESTING
-- Jalankan script ini untuk menghapus semua data uji coba
-- ===================================================

BEGIN;

-- 1. Hapus transaksi/pesanan dummy jika ada
-- (orders tidak punya kolom customer_email/notes; hapus lewat order_items yang merujuk produk dummy)
DELETE FROM order_items WHERE product_id IN (SELECT id FROM products WHERE sku LIKE 'DMY-%');
DELETE FROM orders WHERE id IN (
    SELECT DISTINCT oi.order_id FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    WHERE p.sku LIKE 'DMY-%'
);

-- 2. Hapus produk dummy
DELETE FROM products WHERE sku LIKE 'DMY-%' OR name LIKE '%(Dummy)%';

-- 3. Hapus bahan baku dummy
DELETE FROM ingredients WHERE name LIKE '%(Dummy)%';

COMMIT;
