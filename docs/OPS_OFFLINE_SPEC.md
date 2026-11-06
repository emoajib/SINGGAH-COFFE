# OPS-OFFLINE-01 — Spec: Sync Data Offline on Reconnect

Status: Draft (belum diimplementasi). Target sprint terpisah.

## Scope antrean (fase 1)
- Order (create) — butuh idempotency key di backend (belum ada).
- Cash book sync (/cash-book/sync) — sudah idempoten.
- Stok mutasi — sudah idempoten (C4).

## Prioritas flush
1. Orders
2. Cash book sync
3. Stok mutasi manual

## Conflict resolution
- Idempotency key per mutasi (client UUID).
- Server menolak duplikat (no-op) — client hapus dari antrean.
- 4xx (selain 409) → tandai gagal, tidak retry otomatis.
- 5xx/network → retry backoff (1s,2s,4s,max 30s), max 5 percobaan lalu dead-letter.

## Storage
- IndexedDB (preferred) fallback localStorage. Key: offline_queue_v1.

## UX
- Banner Mode Offline di PosTerminal (sudah ada).
- Badge jumlah antrean di Header.
- Tombol manual Sinkronkan sekarang + toast.
- Auto-flush pada event online + saat app dibuka.

## Role
- Operasional sync: owner, manager, cashier.
- Backup push/pull tetap owner only.

## Risiko
- Rate limiter 300/min: batch flush dengan delay.
- Shared hosting: sequential flush di frontend (no goroutine per task).
