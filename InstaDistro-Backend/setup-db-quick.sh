#!/bin/bash

# Quick Database Setup Script
# Automatically detects and sets up the database

set -e

echo "=========================================="
echo "🔧 InstaDistro Database Quick Setup"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if port 5432 is in use
if lsof -Pi :5432 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Port 5432 is already in use${NC}"
    echo "Checking if it's PostgreSQL..."

    if systemctl is-active --quiet postgresql; then
        echo -e "${BLUE}System PostgreSQL is running${NC}"
        echo ""
        echo "Choose setup method:"
        echo "  1) Use Docker (recommended - fresh setup)"
        echo "  2) Use existing PostgreSQL"
        read -p "Enter choice (1 or 2): " CHOICE

        if [ "$CHOICE" = "1" ]; then
            echo ""
            echo -e "${BLUE}Stopping system PostgreSQL...${NC}"
            sudo systemctl stop postgresql
            echo -e "${GREEN}✓ Stopped${NC}"
        fi
    fi
fi

# Check choice
if [ "${CHOICE:-1}" = "1" ]; then
    echo ""
    echo -e "${BLUE}Setting up with Docker...${NC}"

    # Check Docker
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker not found${NC}"
        echo "Install Docker first: https://docs.docker.com/get-docker/"
        exit 1
    fi

    # Start containers
    echo "Starting Docker containers..."
    docker-compose up -d

    echo -e "${GREEN}✓ Containers started${NC}"
    echo ""
    echo "Waiting for database to initialize..."
    sleep 15

    # Check health
    if docker ps | grep -q insta-swarm-db; then
        echo -e "${GREEN}✓ Database is ready!${NC}"
    else
        echo -e "${RED}❌ Database container failed${NC}"
        docker-compose logs db
        exit 1
    fi

else
    echo ""
    echo -e "${BLUE}Setting up with existing PostgreSQL...${NC}"

    # Create user and database
    echo "Creating database user and database..."
    sudo -u postgres psql << 'EOF'
-- Create user if doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'swarm_user') THEN
        CREATE USER swarm_user WITH PASSWORD 'swarm_pass_dev';
    END IF;
END
$$;

-- Create database if doesn't exist
SELECT 'CREATE DATABASE insta_swarm OWNER swarm_user'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'insta_swarm')\gexec

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE insta_swarm TO swarm_user;
EOF

    echo -e "${GREEN}✓ User and database created${NC}"

    # Run schema
    echo "Creating database tables..."
    sudo -u postgres psql -U swarm_user -d insta_swarm -f init-db.sql > /dev/null 2>&1

    echo -e "${GREEN}✓ Schema created${NC}"
fi

# Test connection
echo ""
echo -e "${BLUE}Testing database connection...${NC}"
if PGPASSWORD=swarm_pass_dev psql -h localhost -U swarm_user -d insta_swarm -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Database connection successful!${NC}"
else
    echo -e "${RED}❌ Connection failed${NC}"
    exit 1
fi

# Done
echo ""
echo "=========================================="
echo -e "${GREEN}✅ Database Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Start backend: npm run dev"
echo "  2. Test Instagram: ./quick-test.sh"
echo ""
echo "Backend will be available at:"
echo "  • API: http://localhost:3000"
echo "  • Docs: http://localhost:3000/api-docs"
echo "  • Health: http://localhost:3000/health"
echo ""
