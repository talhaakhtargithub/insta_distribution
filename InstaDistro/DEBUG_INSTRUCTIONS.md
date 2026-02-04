# 🔍 Debug Instructions - App Stuck After Splash

## Issue: Nothing shows after splash screen

This usually means AsyncStorage or navigation isn't working properly on web.

## Step 1: Check Browser Console for Errors

1. In your browser (with localhost:8081 open)
2. Press **F12** (or right-click → Inspect)
3. Click the **Console** tab
4. Look for **red errors**

### Common Errors You Might See:
- "AsyncStorage is not available"
- "Cannot read property of undefined"
- Navigation errors
- Theme context errors

## Step 2: Take a Screenshot

Please take a screenshot of:
1. What you see on screen (stuck on splash or blank?)
2. The browser console errors (F12 → Console tab)

## Step 3: Quick Fixes to Try

### Fix 1: Clear Browser Cache
```
Press Ctrl + Shift + R (Windows/Linux)
Press Cmd + Shift + R (Mac)
```

### Fix 2: Check Browser Console
Look at the Console tab (F12) and tell me what errors you see.

### Fix 3: Force Skip Splash
I'll create a version that skips splash and goes straight to the app.

## What to Tell Me:

1. **What do you see on screen?**
   - Still showing splash logo?
   - Blank white screen?
   - Loading spinner?
   - Something else?

2. **Any errors in Console?** (F12 → Console)
   - Copy and paste the red error messages

3. **Does the page title change?**
   - Look at the browser tab title
   - Does it say "InstaDistro" or still loading?

## Meanwhile, I'll Create a Fix...

I'm going to create a web-compatible version that:
- Uses localStorage instead of AsyncStorage for web
- Adds better error handling
- Shows debug info if stuck
