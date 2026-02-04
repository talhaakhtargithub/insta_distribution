#!/bin/bash

# Instagram Swarm Backend Setup Script

set -e

echo "🚀 Instagram Swarm Backend Setup"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    echo "Please install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed${NC}"
    echo "Please install Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  No .env file found${NC}"
    echo "Creating .env from .env.example..."

    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}✓ Created .env file${NC}"
        echo -e "${YELLOW}⚠️  Please edit .env and update the values before proceeding${NC}"
        echo ""
        echo "Required changes:"
        echo "  - DB_PASSWORD (set a strong password)"
        echo "  - JWT_SECRET (set a long random string)"
        echo "  - ENCRYPTION_KEY (generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\")"
        echo ""
        read -p "Press Enter to continue after editing .env..."
    else
        echo -e "${RED}❌ .env.example not found${NC}"
        exit 1
    fi
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p logs uploads
echo -e "${GREEN}✓ Directories created${NC}"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Build TypeScript
echo ""
echo "🔨 Building TypeScript..."
npm run build
echo -e "${GREEN}✓ Build complete${NC}"

# Start Docker containers
echo ""
echo "🐳 Starting Docker containers..."
docker-compose up -d
echo -e "${GREEN}✓ Containers started${NC}"

# Wait for database to be ready
echo ""
echo "⏳ Waiting for database to be ready..."
sleep 5

# Run migrations
echo ""
echo "🗃️  Running database migrations..."
npm run migrate
echo -e "${GREEN}✓ Migrations complete${NC}"

# Success message
echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "🎉 Your Instagram Swarm Backend is ready!"
echo ""
echo "Next steps:"
echo "  1. Start the server: npm run dev"
echo "  2. Test the API: curl http://localhost:3000/health"
echo "  3. View logs: docker-compose logs -f"
echo ""
echo "API Documentation: http://localhost:3000"
echo ""
