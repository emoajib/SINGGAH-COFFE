#!/bin/bash
# Deploy Fix Script — Shared Hosting (Rumahweb)
# Jalankan di server: bash deploy-fix.sh
# Atau copy paste baris per baris ke terminal SSH

set -e

echo "=== STEP 1: Kill semua proses lama ==="
pkill -9 -f singgah-pos-backend 2>/dev/null || true
pkill -9 -f start.sh 2>/dev/null || true
pkill -9 -f "backend.sh" 2>/dev/null || true
sleep 5

echo "=== STEP 2: Pastikan port 8080 bebas ==="
if lsof -ti:8080 >/dev/null 2>&1; then
    echo "Port 8080 masih dipakai, force kill..."
    kill -9 $(lsof -ti:8080) 2>/dev/null || true
    sleep 3
fi
echo "Port 8080 status: $(lsof -ti:8080 2>/dev/null && echo 'STILL USED' || echo 'FREE')"

echo "=== STEP 3: Verify deploy.tar.gz exists ==="
if [ ! -f /tmp/deploy.tar.gz ]; then
    echo "Downloading deploy.tar.gz..."
    curl -sSL -o /tmp/deploy.tar.gz https://github.com/username/singgah-pos/releases/latest/download/deploy.tar.gz
fi
ls -la /tmp/deploy.tar.gz

echo "=== STEP 4: Backup binary lama ==="
cp ~/singgah-pos/singgah-pos-backend ~/singgah-pos/singgah-pos-backend.bak 2>/dev/null || true

echo "=== STEP 5: Extract deploy.tar.gz ==="
cd ~/singgah-pos
tar xzf /tmp/deploy.tar.gz --overwrite
chmod +x singgah-pos-backend

echo "=== STEP 6: Verifikasi binary baru ==="
ls -la singgah-pos-backend
ls -la .htaccess

echo "=== STEP 7: Start backend TANPA start.sh ==="
export GOMAXPROCS=1
export GOMEMLIMIT=200MiB
nohup ./singgah-pos-backend > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

sleep 5

echo "=== STEP 8: Verifikasi ==="
echo "--- Health Check ---"
curl -s http://127.0.0.1:8080/health
echo ""
echo "--- Port Check ---"
lsof -i:8080 | head -5
echo "--- Process Check ---"
ps aux | grep singgah | grep -v grep

echo "=== STEP 9: Check profit-sharing routes ==="
curl -s http://127.0.0.1:8080/debug/vars 2>/dev/null | head -5 || echo "(debug/vars not available, checking logs instead)"
grep -i "profit-sharing" /tmp/backend.log | head -3 || echo "(routes may not be logged)"

echo ""
echo "=== DONE ==="
echo "Backend should be running on port 8080"
echo "Test: curl http://127.0.0.1:8080/health"
echo "External: curl -I https://sosiomen.com"
echo ""
echo "If backend crashes, check logs: tail -50 /tmp/backend.log"
