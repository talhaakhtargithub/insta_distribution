# Instagram Integration Testing Guide

## ⚠️ IMPORTANT: Security & Safety

### DO NOT:
- ❌ Use your main Instagram account
- ❌ Share credentials in chat/logs
- ❌ Test with valuable accounts
- ❌ Post too frequently (risk of ban)

### DO:
- ✅ Create a throwaway test account
- ✅ Test on localhost only
- ✅ Monitor for Instagram warnings
- ✅ Use low posting frequency

---

## Quick Start Testing

### 1. Prerequisites

```bash
# Ensure Docker is running
docker --version

# Ensure Node.js is installed
node --version  # Should be v20+
```

### 2. Start Services

```bash
cd InstaDistro-Backend

# Start PostgreSQL & Redis
docker-compose up -d

# Run database migrations
npm run migrate

# Start backend in development mode
npm run dev
```

### 3. Run Automated Test Script

```bash
# Make script executable (if not already)
chmod +x test-instagram-integration.sh

# Run the test
./test-instagram-integration.sh
```

The script will prompt you for Instagram credentials and test:
- ✅ Backend connectivity
- ✅ Database connection
- ✅ Account creation
- ✅ Instagram authentication
- ✅ (Optional) Image posting

---

## Manual Testing (Step-by-Step)

### Step 1: Health Check

```bash
curl http://localhost:3000/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Step 2: Create Account

```bash
curl -X POST http://localhost:3000/api/accounts \
  -H "Content-Type: application/json" \
  -H "x-user-id: test_user" \
  -d '{
    "username": "YOUR_TEST_USERNAME",
    "password": "YOUR_TEST_PASSWORD",
    "accountType": "personal"
  }'
```

**Expected Response:**
```json
{
  "message": "Account created successfully",
  "account": {
    "id": "...",
    "username": "YOUR_TEST_USERNAME",
    "account_type": "personal",
    "account_state": "NEW_ACCOUNT",
    ...
  }
}
```

**Save the `id` from the response - you'll need it!**

### Step 3: Verify Instagram Credentials

```bash
# Replace ACCOUNT_ID with the id from previous step
curl -X POST http://localhost:3000/api/accounts/ACCOUNT_ID/verify \
  -H "Content-Type: application/json" \
  -H "x-user-id: test_user"
```

**Success Response:**
```json
{
  "success": true,
  "authenticated": true,
  "accountInfo": {
    "username": "...",
    "fullName": "...",
    "biography": "...",
    "followersCount": 123,
    "followingCount": 456
  }
}
```

**Common Errors:**

**Checkpoint Required:**
```json
{
  "success": false,
  "error": "Challenge required"
}
```
→ Log into Instagram on a browser first, then retry

**2FA Required:**
```json
{
  "success": false,
  "error": "Two-factor authentication required"
}
```
→ Temporarily disable 2FA or implement 2FA handler

**Invalid Credentials:**
```json
{
  "success": false,
  "error": "Incorrect password"
}
```
→ Check username and password

### Step 4: Check Account Status

```bash
curl http://localhost:3000/api/accounts/ACCOUNT_ID \
  -H "x-user-id: test_user"
```

Look for:
- `"is_authenticated": true`
- `"account_state": "NEW_ACCOUNT"`

### Step 5: Test Posting (Optional)

First, prepare a test image:
```bash
# Create a simple test image
convert -size 1080x1080 xc:blue test-image.jpg
# Or use any JPG/PNG file you have
```

Verify account can post:
```bash
curl -X POST http://localhost:3000/api/posts/verify-account \
  -H "Content-Type: application/json" \
  -H "x-user-id: test_user" \
  -d '{
    "accountId": "ACCOUNT_ID"
  }'
```

Post to Instagram:
```bash
curl -X POST http://localhost:3000/api/posts/immediate \
  -H "Content-Type: application/json" \
  -H "x-user-id: test_user" \
  -d '{
    "accountId": "ACCOUNT_ID",
    "mediaPath": "/absolute/path/to/test-image.jpg",
    "mediaType": "photo",
    "caption": "Test post from InstaDistro"
  }'
```

**Success Response:**
```json
{
  "success": true,
  "message": "Posted to Instagram successfully",
  "mediaId": "...",
  "postedAt": "2024-01-01T00:00:00.000Z"
}
```

---

## Troubleshooting

### Backend Not Starting

```bash
# Check if port 3000 is in use
lsof -i :3000

# Check logs
npm run dev
# Look for any error messages
```

### Database Connection Failed

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Restart services
docker-compose down
docker-compose up -d

# Check logs
docker-compose logs db
```

### Instagram Authentication Failed

1. **Check Instagram status**: Visit instagram.com in browser
2. **Try logging in manually**: Use the same credentials
3. **Check for checkpoint**: Instagram may require verification
4. **Disable 2FA temporarily**: For testing purposes
5. **Use different account**: Create a fresh test account

### Rate Limits

If you see "Too many requests":
- Wait 15-30 minutes
- Use proxy (see proxy setup in main README)
- Reduce posting frequency

### Image Upload Failed

```bash
# Verify file exists
ls -lh /path/to/image.jpg

# Check file size (must be < 8MB)
du -h /path/to/image.jpg

# Verify file format
file /path/to/image.jpg  # Should show "JPEG image" or "PNG image"
```

---

## Monitoring Logs

### Backend Logs

```bash
# Real-time logs
tail -f logs/combined.log

# Error logs only
tail -f logs/error.log

# Search for specific account
grep "account123" logs/combined.log
```

### Database Queries

```bash
# Connect to database
docker exec -it insta-swarm-db psql -U swarm_user -d insta_swarm

# Check accounts
SELECT id, username, account_state, is_authenticated FROM accounts;

# Check recent posts
SELECT account_id, status, created_at FROM post_results ORDER BY created_at DESC LIMIT 10;

# Exit
\q
```

---

## Safety Checklist

Before testing with Instagram:
- [ ] Using a throwaway test account (NOT main account)
- [ ] Backend running on localhost (NOT public server)
- [ ] Credentials stored in .env file
- [ ] .env file in .gitignore
- [ ] Posting frequency is low (1-2 posts/day max)
- [ ] Monitoring Instagram for warnings

---

## What to Test

### Core Functionality
- [ ] Account creation
- [ ] Instagram authentication
- [ ] Account status updates
- [ ] Single image post
- [ ] Single video post
- [ ] Post with caption and hashtags

### Advanced Features (Optional)
- [ ] Multiple account management
- [ ] Scheduled posting
- [ ] Warmup protocol
- [ ] Content variations
- [ ] Batch posting

---

## Getting Help

If you encounter issues:

1. **Check logs**: `logs/error.log` and console output
2. **Verify configuration**: `.env` file is correct
3. **Database status**: `docker-compose ps`
4. **Share error messages**: Copy error without credentials

Common issues are documented in [DEPLOYMENT.md](DEPLOYMENT.md)

---

## Success Criteria

You've successfully tested when:
- ✅ Backend health check returns `ok`
- ✅ Account created in database
- ✅ Instagram authentication succeeds
- ✅ `is_authenticated` is `true`
- ✅ (Optional) Test post appears on Instagram

**Congratulations! Your Instagram integration is working!** 🎉
