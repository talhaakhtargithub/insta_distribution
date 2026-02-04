# Instagram Account Authentication Methods

This document explains the two ways to authenticate Instagram accounts in the Swarm Management System.

## Overview

The system supports **two authentication methods** for Instagram accounts:

### 1. **Username/Password Authentication** (Personal & Business Accounts)
- **For**: Personal accounts (recommended) and Business accounts
- **Method**: Direct login with Instagram username and password
- **Implementation**: Uses `instagram-private-api` package
- **Pros**:
  - Works for any Instagram account
  - Full automation capabilities
  - No Facebook setup required
- **Cons**:
  - Requires storing passwords (encrypted)
  - May trigger 2FA or security challenges
  - Against Instagram's official TOS (use at own risk)

### 2. **OAuth Authentication** (Business Accounts Only)
- **For**: Instagram Business accounts with connected Facebook Page
- **Method**: OAuth 2.0 flow (official Instagram API)
- **Implementation**: Uses Instagram Graph API
- **Pros**:
  - Official method (follows Instagram TOS)
  - No password storage needed
  - Secure token-based authentication
  - Long-lived tokens (60 days)
- **Cons**:
  - Only works for Business accounts
  - Requires Facebook Page connection
  - Requires Facebook App setup
  - More complex initial setup

---

## Method 1: Username/Password Authentication

### Use Cases
- Personal Instagram accounts
- Quick setup without Facebook integration
- Maximum automation capabilities

### Setup

**No special setup required!** Just create an account:

```bash
POST /api/accounts
Content-Type: application/json

{
  "username": "your_instagram_username",
  "password": "your_instagram_password",
  "accountType": "personal"
}
```

### How It Works

1. User provides Instagram username and password
2. Backend stores password encrypted (AES-256)
3. When posting, system:
   - Logs in to Instagram using `instagram-private-api`
   - Simulates real user behavior (pre-login flow, post-login flow)
   - Saves session token for future use
   - Posts photo/video
4. Session tokens reused for subsequent posts (no need to login every time)

### Security Features
- Passwords encrypted with AES-256-CBC before database storage
- Session tokens stored encrypted
- Encryption key stored in environment variables (never in code)
- Automatic session restoration (avoids repeated logins)

### Error Handling
- **2FA Required**: Returns error asking user to disable 2FA or use OAuth
- **Checkpoint Challenge**: Instagram wants verification, user must verify in app
- **Login Failed**: Invalid credentials, user must check username/password
- **Rate Limited**: Too many login attempts, wait 24 hours

---

## Method 2: OAuth Authentication (Instagram Business)

### Use Cases
- Instagram Business accounts
- Official, TOS-compliant authentication
- Users who prefer not to share passwords
- Production apps with many users

### Prerequisites

1. **Instagram Business Account**
   - Must be converted to Business account in Instagram app
   - Must be connected to a Facebook Page

2. **Facebook App** (create at [developers.facebook.com](https://developers.facebook.com))
   - App created with Instagram Basic Display API enabled
   - OAuth redirect URI configured
   - Client ID and Client Secret obtained

### Facebook App Setup (Step-by-Step)

#### Step 1: Create Facebook App

1. Go to [https://developers.facebook.com/apps](https://developers.facebook.com/apps)
2. Click "Create App"
3. Select "Consumer" app type
4. Fill in app details:
   - **App Name**: "InstaDistro Swarm Manager" (or your app name)
   - **App Contact Email**: your email
5. Click "Create App"

#### Step 2: Add Instagram Basic Display

1. In your app dashboard, click "Add Product"
2. Find "Instagram Basic Display" and click "Set Up"
3. Click "Create New App" in Instagram Basic Display settings
4. Fill in required fields:
   - **Display Name**: Your app name
   - **Privacy Policy URL**: Your privacy policy URL (required)
   - **Terms of Service URL**: Your terms URL (optional)

#### Step 3: Configure OAuth Settings

1. In Instagram Basic Display settings, scroll to **OAuth Redirect URIs**
2. Add your callback URL:
   ```
   http://localhost:3000/api/auth/instagram/callback    (for development)
   https://yourdomain.com/api/auth/instagram/callback   (for production)
   ```
3. Add **Deauthorize Callback URL** (can be same as redirect URI)
4. Add **Data Deletion Request URL** (required for production)
5. Click "Save Changes"

#### Step 4: Get Credentials

1. Scroll to **Instagram App ID** and **Instagram App Secret**
2. Copy both values
3. Add to your `.env` file:
   ```env
   INSTAGRAM_CLIENT_ID=your_instagram_app_id_here
   INSTAGRAM_CLIENT_SECRET=your_instagram_app_secret_here
   INSTAGRAM_REDIRECT_URI=http://localhost:3000/api/auth/instagram/callback
   ```

#### Step 5: Add Test Users (Development)

1. Scroll to **User Token Generator**
2. Click "Add or Remove Instagram Testers"
3. Add your Instagram Business account username
4. Accept the invitation in Instagram app (Settings → Apps and Websites → Tester Invites)

#### Step 6: Submit for Review (Production Only)

For production apps:
1. Complete all required app information
2. Submit app for Instagram Basic Display review
3. Wait for approval (usually 1-2 weeks)

### Backend Configuration

Add to `.env`:
```env
INSTAGRAM_CLIENT_ID=123456789012345
INSTAGRAM_CLIENT_SECRET=abcdef1234567890abcdef1234567890
INSTAGRAM_REDIRECT_URI=http://localhost:3000/api/auth/instagram/callback
```

### OAuth Flow (How It Works)

#### Step 1: Get Authorization URL

**Frontend/Mobile App calls:**
```bash
GET /api/auth/instagram/authorize
```

**Backend responds with:**
```json
{
  "success": true,
  "authUrl": "https://api.instagram.com/oauth/authorize?client_id=...",
  "state": "abc123"
}
```

#### Step 2: Redirect User to Instagram

**Mobile app opens browser:**
- User sees Instagram OAuth consent screen
- User clicks "Authorize"
- Instagram redirects to callback URL with `code` parameter

#### Step 3: Backend Handles Callback

**Instagram redirects to:**
```
http://localhost:3000/api/auth/instagram/callback?code=AQD...&state=abc123
```

**Backend automatically:**
1. Exchanges code for access token
2. Upgrades to long-lived token (60 days)
3. Gets Instagram user info
4. Saves account to database
5. Returns success response

#### Step 4: Account Saved

Account is now connected and can be used for posting!

### API Endpoints

#### 1. Get Available OAuth Providers
```bash
GET /api/auth/providers
```

Response:
```json
{
  "success": true,
  "providers": {
    "instagram": {
      "enabled": true,
      "name": "Instagram",
      "description": "Connect Instagram Business accounts via OAuth",
      "authUrl": "/api/auth/instagram/authorize",
      "accountType": "business"
    }
  }
}
```

#### 2. Start OAuth Flow
```bash
GET /api/auth/instagram/authorize
```

Response:
```json
{
  "success": true,
  "authUrl": "https://api.instagram.com/oauth/authorize?client_id=...",
  "state": "random_csrf_token"
}
```

#### 3. OAuth Callback (handled automatically)
```bash
GET /api/auth/instagram/callback?code=AQD...&state=abc123
```

Response:
```json
{
  "success": true,
  "message": "Instagram account connected successfully",
  "account": {
    "id": "uuid",
    "username": "business_account",
    "accountType": "business",
    "instagramUserId": "123456789"
  }
}
```

#### 4. Refresh Token
```bash
POST /api/auth/instagram/refresh-token
Content-Type: application/json

{
  "accountId": "account-uuid"
}
```

Response:
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "expiresIn": 5184000
}
```

### Token Management

**Token Lifecycle:**
1. **Short-lived token**: 1 hour (initial OAuth)
2. **Long-lived token**: 60 days (automatically upgraded)
3. **Refreshed token**: 60 days (can be refreshed before expiration)

**Automatic Token Refresh:**
Backend should refresh tokens before they expire:
- Run cron job daily to check token expiration
- Refresh tokens that expire in < 7 days
- Update database with new token

---

## Comparison Table

| Feature | Username/Password | OAuth |
|---------|-------------------|-------|
| **Account Type** | Personal + Business | Business only |
| **Setup Complexity** | Easy (just credentials) | Complex (Facebook App required) |
| **Password Storage** | Required (encrypted) | Not required |
| **TOS Compliant** | ❌ No (unofficial API) | ✅ Yes (official API) |
| **Automation Level** | High (full control) | Medium (API limitations) |
| **2FA Support** | Limited (must disable) | ✅ Supported |
| **Token Expiration** | Session-based | 60 days (refreshable) |
| **Rate Limits** | Strict (5-10 posts/day for new accounts) | 25 posts/24 hours |
| **Security Challenges** | Common (checkpoints, 2FA) | Rare |
| **Best For** | Personal accounts, testing | Business accounts, production |

---

## Recommendations

### For Personal Accounts
✅ **Use Username/Password Method**
- Simpler setup
- Full automation
- No Facebook integration needed

### For Business Accounts
✅ **Use OAuth Method (Recommended)**
- Official and TOS-compliant
- Better for production
- More stable and reliable

⚠️ **Or Username/Password** (if OAuth setup is too complex)
- Faster to test
- Works immediately
- Use for development/testing only

### For Production App
✅ **Offer Both Options**
- OAuth for business accounts (primary)
- Username/Password for personal accounts (secondary)
- Let users choose based on their account type

---

## Mobile App Integration

### Adding "Login with Instagram" Button

```typescript
// In your React Native AccountsScreen

import { Linking } from 'react-native';

const handleInstagramOAuth = async () => {
  try {
    // 1. Get authorization URL from backend
    const response = await backendApi.request('/auth/instagram/authorize');
    const { authUrl } = response;

    // 2. Open Instagram OAuth in browser
    await Linking.openURL(authUrl);

    // 3. Listen for callback (use deep linking)
    // After user authorizes, Instagram redirects to your callback
    // Backend handles the token exchange automatically

    // 4. Poll backend for new account or use deep link callback
    setTimeout(() => {
      loadAccounts(); // Refresh account list
    }, 5000);

    Alert.alert('Success', 'Please authorize in the browser. We\'ll add your account automatically.');
  } catch (error) {
    Alert.alert('Error', error.message);
  }
};

// Add button in UI
<Button
  mode="outlined"
  icon="instagram"
  onPress={handleInstagramOAuth}
>
  Login with Instagram (Business)
</Button>
```

### Deep Linking Configuration

For production, configure deep linking to return to app after OAuth:

**iOS (Info.plist):**
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>instadistro</string>
    </array>
  </dict>
</array>
```

**Android (AndroidManifest.xml):**
```xml
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="instadistro" />
</intent-filter>
```

**Update Redirect URI:**
```env
INSTAGRAM_REDIRECT_URI=instadistro://instagram/callback
```

---

## Troubleshooting

### OAuth Issues

**Problem**: "OAuth Not Configured" error
- **Solution**: Set `INSTAGRAM_CLIENT_ID` and `INSTAGRAM_CLIENT_SECRET` in `.env`

**Problem**: "Redirect URI mismatch"
- **Solution**: Ensure `INSTAGRAM_REDIRECT_URI` in `.env` matches the URI configured in Facebook App

**Problem**: "Invalid Client ID"
- **Solution**: Use Instagram App ID, not Facebook App ID

**Problem**: "Access Token Invalid"
- **Solution**: Token may have expired, refresh using `/auth/instagram/refresh-token`

### Username/Password Issues

**Problem**: "Challenge Required"
- **Solution**: User must verify account in Instagram app (Instagram detected unusual activity)

**Problem**: "2FA Required"
- **Solution**: Either disable 2FA or use OAuth method

**Problem**: "Login Failed"
- **Solution**: Check if credentials are correct, account may be flagged

**Problem**: "Rate Limited"
- **Solution**: Too many requests, wait 24 hours before trying again

---

## Security Best Practices

### For OAuth
1. ✅ Always validate `state` parameter (CSRF protection)
2. ✅ Store tokens encrypted in database
3. ✅ Use HTTPS in production
4. ✅ Refresh tokens before expiration
5. ✅ Implement token revocation

### For Username/Password
1. ✅ Encrypt passwords with AES-256 before storage
2. ✅ Never log passwords or tokens
3. ✅ Use environment variables for encryption key
4. ✅ Rotate encryption keys periodically
5. ✅ Implement automatic session restoration to avoid repeated logins

---

## Summary

Both authentication methods are now fully implemented and working:

1. **Username/Password** ✅
   - For personal accounts
   - Works immediately, no setup needed
   - Full automation capabilities

2. **Instagram OAuth** ✅
   - For business accounts
   - Official and TOS-compliant
   - Requires Facebook App setup

Choose the method that best fits your use case!
