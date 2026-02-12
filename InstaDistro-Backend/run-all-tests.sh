#!/bin/bash

# Complete Instagram Integration Test
# This script does EVERYTHING - start services, run backend, test Instagram

echo "=========================================="
echo "🚀 Complete Instagram Integration Test"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if running as sudo (for Docker)
if [ "$EUID" -ne 0 ]; then
   echo -e "${YELLOW}⚠️  This script needs sudo for Docker${NC}"
   echo "Run with: sudo ./run-all-tests.sh"
   exit 1
fi

echo -e "${BLUE}Step 1: Starting Docker services...${NC}"
docker-compose up -d
sleep 5
echo -e "${GREEN}✅ Docker services started${NC}"
echo ""

echo -e "${BLUE}Step 2: Running database migrations...${NC}"
npm run migrate
echo -e "${GREEN}✅ Database ready${NC}"
echo ""

echo -e "${BLUE}Step 3: Starting backend server...${NC}"
npm run dev > backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"
echo ""

# Wait for backend to start
echo "Waiting for backend to start..."
for i in {1..30}; do
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend is running${NC}"
        break
    fi
    echo -n "."
    sleep 1
done
echo ""

# Check if backend started
if ! curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${RED}❌ Backend failed to start${NC}"
    echo "Check backend.log for errors"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo ""
echo -e "${BLUE}Step 4: Running automated tests...${NC}"
npm test -- --no-coverage
echo ""

echo -e "${BLUE}Step 5: Testing Instagram integration...${NC}"
echo "This will prompt you for Instagram credentials"
echo ""

# Drop sudo for the test script (run as original user)
ORIGINAL_USER=$(who am i | awk '{print $1}')
sudo -u $ORIGINAL_USER ./quick-test.sh

# Cleanup
echo ""
echo -e "${BLUE}Cleaning up...${NC}"
kill $BACKEND_PID 2>/dev/null
echo -e "${GREEN}✅ Tests complete${NC}"
echo ""

echo "=========================================="
echo "📊 Test Summary"
echo "=========================================="
echo "Check the output above for results"
echo "Backend logs: backend.log"
echo "=========================================="
