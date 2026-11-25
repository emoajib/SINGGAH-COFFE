# Changelog — Singgah Coffee POS

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]
### Added
- `docs/BUG_REGISTRY.md` — registry tunggal bug/temuan.
- `docs/POSTMORTEM_TEMPLATE.md` — template postmortem insiden.
- `CHANGELOG.md` — changelog terpusat.

### Changed
- Sinkronisasi versi Go (1.25) dan referensi usang di `AGENT.md`, `PROJECT_STATUS.md`, `known-issues.md`, `DEPLOY.md`.
- CI: lint workflow (actionlint) dijalankan di job backend; tag rilis memakai output step
  (`steps.sha.outputs.short`) alih-alih `env.SHORT_SHA` agar lolos validasi workflow.
- CI: hapus `setup-node` yang tidak terpakai di job constraint & backend (lebih cepat, tanpa noise).

## [2026-11] - Profit sharing multi-shift
### Fixed
- `fix(profit-sharing)`: aktifkan multi-shift untuk staf all-day yang punya attendance.

## [2026-10] - Infra & offline
### Added
- `feat(ops-offline-01)`: IndexedDB mirror, retry backoff, dead-letter.
- `feat(db-01)`: versioned migration runner scaffold.
### Fixed
- `fix(bagi-hasil)`: sinkronisasi kasbon pending barista.
- `fix`: hard-delete cash_book by reference.

## Catatan
- Rilis sebelumnya tercatat di git history (`git log`) dan `AUDIT_REPORT.md`.