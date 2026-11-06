# Plan Backlog — Singgah Coffee POS

Status: Monitoring 24–48 jam setelah deploy terakhir (commit f73cbbf).
Website normal. Item di bawah BELUM dikerjakan; jangan eksekusi tanpa staging test.

## Pending (berisiko tinggi — butuh staging)
- QR-01 lanjutan: validasi & pengurangan stok atomik di CreatePublicSelfOrder; pesan spesifik bahan habis; refresh katalog.
- OPS-02: blue/green release immutable (infra server).
- DB-01 lanjutan: migrasi berversi (expand/contract) — saat ini hanya disable AutoMigrate default.
- A9: kirim header X-Outlet-ID dari frontend + UI switch outlet (owner global).
- A10: gate role frontend (reports, integration, sales) lebih ketat.
- A11: outlet scoping pada InventoryUsecase.GetByID / GetStockHistory.
- A13: validasi Register role binding (route owner-gated, perlu cek).
- OPS-OFFLINE-01: sync data offline on reconnect (manager & kasir) — butuh spec antrean: scope (order, cash book, stok), prioritas, conflict resolution, retry/backoff, feedback UI. Tidak ada menu saat ini; hanya banner status di PosTerminal.

## Pending (risiko rendah — bisa dikerjakan nanti)
- QR-06 UI: pagination di FeedbackManagement (backend sudah support offset/limit).
- SEC-04: HttpOnly cookie / rate limit shared store / CORS exact.
- OPS-03: satukan UPLOADS_DIR.
- OPS-04/05: release gate + least privilege CI.
- QLT-01, OPS-06/07/08, SEC-05.

## Selesai (sudah deploy)
- SEC-01, FIN-01, FIN-02, OPS-01, DB-01 (minimal), QR-02, QR-03, QR-05, QR-07, QR-08, QR-01 (availability menu), QR-06 (wiring).
- DB-02 (C1/C2/C3), FIN-03 (D1), SEC-03 (G1/G2), QR-08 frontend (238478f).
- Audit A1–A8 (A1, A2 parsial, A3, A4, A5, A6, A7, A8).
- B1, B2, B3, B4; C1, C2, C3, C4; D1, D2, D3; E1, E2; G1, G2; I1.

## Aturan
- Jangan commit jika test gate gagal.
- Jangan deploy sebelum CI hijau.
- Jangan ubah barcode/QR lama (domain, path, token).
- Shared hosting: GOMAXPROCS=1, pool max 10, no go func per request.
