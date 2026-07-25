#!/bin/bash
cd "$(dirname "$0")"
export PORT=8080
export DATABASE_URL="host=localhost user=postgres password=password dbname=singgah_pos port=5432 sslmode=disable"
export JWT_SECRET="singgah-coffee-jwt-secret-key-production-2026"
export NODE_ENV=production
exec ./main