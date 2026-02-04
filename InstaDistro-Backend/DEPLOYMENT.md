# Instagram Swarm Backend - Deployment Guide

Complete guide for deploying the Instagram Swarm Backend API to production.

---

## Quick Start (Localhost Development)

### 1. Prerequisites

- Docker & Docker Compose installed
- Node.js 20+ installed
- Git

### 2. Clone and Setup

```bash
# Clone repository
git clone git@github.com:talhaakhtargithub/insta_distribution.git
cd insta_distribution/InstaDistro-Backend

# Run setup script (recommended)
./scripts/setup.sh

# OR manual setup:
npm install
docker-compose up -d
npm run migrate
npm run dev
```

### 3. Test API

```bash
# Health check
curl http://localhost:3000/health

# Create account
curl -X POST http://localhost:3000/api/accounts \
  -H "Content-Type: application/json" \
  -H "x-user-id: user_1" \
  -d '{
    "username": "test_account",
    "password": "test_password",
    "accountType": "personal"
  }'
```

---

## Production Deployment

### Option 1: Docker Compose (Recommended)

**Step 1: Prepare Environment**

```bash
# Copy production environment template
cp .env.production.example .env.production

# Generate encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Edit .env.production and set:
# - DB_PASSWORD (strong password)
# - REDIS_PASSWORD (strong password)
# - JWT_SECRET (long random string)
# - ENCRYPTION_KEY (64 hex characters from above)
```

**Step 2: Deploy**

```bash
# Run deployment script
./scripts/deploy.sh

# OR manually:
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

**Step 3: Run Migrations**

```bash
docker exec -it insta-swarm-api node dist/db/migrate.js
```

**Step 4: Verify**

```bash
curl http://localhost:3000/health
```

---

### Option 2: VPS Deployment (DigitalOcean, AWS, etc.)

**Requirements:**
- Ubuntu 22.04+ server
- 4GB RAM minimum (8GB recommended for 100+ accounts)
- 50GB SSD storage

**Step 1: Server Setup**

```bash
# SSH into server
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Create app user
useradd -m -s /bin/bash swarm
usermod -aG docker swarm
```

**Step 2: Deploy Application**

```bash
# Switch to app user
su - swarm

# Clone repository
git clone git@github.com:talhaakhtargithub/insta_distribution.git
cd insta_distribution/InstaDistro-Backend

# Setup environment
cp .env.production.example .env.production
nano .env.production  # Edit with production values

# Deploy
./scripts/deploy.sh
```

**Step 3: Setup Reverse Proxy (Nginx)**

```bash
# Install Nginx
sudo apt install nginx -y

# Create Nginx config
sudo nano /etc/nginx/sites-available/insta-swarm
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site and SSL:

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/insta-swarm /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Install Certbot for SSL
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d api.yourdomain.com
```

**Step 4: Setup Process Manager (PM2)**

```bash
# Install PM2
npm install -g pm2

# Start with PM2
cd ~/insta_distribution/InstaDistro-Backend
pm2 start dist/index.js --name insta-swarm-api
pm2 save
pm2 startup
```

---

### Option 3: Cloud Platform Deployment

#### Heroku

```bash
# Install Heroku CLI
curl https://cli-assets.heroku.com/install.sh | sh

# Login
heroku login

# Create app
heroku create your-app-name

# Add PostgreSQL
heroku addons:create heroku-postgresql:mini

# Add Redis
heroku addons:create heroku-redis:mini

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your_secret_here
heroku config:set ENCRYPTION_KEY=your_64_char_key_here

# Deploy
git push heroku main

# Run migrations
heroku run npm run migrate
```

#### Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Link to project
railway link

# Deploy
railway up

# Set environment variables in Railway dashboard
```

#### Render

1. Connect GitHub repository to Render
2. Create new Web Service
3. Set build command: `npm install && npm run build`
4. Set start command: `npm start`
5. Add PostgreSQL database
6. Add Redis instance
7. Set environment variables in dashboard

---

## Environment Variables

### Required (Production)

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `production` |
| `PORT` | Server port | `3000` |
| `DB_HOST` | PostgreSQL host | `postgres` or `your-db-url` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_USER` | Database user | `swarm_user` |
| `DB_PASSWORD` | Database password | `strong_password_here` |
| `DB_NAME` | Database name | `insta_swarm` |
| `REDIS_HOST` | Redis host | `redis` or `your-redis-url` |
| `REDIS_PORT` | Redis port | `6379` |
| `REDIS_PASSWORD` | Redis password | `redis_password_here` |
| `JWT_SECRET` | JWT signing key | `long_random_string` |
| `JWT_EXPIRY` | JWT expiration | `24h` |
| `ENCRYPTION_KEY` | AES-256 key (64 hex chars) | Generate with crypto |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `FRONTEND_URL` | Frontend URL for CORS | - |
| `API_KEY` | Optional API key for extra security | - |
| `INSTAGRAM_CLIENT_ID` | Instagram Graph API client ID | - |
| `INSTAGRAM_CLIENT_SECRET` | Instagram Graph API secret | - |
| `SENTRY_DSN` | Sentry error tracking DSN | - |

---

## Security Best Practices

### 1. Strong Passwords

```bash
# Generate strong passwords
openssl rand -base64 32

# Generate encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Firewall Configuration

```bash
# Allow only necessary ports
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 3. Regular Updates

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Update Docker images
docker-compose pull
docker-compose up -d
```

### 4. Backup Strategy

```bash
# Backup database (run daily)
docker exec insta-swarm-postgres pg_dump -U swarm_user insta_swarm > backup_$(date +%Y%m%d).sql

# Restore from backup
docker exec -i insta-swarm-postgres psql -U swarm_user insta_swarm < backup_20240101.sql
```

---

## Monitoring & Maintenance

### View Logs

```bash
# API logs
docker-compose logs -f api

# Database logs
docker-compose logs -f postgres

# All logs
docker-compose logs -f

# Application logs (file-based)
tail -f logs/combined.log
tail -f logs/error.log
```

### Monitor Resources

```bash
# Container stats
docker stats

# Disk usage
df -h

# Memory usage
free -h

# CPU usage
top
```

### Health Checks

```bash
# Check API health
curl http://localhost:3000/health

# Check database
docker exec -it insta-swarm-postgres psql -U swarm_user -d insta_swarm -c "SELECT COUNT(*) FROM accounts;"

# Check Redis
docker exec -it insta-swarm-redis redis-cli ping
```

---

## Troubleshooting

### Issue: Containers won't start

```bash
# Check logs
docker-compose logs

# Check disk space
df -h

# Restart Docker
sudo systemctl restart docker
```

### Issue: Database connection failed

```bash
# Check database is running
docker ps | grep postgres

# Check connection
docker exec -it insta-swarm-postgres psql -U swarm_user -d insta_swarm

# Recreate database
docker-compose down -v
docker-compose up -d
npm run migrate
```

### Issue: Out of memory

```bash
# Check memory
free -h

# Restart containers
docker-compose restart

# Increase server RAM or optimize queries
```

### Issue: Rate limiting too strict

Edit `src/api/middlewares/rateLimit.middleware.ts` and adjust limits.

---

## Scaling for 100+ Accounts

### Horizontal Scaling

```yaml
# docker-compose.prod.yml
services:
  api:
    deploy:
      replicas: 3  # Run 3 instances

  worker:
    deploy:
      replicas: 5  # Run 5 worker instances
```

### Load Balancer (Nginx)

```nginx
upstream api_backend {
    least_conn;
    server localhost:3001;
    server localhost:3002;
    server localhost:3003;
}

server {
    listen 80;
    location / {
        proxy_pass http://api_backend;
    }
}
```

### Database Optimization

```sql
-- Add indexes for performance
CREATE INDEX idx_accounts_state ON accounts(account_state);
CREATE INDEX idx_accounts_status ON accounts(account_status);
CREATE INDEX idx_scheduled_posts_status ON scheduled_posts(status);
CREATE INDEX idx_scheduled_posts_next_attempt ON scheduled_posts(next_attempt_time);
```

---

## Cost Estimates (Monthly)

### 100 Accounts

- **VPS (DigitalOcean/Linode)**: $40-60/month (4GB RAM, 80GB SSD)
- **Proxies (residential)**: $100-200/month (100 proxies @ $1-2 each)
- **Domain & SSL**: $10-15/month
- **Monitoring (optional)**: $20/month
- **Total**: $170-295/month

### 500 Accounts

- **VPS (AWS EC2)**: $120-180/month (8GB RAM, 200GB SSD)
- **Database (RDS)**: $50/month
- **Proxies**: $500-1000/month
- **Load balancer**: $20/month
- **Total**: $690-1250/month

---

## Performance Optimization

### 1. Connection Pooling

Already configured in `src/config/database.ts`:
- Max connections: 20
- Idle timeout: 30s

### 2. Redis Caching

Cache frequently accessed data:
```typescript
// Cache account states for 5 minutes
await redis.set(`account:${id}`, JSON.stringify(account), 'EX', 300);
```

### 3. Query Optimization

Use batch operations:
```sql
-- Bad: Multiple queries
SELECT * FROM accounts WHERE id = 1;
SELECT * FROM accounts WHERE id = 2;

-- Good: Single batch query
SELECT * FROM accounts WHERE id IN (1, 2, 3, ...);
```

---

## Support & Documentation

- **GitHub**: https://github.com/talhaakhtargithub/insta_distribution
- **API Docs**: http://your-api-url/
- **Health Check**: http://your-api-url/health

---

## Next Steps After Deployment

1. ✅ Backend deployed and running
2. ⏭️ Connect mobile app to backend API
3. ⏭️ Implement Instagram API integration
4. ⏭️ Setup warmup automation
5. ⏭️ Add proxy management
6. ⏭️ Implement content variation engine
7. ⏭️ Deploy distribution engine

---

**Ready to deploy!** 🚀

For issues or questions, check the logs first:
```bash
docker-compose logs -f
tail -f logs/error.log
```
