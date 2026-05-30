#!/bin/bash

# ========================================
# TEST RECIPE-BASED STOCK DEDUCTION
# ========================================
# This script tests the automatic stock deduction when a product is sold

echo "========================================="
echo "TESTING RECIPE-BASED STOCK DEDUCTION"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get JWT token (login as cashier)
echo -e "${BLUE}Step 1: Login as cashier...${NC}"
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"kasir","password":"12345"}' \
  | grep -o '"token":"[^"]*' | sed 's/"token":"//')

if [ -z "$TOKEN" ]; then
  echo -e "${YELLOW}Error: Failed to get token. Make sure backend is running and credentials are correct.${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Login successful${NC}"
echo ""

# Check stock BEFORE transaction
echo -e "${BLUE}Step 2: Check ingredient stock BEFORE transaction...${NC}"
psql -U postgres -h localhost -d singgah_pos -c "
SELECT 
    name, 
    current_stock, 
    unit 
FROM ingredients 
WHERE name IN ('Kopi Robusta', 'Susu UHT', 'Gula Aren', 'Cup', 'Air Mineral') 
ORDER BY name;
"
echo ""

# Create order for 2x Kopi Susu Gula Aren
echo -e "${BLUE}Step 3: Creating order for 2x Kopi Susu Gula Aren...${NC}"
ORDER_RESPONSE=$(curl -s -X POST http://localhost:8080/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "order_number": "TEST-'$(date +%s)'",
    "payment_method": "cash",
    "cashier_name": "Uqi",
    "items": [
      {
        "product_id": 1,
        "quantity": 2
      }
    ]
  }')

echo "$ORDER_RESPONSE"
echo ""

# Check if order was successful
if echo "$ORDER_RESPONSE" | grep -q "successfully"; then
  echo -e "${GREEN}✓ Order created successfully${NC}"
else
  echo -e "${YELLOW}⚠ Order may have failed. Check response above.${NC}"
fi
echo ""

# Check stock AFTER transaction
echo -e "${BLUE}Step 4: Check ingredient stock AFTER transaction...${NC}"
psql -U postgres -h localhost -d singgah_pos -c "
SELECT 
    name, 
    current_stock, 
    unit 
FROM ingredients 
WHERE name IN ('Kopi Robusta', 'Susu UHT', 'Gula Aren', 'Cup', 'Air Mineral') 
ORDER BY name;
"
echo ""

# Show expected vs actual deduction
echo -e "${BLUE}Step 5: Expected stock deduction for 2x Kopi Susu Gula Aren:${NC}"
echo "  - Kopi Robusta: 30 gram (15 × 2)"
echo "  - Susu UHT: 180 gram (90 × 2)"
echo "  - Gula Aren: 50 gram (25 × 2)"
echo "  - Cup: 2 pcs (1 × 2)"
echo "  - Air Mineral: 100 ml (50 × 2)"
echo ""

# Show recent stock mutations
echo -e "${BLUE}Step 6: Recent stock mutations (audit trail):${NC}"
docker exec -i singgah_postgres psql -U postgres -d singgah_pos -c "
SELECT 
    sm.created_at,
    i.name as ingredient,
    sm.type,
    sm.quantity,
    i.unit,
    sm.reference_id,
    sm.notes
FROM stock_mutations sm
JOIN ingredients i ON sm.ingredient_id = i.id
ORDER BY sm.created_at DESC
LIMIT 10;
"
echo ""

echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}TEST COMPLETE${NC}"
echo -e "${GREEN}=========================================${NC}"
