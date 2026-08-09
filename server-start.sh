#!/bin/bash
cd "$(dirname "$0")/backend"
export PORT=8080
export DATABASE_URL="singgah:singgahpass123@tcp(localhost:3306)/singgah_pos?charset=utf8mb4&parseTime=True&loc=Local"
export JWT_SECRET="singgah-coffee-jwt-secret-key-production-2026"
export NODE_ENV=production
exec ./server