#!/bin/bash

# Setup database on existing PostgreSQL
# Run this with: sudo ./setup-db-postgres.sh

set -e

echo "=========================================="
echo "🔧 Setting up PostgreSQL Database"
echo "=========================================="
echo ""

# Create user and database
echo "Creating database user and database..."
sudo -u postgres psql << 'EOF'
-- Create user if doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'swarm_user') THEN
        CREATE USER swarm_user WITH PASSWORD 'swarm_pass_dev';
        RAISE NOTICE 'User swarm_user created';
    ELSE
        RAISE NOTICE 'User swarm_user already exists';
    END IF;
END
$$;

-- Create database if doesn't exist
SELECT 'CREATE DATABASE insta_swarm OWNER swarm_user'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'insta_swarm')\gexec

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE insta_swarm TO swarm_user;

\echo 'Database setup complete'
EOF

echo ""
echo "Creating database schema..."
sudo -u postgres psql -d insta_swarm -f init-db.sql

echo ""
echo "✅ Database setup complete!"
echo ""
echo "Testing connection..."
if PGPASSWORD=swarm_pass_dev psql -h localhost -U swarm_user -d insta_swarm -c "SELECT 1" > /dev/null 2>&1; then
    echo "✅ Connection successful!"
else
    echo "❌ Connection failed"
    exit 1
fi

echo ""
echo "Next step: npm run dev"
