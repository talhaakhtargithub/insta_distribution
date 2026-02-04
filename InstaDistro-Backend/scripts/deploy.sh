#!/bin/bash

# Instagram Swarm Backend Production Deployment Script

set -e

echo "🚀 Instagram Swarm Backend - Production Deployment"
echo "==================================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo -e "${RED}❌ No .env.production file found${NC}"
    echo "Please create .env.production from .env.production.example"
    exit 1
fi

# Load production environment
export $(cat .env.production | grep -v '^#' | xargs)

# Validate required environment variables
required_vars=("DB_PASSWORD" "JWT_SECRET" "ENCRYPTION_KEY")
missing_vars=()

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    echo -e "${RED}❌ Missing required environment variables:${NC}"
    printf '%s\n' "${missing_vars[@]}"
    exit 1
fi

# Validate ENCRYPTION_KEY length (should be 64 hex characters)
if [ ${#ENCRYPTION_KEY} -ne 64 ]; then
    echo -e "${RED}❌ ENCRYPTION_KEY must be 64 hex characters (32 bytes)${NC}"
    echo "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    exit 1
fi

echo -e "${GREEN}✓ Environment variables validated${NC}"

# Build Docker images
echo ""
echo "🐳 Building Docker images..."
docker-compose -f docker-compose.prod.yml build --no-cache
echo -e "${GREEN}✓ Images built${NC}"

# Stop existing containers
echo ""
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down
echo -e "${GREEN}✓ Containers stopped${NC}"

# Start new containers
echo ""
echo "🚀 Starting production containers..."
docker-compose -f docker-compose.prod.yml up -d
echo -e "${GREEN}✓ Containers started${NC}"

# Wait for services to be healthy
echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check health
echo ""
echo "🏥 Checking health..."
if curl -f http://localhost:${PORT:-3000}/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ API is healthy${NC}"
else
    echo -e "${RED}❌ API health check failed${NC}"
    echo "View logs with: docker-compose -f docker-compose.prod.yml logs api"
    exit 1
fi

# Success message
echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "🎉 Your Instagram Swarm Backend is live!"
echo ""
echo "Useful commands:"
echo "  View logs:    docker-compose -f docker-compose.prod.yml logs -f"
echo "  Stop:         docker-compose -f docker-compose.prod.yml down"
echo "  Restart:      docker-compose -f docker-compose.prod.yml restart"
echo "  Shell access: docker exec -it insta-swarm-api sh"
echo ""
echo "API URL: http://localhost:${PORT:-3000}"
echo ""
