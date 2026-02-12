# Database Setup Guide

## Current Issue

The backend is running but can't connect to PostgreSQL because the database user and database don't exist yet.

## Quick Setup (Recommended)

Since you have PostgreSQL already running on your system, you have **two options**:

---

## Option 1: Use Docker (Easiest)

This will create a fresh PostgreSQL in Docker with everything configured:

```bash
cd InstaDistro-Backend

# Stop system PostgreSQL first (to free port 5432)
sudo systemctl stop postgresql

# Start Docker containers
docker-compose up -d

# Wait 10 seconds for database to initialize
sleep 10

# Restart backend
npm run dev
```

The backend should now connect successfully!

---

## Option 2: Use Existing PostgreSQL

If you want to use your existing PostgreSQL installation:

```bash
# Create database user and database
sudo -u postgres psql << EOF
CREATE USER swarm_user WITH PASSWORD 'swarm_pass_dev';
CREATE DATABASE insta_swarm OWNER swarm_user;
GRANT ALL PRIVILEGES ON DATABASE insta_swarm TO swarm_user;
\c insta_swarm
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EOF

# Run the database schema
sudo -u postgres psql -U swarm_user -d insta_swarm -f init-db.sql

# Restart backend
npm run dev
```

---

## Verify Connection

After setup, test the connection:

```bash
# Check backend health
curl http://localhost:3000/health
```

**Expected response:**
```json
{
  "status": "ok",
  "database": "connected",
  "redis": "connected",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## Test Instagram Integration

Once the backend is connected, test with:

```bash
./quick-test.sh
```

This will:
1. ✅ Create an Instagram account in the database
2. ✅ Login to Instagram
3. ✅ Post your test.mp4 video
4. ✅ Return the media ID

---

## Credentials in .env

Your `.env` file is already configured correctly:

```bash
DB_HOST=localhost
DB_PORT=5432
DB_USER=swarm_user
DB_PASSWORD=swarm_pass_dev
DB_NAME=insta_swarm
```

These match the docker-compose.yml configuration.

---

## Where to Access the App

Once database is connected:

- **Backend API**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api-docs (Swagger UI)
- **Health Check**: http://localhost:3000/health
- **Account Management**: http://localhost:3000/api/accounts

---

## Testing Endpoints

```bash
# Health check
curl http://localhost:3000/health

# Create account (example)
curl -X POST http://localhost:3000/api/accounts \
  -H "Content-Type: application/json" \
  -H "x-user-id: test_user" \
  -d '{
    "username": "YOUR_INSTAGRAM_USERNAME",
    "password": "YOUR_INSTAGRAM_PASSWORD",
    "accountType": "personal"
  }'
```

---

## Troubleshooting

**Port 5432 already in use?**
```bash
# Check what's using port 5432
sudo lsof -i :5432

# If it's system PostgreSQL, stop it
sudo systemctl stop postgresql

# Then start Docker
docker-compose up -d
```

**Permission denied on Docker?**
```bash
sudo usermod -aG docker $USER
newgrp docker
```

**Can't connect to Docker daemon?**
```bash
sudo systemctl start docker
```

---

## Next Steps

1. Set up database (choose Option 1 or 2 above)
2. Restart backend: `npm run dev`
3. Test with: `./quick-test.sh`
4. Check your Instagram account for the posted video!

**Remember: Only use TEST Instagram accounts!** ⚠️
