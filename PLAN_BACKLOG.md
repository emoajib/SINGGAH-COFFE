# Plan Backlog — Singgah Coffee POS

Status: Monitoring 24–48 jam setelah deploy terakhir (commit 288753d).
Website normal. Item di bawah BELUM dikerjakan; jangan eksekusi tanpa staging test.

## Pending (berisiko tinggi — butuh staging)
- QR-01 lanjutan: validasi & pengurangan stok atomik di CreatePublicSelfOrder; pesan spesifik bahan habis; refresh katalog.
- DB-02: idempotency pembayaran (conditional update WHERE payment_status='Unpaid'; idempotency key webhook).
- FIN-03: propagasikan error sync Expense↔CashBook (transaksi sama).
- OPS-02: blue/green release immutable (infra server).
- DB-01 lanjutan: migrasi berversi (expand/contract) — saat ini hanya disable AutoMigrate default.

## Pending (risiko rendah — bisa dikerjakan nanti)
- QR-06 UI: pagination di FeedbackManagement (backend sudah support offset/limit).
- QR-08 frontend: batas karakter (rune) konsisten (backend sudah rune).
- SEC-03: validasi arsip backup (path traversal/symlink).
- SEC-04: HttpOnly cookie / rate limit shared store / CORS exact.
- OPS-03: satukan UPLOADS_DIR.
- OPS-04/05: release gate + least privilege CI.
- QLT-01, OPS-06/07/08, SEC-05.

## Selesai (sudah deploy)
- SEC-01, FIN-01, FIN-02, OPS-01, DB-01 (minimal), QR-02, QR-03, QR-05, QR-07, QR-08, QR-01 (availability menu), QR-06 (wiring).

## Aturan
- Jangan commit jika test gate gagal.
- Jangan deploy sebelum CI hijau.
- Jangan ubah barcode/QR lama (domain, path, token).
- Shared hosting: GOMAXPROCS=1, pool max 10, no go func per request.
