#!/bin/bash

echo "🚀 Starting Singgah Coffee POS System - All Services"
echo "======================================================"
echo ""

BASE_DIR="/Volumes/PROTOTYPE/SISTEM MOKA POS SINGGAH COFFEE"
LOG_DIR="$BASE_DIR/logs"
DB_NAME="singgah_pos"

mkdir -p "$LOG_DIR"

cleanup() {
    echo ""
    echo "🛑 Shutting down all services..."
    kill $(jobs -p) 2>/dev/null
    wait $(jobs -p) 2>/dev/null
    echo "✅ All services stopped."
    exit 0
}

trap cleanup SIGINT SIGTERM

# ──────────────────────────────────────────────
# Step 1: MySQL
# ──────────────────────────────────────────────
echo "Step 1: MySQL..."
if mysqladmin -uroot -ppassword -h 127.0.0.1 ping 2>/dev/null | grep -q "alive" || mysql -u "$USER" -e "SELECT 1" 2>/dev/null | grep -q "1"; then
    echo "   ✅ MySQL is running"
else
    echo "   ⚠️ MySQL not running. Attempting to start (Homebrew)..."
    brew services start mysql 2>/dev/null || brew services start mariadb 2>/dev/null
    sleep 3
    if mysqladmin -uroot -ppassword -h 127.0.0.1 ping 2>/dev/null | grep -q "alive" || mysql -u "$USER" -e "SELECT 1" 2>/dev/null | grep -q "1"; then
        echo "   ✅ MySQL started"
    else
        echo "   ❌ Failed to start MySQL. Please start it manually."
        echo "     Try: brew services start mysql"
        exit 1
    fi
fi

# Create database if not exists
if mysql -uroot -ppassword -h 127.0.0.1 -e "CREATE DATABASE IF NOT EXISTS \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci" 2>/dev/null \
    || mysql -u "$USER" -e "CREATE DATABASE IF NOT EXISTS \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci" 2>/dev/null; then
    echo "   ✅ Database '$DB_NAME' is ready"
else
    echo "   ⚠️ Could not create database '$DB_NAME'. Create it manually if needed."
fi

echo ""

# ──────────────────────────────────────────────
# Step 2: Backend API (Go)
# ──────────────────────────────────────────────
echo "Step 2: Backend API..."
cd "$BASE_DIR/backend"

# Kill any existing backend process on port 8080
lsof -ti:8080 2>/dev/null | xargs kill -9 2>/dev/null

go run ./cmd/server/ > "$LOG_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
echo "   ✅ Backend API started (PID: $BACKEND_PID)"

echo ""
echo "   Waiting for backend API to be ready..."
for i in {1..30}; do
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/auth/login 2>/dev/null | grep -qE "404|401|200"; then
        echo "   ✅ Backend API ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "   ⚠️ Backend not responding after 60s, continuing anyway..."
        echo "   Check logs: $LOG_DIR/backend.log"
    fi
    sleep 2
done

echo ""

# ──────────────────────────────────────────────
# Step 3: Web Dashboard
# ──────────────────────────────────────────────
echo "Step 3: Web Dashboard..."
cd "$BASE_DIR/web-dashboard"
if [ ! -d "node_modules" ]; then
    echo "   📦 Installing npm dependencies..."
    npm install
fi
npm run dev > "$LOG_DIR/web-dashboard.log" 2>&1 &
WEB_PID=$!
echo "   ✅ Web Dashboard started (PID: $WEB_PID)"

echo ""
echo ""
echo "======================================================"
echo "  ✅ All services started!"
echo ""
echo "  📍 Service URLs:"
echo "     Backend API:    http://localhost:8080"
echo "     Web Dashboard:  http://localhost:3000"
echo "     MySQL:          localhost:3306"
echo ""
echo "  📁 Log files: $LOG_DIR"
echo "  🛑 Press Ctrl+C to stop all services"
echo "======================================================"

wait
