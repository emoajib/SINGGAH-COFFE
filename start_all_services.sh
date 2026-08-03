#!/bin/bash

echo "🚀 Starting Singgah Coffee POS System..."
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Navigate to project directory
cd "/Volumes/PROTOTYPE/SISTEM MOKA POS SINGGAH COFFEE"

echo -e "${BLUE}Step 1: Stopping existing Docker containers...${NC}"
docker-compose down
echo ""

echo -e "${BLUE}Step 2: Starting Docker containers (Backend + Database)...${NC}"
docker-compose up -d --build
echo ""

echo -e "${YELLOW}Waiting for services to initialize (10 seconds)...${NC}"
sleep 10
echo ""

echo -e "${BLUE}Step 3: Checking Docker containers status...${NC}"
docker ps --filter "name=singgah" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

echo -e "${BLUE}Step 4: Testing Backend API...${NC}"
curl -s http://localhost:8080/api/auth/login -X POST -H "Content-Type: application/json" -d '{"email":"test","password":"test"}' | head -c 200
echo ""
echo ""

echo -e "${GREEN}✅ Docker services started!${NC}"
echo ""
echo "📍 Service URLs:"
echo "   - Backend API: http://localhost:8080"
echo "   - MySQL:        localhost:3307"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "   1. Open new terminal and run:"
echo "      cd '/Volumes/PROTOTYPE/SISTEM MOKA POS SINGGAH COFFEE/web-dashboard'"
echo "      npm run dev"
echo ""
echo "========================================"
