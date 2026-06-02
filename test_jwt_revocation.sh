#!/bin/bash

echo "Testing JWT Revocation Mechanism"
echo "================================"

# Start server in background
echo "Starting server..."
cd /Volumes/WORK/PROJECT\ PROTOTYPE/SISTEM\ MOKA\ POS\ SINGGAH\ COFFEE/backend
go run cmd/server/main.go &
SERVER_PID=$!

# Wait for server to start
sleep 3

# Test login
echo "Testing login..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@singgah.coffee","password":"admin"}')

echo "Login response: $LOGIN_RESPONSE"

# Extract token
TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
echo "Extracted token: $TOKEN"

if [ -z "$TOKEN" ]; then
  echo "ERROR: Failed to get token from login"
  kill $SERVER_PID
  exit 1
fi

# Test accessing protected endpoint with token
echo "Testing access to protected endpoint with token..."
PROTECTED_RESPONSE=$(curl -s -X GET http://localhost:8080/api/users \
  -H "Authorization: Bearer $TOKEN")

echo "Protected endpoint response: $PROTECTED_RESPONSE"

# Test logout
echo "Testing logout..."
LOGOUT_RESPONSE=$(curl -s -X POST http://localhost:8080/api/auth/logout \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "Logout response: $LOGOUT_RESPONSE"

# Test accessing protected endpoint after logout (should fail)
echo "Testing access to protected endpoint after logout (should fail)..."
PROTECTED_RESPONSE_AFTER_LOGOUT=$(curl -s -X GET http://localhost:8080/api/users \
  -H "Authorization: Bearer $TOKEN" \
  -w "%{http_code}")

echo "Protected endpoint response after logout: $PROTECTED_RESPONSE_AFTER_LOGOUT"

# Check if we got 401 Unauthorized
if [[ "$PROTECTED_RESPONSE_AFTER_LOGOUT" == *"401"* ]]; then
  echo "SUCCESS: JWT revocation is working correctly!"
else
  echo "FAILURE: JWT revocation is not working - token still valid after logout"
fi

# Cleanup
kill $SERVER_PID
echo "Server stopped."