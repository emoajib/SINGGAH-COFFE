#!/bin/bash

echo "=== Checking Docker Containers Status ==="
docker ps -a | grep singgah

echo -e "\n=== Checking Backend Container Logs ==="
docker logs singgah_api --tail 50

echo -e "\n=== Checking Database Container Logs ==="
docker logs singgah_postgres --tail 20

echo -e "\n=== Testing Backend Connectivity ==="
curl -v http://localhost:8080/api/auth/login 2>&1 | grep -E "Connected|HTTP|404|500"

echo -e "\n=== Checking Port Bindings ==="
lsof -i :8080 | head -10
