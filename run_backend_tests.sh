#!/bin/bash

# Director's Protocol: Auto-Detect Environment
# --------------------------------------------

echo "🔍 Checking Environment..."

# Function to run tests inside Docker
run_in_docker() {
    echo "⚠️  Go not found locally. Switching to Docker environment (Safe Mode)..."
    echo "🐳 Starting ephemeral container for testing..."
    
    # We mount the backend directory to /app
    # We install build-base (gcc) because SQLite driver requires CGO
    docker run --rm \
        -v "$(pwd)/backend":/app \
        -w /app \
        golang:1.23-alpine \
        sh -c "echo '📦 Installing dependencies...'; apk add --no-cache build-base > /dev/null; go get gorm.io/driver/sqlite; echo '🧪 Running Tests...'; go test ./internal/services/... -v"
}

# Check if Go is installed
if ! command -v go &> /dev/null; then
    run_in_docker
else
    echo "✅ Go detected locally."
    cd backend

    # Check for SQLite driver
    if ! grep -q "gorm.io/driver/sqlite" go.mod; then
        echo "📦 Adding sqlite driver for testing..."
        go get gorm.io/driver/sqlite
    fi

    echo "🧪 Running Tests Locally..."
    go test ./internal/services/... -v
fi

echo "✅ Protocol Completed."
