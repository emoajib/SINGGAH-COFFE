-- OPS-OFFLINE-01: kolom kunci idempotensi untuk tabel orders.
-- Kolom dibuat NULL (bukan DEFAULT '') agar order tanpa idempotency key
-- tidak saling bentrok pada unique index, dan unique indexnya tetap valid.
ALTER TABLE orders ADD COLUMN idempotency_key VARCHAR(191) NULL DEFAULT NULL;
CREATE UNIQUE INDEX ux_orders_idempotency ON orders (idempotency_key);
