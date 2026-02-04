# Fix Docker Permissions & Start Backend

## Quick Fix for Docker Permissions

Run these commands to fix Docker permissions:

```bash
# Add your user to docker group
sudo usermod -aG docker $USER

# Activate the changes (or logout/login)
newgrp docker

# Verify Docker works without sudo
docker ps
```

---

## Start Database & Redis (After fixing permissions)

```bash
# Navigate to project root
cd /home/talha/Distribution_Mobile_App_MVP_For\ Instagram_Now

# Start containers
docker-compose up -d

# Verify containers are running
docker ps
```

You should see:
- `insta-swarm-db` on port 5432
- `insta-swarm-redis` on port 6379

---

## Alternative: Use sudo (not recommended)

If you don't want to change permissions:

```bash
sudo docker-compose up -d
```

---

## Install Backend Dependencies & Start

```bash
# Navigate to backend
cd InstaDistro-Backend

# Install dependencies
npm install

# Run database migrations
npm run migrate

# Start development server
npm run dev
```

Backend will run at `http://localhost:3000`

---

## Verify Everything Works

### 1. Check Database
```bash
docker exec -it insta-swarm-db psql -U swarm_user -d insta_swarm -c "SELECT version();"
```

### 2. Check Redis
```bash
docker exec -it insta-swarm-redis redis-cli ping
```

Should return: `PONG`

### 3. Check Backend API
```bash
curl http://localhost:3000/health
```

Should return: `{"status":"ok","database":"connected","redis":"connected"}`

---

## Troubleshooting

### Containers won't start
```bash
# Check what's using port 5432 or 6379
sudo lsof -i :5432
sudo lsof -i :6379

# Stop conflicting services
sudo systemctl stop postgresql
sudo systemctl stop redis
```

### Reset everything
```bash
# Stop and remove all containers
docker-compose down -v

# Start fresh
docker-compose up -d
```

---

## Next: Run the Backend

Once Docker is working:
1. ✅ Containers running
2. ⏭️ `npm install` in backend
3. ⏭️ `npm run migrate` to create tables
4. ⏭️ `npm run dev` to start server
5. ⏭️ Connect mobile app!
