# 🌐 View Your App in VS Code Browser

## Access Your Backend API

### Method 1: VS Code Simple Browser (Built-in)

1. **Open Command Palette:** `Ctrl + Shift + P`
2. Type: `Simple Browser: Show`
3. Enter URL: `http://localhost:3000/api-docs`

### Method 2: Quick Access

Press `Ctrl + Shift + P` and paste:
```
>Simple Browser: Show http://localhost:3000/api-docs
```

---

## 📍 Available URLs

| Service | URL | Description |
|---------|-----|-------------|
| **API Docs (Swagger)** | http://localhost:3000/api-docs | Interactive API documentation |
| **Health Check** | http://localhost:3000/health | Backend status |
| **All Accounts** | http://localhost:3000/api/accounts | View accounts (needs auth header) |
| **Warmup Status** | http://localhost:3000/api/warmup/accounts | Warmup automation |
| **Distribution** | http://localhost:3000/api/distribution | Post distribution |

---

## 🎯 Quick Test in VS Code Terminal

### 1. Test Backend Health

```bash
curl http://localhost:3000/health
```

**Expected:**
```json
{
  "status": "ok",
  "database": "connected",
  "redis": "connected"
}
```

### 2. Create Test Account

```bash
curl -X POST http://localhost:3000/api/accounts \
  -H "Content-Type: application/json" \
  -H "x-user-id: test_user_123" \
  -d '{
    "username": "test_instagram_username",
    "password": "test_password",
    "accountType": "personal"
  }'
```

### 3. Test Instagram Integration

```bash
cd InstaDistro-Backend
./quick-test.sh
```

---

## 📱 Access Frontend (Mobile App)

The frontend is a **React Native Expo app** (mobile):

### Start Frontend:

```bash
cd /home/talha/Distribution_Mobile_App_MVP_For\ Instagram_Now/InstaDistro
npm start
```

### Access Options:

1. **On Your Phone:**
   - Install "Expo Go" app from App Store/Play Store
   - Scan the QR code shown in terminal

2. **In Web Browser:**
   - Press `w` in the Expo terminal
   - Opens at http://localhost:8081 or similar

3. **Android Emulator:**
   - Press `a` in the Expo terminal

4. **iOS Simulator:** (Mac only)
   - Press `i` in the Expo terminal

---

## 🔧 VS Code Extensions (Recommended)

Install these for better experience:

1. **REST Client** - Test API directly in VS Code
   - Install: `Ctrl + Shift + X` → search "REST Client"
   - Create file: `test-api.http`
   ```http
   ### Health Check
   GET http://localhost:3000/health

   ### Create Account
   POST http://localhost:3000/api/accounts
   Content-Type: application/json
   x-user-id: test_user

   {
     "username": "test",
     "password": "test123",
     "accountType": "personal"
   }
   ```

2. **Thunder Client** - Postman alternative in VS Code
   - Better UI for API testing

---

## 🚀 Start Everything

### Single Command:

```bash
# Terminal 1 - Backend (if not already running)
sudo bash ~/RUN_THIS_ONCE.sh

# Terminal 2 - Frontend
bash ~/Distribution_Mobile_App_MVP_For\ Instagram_Now/START_FRONTEND.sh
```

---

## 📊 Monitor Logs in VS Code

### Open Backend Logs:

```bash
tail -f /home/talha/Distribution_Mobile_App_MVP_For\ Instagram_Now/InstaDistro-Backend/logs/backend.log
```

### Or open in VS Code:
- Press `Ctrl + O`
- Navigate to: `InstaDistro-Backend/logs/backend.log`
- File auto-updates as logs are written

---

## 🎉 You're All Set!

Your app structure:
```
Distribution_Mobile_App_MVP_For Instagram_Now/
├── InstaDistro-Backend/          ← Backend API
│   ├── http://localhost:3000      (API)
│   └── http://localhost:3000/api-docs (Docs)
│
└── InstaDistro/                   ← Frontend Mobile App
    └── Expo app (scan QR code)
```

**Next:** Open `http://localhost:3000/api-docs` in VS Code Simple Browser! 🌐
