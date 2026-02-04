#!/bin/bash

# Quick Start Script for Development

set -e

echo "🚀 Starting Instagram Swarm Backend (Development Mode)"
echo "======================================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  No .env file found, creating from example...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}✓ Created .env file${NC}"
    fi
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo -e "${GREEN}✓ Dependencies installed${NC}"
    echo ""
fi

# Check if Docker containers are running
if ! docker ps | grep -q insta-swarm-db; then
    echo "🐳 Starting Docker containers..."
    docker-compose up -d
    echo -e "${GREEN}✓ Containers started${NC}"
    echo ""

    # Wait for database
    echo "⏳ Waiting for database to be ready..."
    sleep 5

    # Run migrations
    echo "🗃️  Running migrations..."
    npm run migrate 2>/dev/null || echo -e "${YELLOW}⚠️  Migrations may have already run${NC}"
    echo ""
fi

# Check database connection
echo "🔍 Checking database connection..."
if docker exec insta-swarm-db pg_isready -U swarm_user > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Database is ready${NC}"
else
    echo -e "${RED}❌ Database is not ready${NC}"
    echo "Try: docker-compose restart"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ All systems ready!${NC}"
echo ""
echo "Starting development server..."
echo "API will be available at: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Start development server
npm run dev
