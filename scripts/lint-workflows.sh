#!/usr/bin/env bash
# Lint workflow GitHub Actions secara lokal (butuh Go, tanpa install tambahan).
# CI menjalankan versi & pin yang sama (lihat .github/workflows/main.yml).
# Pemakaian: ./scripts/lint-workflows.sh [file...]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

exec go run github.com/rhysd/actionlint/cmd/actionlint@v1.7.12 -no-color "$@"
