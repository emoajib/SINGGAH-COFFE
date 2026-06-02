#!/bin/bash

echo " Checking Environment..."

run_in_docker() {
    echo " Go not found locally. Switching to Docker environment..."
    echo " Starting ephemeral container for testing..."

    docker run --rm \
        -v "$(pwd)/backend":/app \
        -w /app \
        golang:1.23-alpine \
        sh -c "echo ' Running Tests...'; go test ./internal/... -v"
}

if ! command -v go &> /dev/null; then
    run_in_docker
else
    echo " Go detected locally."
    cd backend
    echo " Running Tests Locally..."
    go test ./internal/... -v
fi

echo " Protocol Completed."
