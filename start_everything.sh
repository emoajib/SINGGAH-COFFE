#!/bin/bash

echo "🚀 Starting Singgah Coffee POS System - All Services"
echo "======================================================"
echo ""

BASE_DIR="/Volumes/WORK/PROJECT PROTOTYPE/SISTEM MOKA POS SINGGAH COFFEE"
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
# Step 1: PostgreSQL
# ──────────────────────────────────────────────
echo "Step 1: PostgreSQL..."
if pg_isready -q 2>/dev/null; then
    echo "   ✅ PostgreSQL is running"
else
    echo "   ⚠️ PostgreSQL not running. Attempting to start..."
    brew services start postgresql@17 2>/dev/null || brew services start postgresql 2>/dev/null
    sleep 3
    if pg_isready -q 2>/dev/null; then
        echo "   ✅ PostgreSQL started"
    else
        echo "   ❌ Failed to start PostgreSQL. Please start it manually."
        echo "     Try: brew services start postgresql@17"
        exit 1
    fi
fi

# Create database if not exists
psql -U postgres -h localhost -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" 2>/dev/null | grep -q 1 \
    && echo "   ✅ Database '$DB_NAME' already exists" \
    || { createdb -U postgres -h localhost "$DB_NAME" 2>/dev/null && echo "   ✅ Database '$DB_NAME' created"; }

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

# ──────────────────────────────────────────────
# Step 4: Flutter Mobile App
# ──────────────────────────────────────────────
echo "Step 4: Flutter Mobile App..."
cd "$BASE_DIR/mobile-app"
echo "   📦 Getting Flutter dependencies..."
flutter pub get > "$LOG_DIR/flutter-pub.log" 2>&1
flutter run -d chrome > "$LOG_DIR/flutter-app.log" 2>&1 &
FLUTTER_PID=$!
echo "   ✅ Flutter App started (PID: $FLUTTER_PID)"

echo ""
echo "======================================================"
echo "  ✅ All services started!"
echo ""
echo "  📍 Service URLs:"
echo "     Backend API:    http://localhost:8080"
echo "     Web Dashboard:  http://localhost:5173"
echo "     Flutter App:    Opening in Chrome..."
echo "     PostgreSQL:     localhost:5432"
echo ""
echo "  📁 Log files: $LOG_DIR"
echo "  🛑 Press Ctrl+C to stop all services"
echo "======================================================"

wait
