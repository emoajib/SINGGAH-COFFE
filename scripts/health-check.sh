#!/usr/bin/env bash
# Smoke test pasca-deploy: health + login (opsional).
set -u
BASE="${1:-http://localhost:8080}"
echo "== Health check: $BASE =="
curl -fsS "$BASE/health" && echo
echo "== Login smoke (opsional) =="
curl -s -X POST "$BASE/api/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"owner@singgah.coffee","password":"admin"}' | head -c 200
echo