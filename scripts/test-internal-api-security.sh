#!/bin/bash

# Test script for internal API security
# Usage: ./test-internal-api-security.sh [domain]

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load environment variables
if [ -f .env ]; then
    source .env
fi

DOMAIN="${1:-https://stampchain.io}"
API_KEY="${INTERNAL_API_KEY:-missing}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Internal API Security Test Suite${NC}"
echo -e "${BLUE}Testing: $DOMAIN${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to test endpoint
test_endpoint() {
    local endpoint=$1
    local expected_status=$2
    local auth_header=$3
    local test_name=$4
    
    echo -e "${YELLOW}Testing: $test_name${NC}"
    echo "Endpoint: $endpoint"
    
    if [ -z "$auth_header" ]; then
        RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$DOMAIN$endpoint")
    else
        RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -H "$auth_header" "$DOMAIN$endpoint")
    fi
    
    HTTP_STATUS=$(echo "$RESPONSE" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
    BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS:/d' | head -n 1)
    
    if [ "$HTTP_STATUS" -eq "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS: Got expected HTTP $HTTP_STATUS${NC}"
    else
        echo -e "${RED}✗ FAIL: Got HTTP $HTTP_STATUS (expected $expected_status)${NC}"
        echo "Response: $BODY"
    fi
    echo ""
}

echo -e "${BLUE}=== Frontend-Accessible Endpoints ===${NC}"
echo "These should allow browser access from stampchain.io"
echo ""

# Test frontend endpoints without auth (should work from browser)
test_endpoint "/api/internal/fees" 200 "" "Fees endpoint (no auth)"
test_endpoint "/api/internal/btcPrice" 200 "" "BTC Price endpoint (no auth)"

# Test frontend endpoints with API key (should also work)
test_endpoint "/api/internal/fees" 200 "X-API-Key: $API_KEY" "Fees endpoint (with API key)"

echo -e "${BLUE}=== Backend-Only Endpoints ===${NC}"
echo "These should ONLY work with API key"
echo ""

# Test backend endpoints without auth (should fail)
test_endpoint "/api/internal/purge-creator-cache" 401 "" "Purge cache (no auth)"
test_endpoint "/api/internal/monitoring" 401 "" "Monitoring (no auth)"

# Test backend endpoints with API key (should work)
if [ "$API_KEY" != "missing" ]; then
    test_endpoint "/api/internal/monitoring?action=health" 200 "X-API-Key: $API_KEY" "Monitoring (with API key)"
else
    echo -e "${YELLOW}⚠ Skipping API key tests - INTERNAL_API_KEY not found in .env${NC}"
fi

echo -e "${BLUE}=== External Access Test ===${NC}"
echo "Testing if external domains are blocked"
echo ""

# Test with external origin header (should be blocked)
echo -e "${YELLOW}Testing: External origin header${NC}"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -H "Origin: https://evil.com" \
    -H "Referer: https://evil.com" \
    "$DOMAIN/api/internal/fees")
HTTP_STATUS=$(echo "$RESPONSE" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)

if [ "$HTTP_STATUS" -eq 403 ] || [ "$HTTP_STATUS" -eq 401 ]; then
    echo -e "${GREEN}✓ PASS: External access blocked (HTTP $HTTP_STATUS)${NC}"
else
    echo -e "${RED}✗ FAIL: External access allowed (HTTP $HTTP_STATUS)${NC}"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test Summary Complete${NC}"
echo -e "${BLUE}========================================${NC}"