#!/bin/bash

# Start both Backend and Frontend
# This script starts everything you need

echo "=========================================="
echo "🚀 Starting InstaDistro Full Stack"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if database is set up
echo -e "${BLUE}Checking database...${NC}"
if PGPASSWORD=swarm_pass_dev psql -h localhost -U swarm_user -d insta_swarm -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Database connected${NC}"
else
    echo -e "${YELLOW}⚠️  Database not set up yet!${NC}"
    echo ""
    echo "Please run this first:"
    echo "  cd InstaDistro-Backend"
    echo "  sudo ./setup-db-postgres.sh"
    echo ""
    exit 1
fi

# Kill any existing processes
echo ""
echo -e "${BLUE}Cleaning up old processes...${NC}"
pkill -f "node.*dist/index.js" 2>/dev/null || true
pkill -f "tsx.*src/index.ts" 2>/dev/null || true
pkill -f "expo start" 2>/dev/null || true
sleep 2

# Start Backend
echo ""
echo -e "${BLUE}Starting Backend...${NC}"
cd /home/talha/Distribution_Mobile_App_MVP_For\ Instagram_Now/InstaDistro-Backend
npm run dev > backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Wait for backend to start
echo "Waiting for backend to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend is running on http://localhost:3000${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

if ! curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo ""
    echo -e "${YELLOW}⚠️  Backend may not have started properly${NC}"
    echo "Check backend.log for errors"
fi

# Start Frontend
echo ""
echo -e "${BLUE}Starting Frontend (Expo)...${NC}"
cd /home/talha/Distribution_Mobile_App_MVP_For\ Instagram_Now/InstaDistro
npm start > frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

echo ""
echo "=========================================="
echo -e "${GREEN}✅ Everything Started!${NC}"
echo "=========================================="
echo ""
echo "📱 Frontend (Expo):"
echo "   • Opening in a few seconds..."
echo "   • Scan QR code with Expo Go app"
echo "   • Or press 'w' for web browser"
echo "   • Logs: InstaDistro/frontend.log"
echo ""
echo "🔧 Backend API:"
echo "   • API: http://localhost:3000"
echo "   • Docs: http://localhost:3000/api-docs"
echo "   • Health: http://localhost:3000/health"
echo "   • Logs: InstaDistro-Backend/backend.log"
echo ""
echo "📊 Database:"
echo "   • PostgreSQL running on localhost:5432"
echo "   • Database: insta_swarm"
echo "   • User: swarm_user"
echo ""
echo "To stop all services:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "Or use: pkill -f 'tsx.*index.ts' && pkill -f 'expo start'"
echo "=========================================="
echo ""

# Follow frontend logs
echo "Following frontend logs (Ctrl+C to exit)..."
echo ""
tail -f /home/talha/Distribution_Mobile_App_MVP_For\ Instagram_Now/InstaDistro/frontend.log
