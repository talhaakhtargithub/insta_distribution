# Instagram Swarm Distribution API

Production-ready backend for managing 100+ Instagram accounts with automated posting, warmup protocols, content variation, and health monitoring.

---

## ⚡ Quick Start (One Command)

```bash
# Clone and start everything
git clone git@github.com:talhaakhtargithub/insta_distribution.git
cd insta_distribution/InstaDistro-Backend
./scripts/start-dev.sh
```

That's it! The script will:
- Install dependencies
- Start Docker containers (PostgreSQL + Redis)
- Run database migrations
- Start development server at `http://localhost:3000`

---

## 📋 Manual Setup

### Prerequisites

- Docker & Docker Compose
- Node.js 20+
- npm or yarn

### Step-by-Step

```bash
# 1. Install dependencies
npm install

# 2. Start databases
docker-compose up -d

# 3. Run migrations
npm run migrate

# 4. Start development server
npm run dev
```

### Test the API

```bash
# Health check
curl http://localhost:3000/health

# Create an account
curl -X POST http://localhost:3000/api/accounts \
  -H "Content-Type: application/json" \
  -H "x-user-id: user_1" \
  -d '{
    "username": "test_account",
    "password": "test_password",
    "accountType": "personal"
  }'

# List all accounts
curl http://localhost:3000/api/accounts \
  -H "x-user-id: user_1"
```

---

## 🚀 Production Deployment

### Quick Deploy

```bash
# Setup production environment
cp .env.production.example .env.production
# Edit .env.production with your values

# Deploy with one command
./scripts/deploy.sh
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete deployment guides:
- Docker Compose deployment
- VPS deployment (DigitalOcean, AWS, Linode)
- Cloud platform deployment (Heroku, Railway, Render)
- Scaling for 100+ accounts
- Security best practices

---

## 📡 API Documentation

### Base URL
```
Development: http://localhost:3000
Production: https://your-domain.com
```

### Authentication
Currently using `x-user-id` header for development. JWT authentication coming soon.

### Endpoints

#### Health Check
```bash
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "database": "connected",
  "uptime": 123.45,
  "environment": "development",
  "version": "1.0.0"
}
```

#### Accounts Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/accounts` | List all accounts (with optional ?state= filter) |
| POST | `/api/accounts` | Create new account |
| GET | `/api/accounts/:id` | Get account by ID |
| PUT | `/api/accounts/:id` | Update account |
| DELETE | `/api/accounts/:id` | Delete account |
| POST | `/api/accounts/:id/verify` | Verify Instagram credentials |
| POST | `/api/accounts/bulk-import` | Bulk import accounts from CSV |
| GET | `/api/accounts/stats/swarm` | Get swarm dashboard statistics |

**Create Account Example:**
```bash
POST /api/accounts
Content-Type: application/json
x-user-id: user_1

{
  "username": "instagram_username",
  "password": "instagram_password",
  "accountType": "personal",  // or "business"
  "proxyId": "optional_proxy_id"
}
```

**Bulk Import Example:**
```bash
POST /api/accounts/bulk-import
Content-Type: application/json
x-user-id: user_1

{
  "accounts": [
    {
      "username": "account1",
      "password": "password1",
      "account_type": "personal"
    },
    {
      "username": "account2",
      "password": "password2",
      "account_type": "business"
    }
  ]
}
```

**Swarm Statistics Example:**
```bash
GET /api/accounts/stats/swarm
x-user-id: user_1

Response:
{
  "stats": {
    "total": 100,
    "byState": {
      "NEW_ACCOUNT": 10,
      "WARMING_UP": 15,
      "ACTIVE": 70,
      "PAUSED": 3,
      "SUSPENDED": 2,
      "BANNED": 0
    },
    "byStatus": {
      "active": 85,
      "rate_limited": 10,
      "error": 5
    },
    "authenticated": 95,
    "withProxy": 100
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### Coming Soon

- `POST /api/schedules/one-time` - Schedule one-time post
- `POST /api/schedules/recurring` - Create recurring schedule
- `POST /api/swarm/distribute` - Distribute video to all accounts
- `POST /api/warmup/start/:id` - Start warmup protocol
- `POST /api/proxies/bulk-import` - Import proxies

---

## 🏗️ Project Structure

```
InstaDistro-Backend/
├── src/
│   ├── api/
│   │   ├── controllers/          # Request handlers
│   │   │   └── AccountController.ts
│   │   ├── routes/              # API routes
│   │   │   └── accounts.routes.ts
│   │   └── middlewares/         # Express middlewares
│   │       ├── rateLimit.middleware.ts
│   │       └── security.middleware.ts
│   ├── config/
│   │   ├── database.ts          # PostgreSQL connection
│   │   ├── env.ts               # Environment validation
│   │   └── logger.ts            # Winston logging
│   ├── db/
│   │   ├── migrations.sql       # Database schema
│   │   └── migrate.ts           # Migration runner
│   ├── services/
│   │   ├── auth/
│   │   │   └── EncryptionService.ts  # AES-256 encryption
│   │   └── swarm/
│   │       └── AccountService.ts     # Account business logic
│   └── index.ts                 # Express app entry point
├── scripts/
│   ├── setup.sh                 # Initial setup
│   ├── deploy.sh                # Production deployment
│   └── start-dev.sh             # Quick start development
├── logs/                        # Application logs
├── uploads/                     # Temporary video storage
├── Dockerfile                   # Production Docker image
├── docker-compose.yml           # Development containers
├── docker-compose.prod.yml      # Production containers
├── DEPLOYMENT.md                # Complete deployment guide
└── README.md                    # This file
```

---

## 🔐 Security Features

### ✅ Implemented

- **AES-256 Encryption**: Instagram passwords encrypted at rest
- **Security Headers**: Helmet.js with CSP, HSTS
- **Rate Limiting**: 100 req/15min general, stricter for auth
- **Input Sanitization**: XSS and NoSQL injection prevention
- **CORS**: Configurable allowed origins
- **Request Logging**: Winston with file rotation
- **Graceful Shutdown**: Proper cleanup of connections
- **Health Checks**: Docker health monitoring

### 🔜 Coming Soon

- JWT Authentication
- 2FA for admin access
- API key authentication
- Role-based access control (RBAC)

---

## 📊 Database Schema

### Tables Created

1. **accounts** - Instagram account credentials and states
2. **proxy_configs** - Proxy configurations and assignments
3. **account_groups** - Account grouping for organization
4. **warmup_tasks** - 14-day warmup protocol tasks
5. **scheduled_posts** - Post scheduling and results
6. **content_variations** - Video/caption variations per account
7. **account_health_scores** - Account health monitoring
8. **queues** - Queue management for posting
9. **post_results** - Posting attempt results and errors

**View tables:**
```bash
docker exec -it insta-swarm-db psql -U swarm_user -d insta_swarm -c "\dt"
```

---

## 🛠️ Development Commands

```bash
# Development
npm run dev              # Start dev server with hot reload
npm run build            # Build TypeScript to JavaScript
npm start                # Start production build

# Database
npm run migrate          # Run database migrations
docker-compose logs -f   # View all container logs

# Scripts
./scripts/setup.sh       # Complete setup from scratch
./scripts/start-dev.sh   # Quick start for development
./scripts/deploy.sh      # Deploy to production

# Docker
docker-compose up -d            # Start containers
docker-compose down             # Stop containers
docker-compose restart          # Restart all services
docker-compose logs -f api      # View API logs
docker exec -it insta-swarm-db psql -U swarm_user -d insta_swarm  # Database shell
```

---

## 📝 Environment Variables

### Development (.env)

```env
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USER=swarm_user
DB_PASSWORD=swarm_pass_dev
DB_NAME=insta_swarm
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Production (.env.production)

```env
NODE_ENV=production
PORT=3000
DB_HOST=your-db-host
DB_PASSWORD=strong_password_here
REDIS_PASSWORD=redis_password_here
JWT_SECRET=long_random_string_here
ENCRYPTION_KEY=64_hex_characters_here
FRONTEND_URL=https://your-frontend-url.com
```

**Generate encryption key:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🐛 Troubleshooting

### Docker Permission Denied

```bash
# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Test
docker ps
```

### Containers Won't Start

```bash
# Check what's using the ports
sudo lsof -i :5432  # PostgreSQL
sudo lsof -i :6379  # Redis
sudo lsof -i :3000  # API

# Stop conflicting services
sudo systemctl stop postgresql
sudo systemctl stop redis

# Restart Docker
sudo systemctl restart docker
```

### Database Connection Failed

```bash
# Check container status
docker ps

# Check logs
docker-compose logs postgres

# Restart database
docker-compose restart postgres

# Wait a few seconds then test
docker exec -it insta-swarm-db pg_isready -U swarm_user
```

### Migration Failed

```bash
# Reset database (WARNING: deletes all data)
docker-compose down -v
docker-compose up -d
sleep 5
npm run migrate
```

### Cannot Install Dependencies

```bash
# Clear npm cache
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

---

## 📈 Performance & Scaling

### Current Capacity

- **Concurrent Users**: 100+
- **Accounts Managed**: 100+
- **Requests/min**: 6,000+ (100 req/15min × 100 users)
- **Database Connections**: 20 (pooled)

### Horizontal Scaling

Edit `docker-compose.prod.yml`:
```yaml
services:
  api:
    deploy:
      replicas: 3  # Run 3 API instances
```

### Database Optimization

```sql
-- Already optimized with indexes on:
CREATE INDEX idx_accounts_user ON accounts(user_id);
CREATE INDEX idx_accounts_username ON accounts(username);
CREATE INDEX idx_accounts_state ON accounts(account_state);
CREATE INDEX idx_user_posts ON scheduled_posts(user_id);
CREATE INDEX idx_status ON scheduled_posts(status);
```

---

## 🧪 Testing

```bash
# Test health endpoint
curl http://localhost:3000/health

# Test account creation
curl -X POST http://localhost:3000/api/accounts \
  -H "Content-Type: application/json" \
  -H "x-user-id: test_user" \
  -d '{"username":"test","password":"pass","accountType":"personal"}'

# Test account listing
curl http://localhost:3000/api/accounts -H "x-user-id: test_user"

# Test stats
curl http://localhost:3000/api/accounts/stats/swarm -H "x-user-id: test_user"
```

---

## 📦 Tech Stack

- **Runtime**: Node.js 20+
- **Language**: TypeScript 5.3
- **Framework**: Express 4.x
- **Database**: PostgreSQL 15
- **Cache/Queue**: Redis 7 + Bull
- **Security**: Helmet, express-rate-limit, crypto
- **Logging**: Winston
- **Deployment**: Docker + Docker Compose

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

---

## 📄 License

MIT License - see LICENSE file for details

---

## 🔗 Links

- **GitHub**: https://github.com/talhaakhtargithub/insta_distribution
- **Documentation**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **Quick Start Guide**: [QUICK_START.md](../QUICK_START.md)

---

## 🆘 Support

**Common Issues**: Check [DEPLOYMENT.md](DEPLOYMENT.md#troubleshooting)

**Logs Location**:
- Application: `logs/combined.log`, `logs/error.log`
- Docker: `docker-compose logs -f`

**Database Access**:
```bash
docker exec -it insta-swarm-db psql -U swarm_user -d insta_swarm
```

---

**Made with ❤️ for managing Instagram at scale** 🚀
