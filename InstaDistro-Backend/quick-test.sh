#!/bin/bash

# Quick Instagram Integration Test
# Tests account creation, login, and video posting

set -e

API_URL="http://localhost:3000"
USER_ID="test_user_$(date +%s)"

echo "=========================================="
echo "🎬 Quick Instagram Video Test"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if backend is running
echo "Checking backend..."
if ! curl -s "${API_URL}/health" > /dev/null 2>&1; then
    echo -e "${RED}❌ Backend is not running!${NC}"
    echo ""
    echo "Start it with:"
    echo "  cd InstaDistro-Backend"
    echo "  npm run dev"
    exit 1
fi
echo -e "${GREEN}✅ Backend is running${NC}"
echo ""

# Get credentials
read -p "Instagram username: " USERNAME
read -sp "Instagram password: " PASSWORD
echo ""

# Find test video
VIDEO_PATH=""
if [ -f "test.mp4" ]; then
    VIDEO_PATH="$(pwd)/test.mp4"
elif [ -f "../test.mp4" ]; then
    VIDEO_PATH="$(cd .. && pwd)/test.mp4"
else
    echo -e "${YELLOW}⚠️  No test.mp4 found${NC}"
    read -p "Enter path to video file: " VIDEO_PATH
fi

if [ ! -f "$VIDEO_PATH" ]; then
    echo -e "${RED}❌ Video file not found: $VIDEO_PATH${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Found video: $VIDEO_PATH${NC}"
VIDEO_SIZE=$(du -h "$VIDEO_PATH" | cut -f1)
echo "   Size: $VIDEO_SIZE"
echo ""

# 1. Create account
echo "1️⃣  Creating account..."
CREATE_RESP=$(curl -s -X POST "${API_URL}/api/accounts" \
  -H "Content-Type: application/json" \
  -H "x-user-id: ${USER_ID}" \
  -d "{
    \"username\": \"${USERNAME}\",
    \"password\": \"${PASSWORD}\",
    \"accountType\": \"personal\"
  }")

ACCOUNT_ID=$(echo "$CREATE_RESP" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$ACCOUNT_ID" ]; then
    echo -e "${RED}❌ Failed to create account${NC}"
    echo "$CREATE_RESP"
    exit 1
fi

echo -e "${GREEN}✅ Account created: $ACCOUNT_ID${NC}"
echo ""

# 2. Verify credentials
echo "2️⃣  Verifying Instagram login..."
VERIFY_RESP=$(curl -s -X POST "${API_URL}/api/accounts/${ACCOUNT_ID}/verify" \
  -H "Content-Type: application/json" \
  -H "x-user-id: ${USER_ID}")

if echo "$VERIFY_RESP" | grep -q '"authenticated":true'; then
    echo -e "${GREEN}✅ Instagram login successful!${NC}"

    # Extract account info
    FOLLOWERS=$(echo "$VERIFY_RESP" | grep -o '"followersCount":[0-9]*' | cut -d':' -f2)
    FOLLOWING=$(echo "$VERIFY_RESP" | grep -o '"followingCount":[0-9]*' | cut -d':' -f2)

    echo "   Username: $USERNAME"
    echo "   Followers: $FOLLOWERS"
    echo "   Following: $FOLLOWING"
else
    echo -e "${RED}❌ Instagram login failed${NC}"
    echo "$VERIFY_RESP"
    exit 1
fi
echo ""

# 3. Post video
echo "3️⃣  Posting video to Instagram..."
POST_RESP=$(curl -s -X POST "${API_URL}/api/posts/immediate" \
  -H "Content-Type: application/json" \
  -H "x-user-id: ${USER_ID}" \
  -d "{
    \"accountId\": \"${ACCOUNT_ID}\",
    \"mediaPath\": \"${VIDEO_PATH}\",
    \"mediaType\": \"video\",
    \"caption\": \"Test video from InstaDistro - $(date '+%Y-%m-%d %H:%M')\",
    \"hashtags\": [\"test\", \"automation\"]
  }")

if echo "$POST_RESP" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ Video posted successfully!${NC}"

    MEDIA_ID=$(echo "$POST_RESP" | grep -o '"mediaId":"[^"]*"' | cut -d'"' -f4)
    echo "   Media ID: $MEDIA_ID"
    echo "   Check: https://www.instagram.com/p/${MEDIA_ID}/"
else
    echo -e "${RED}❌ Video posting failed${NC}"
    echo "$POST_RESP"
    exit 1
fi
echo ""

# Summary
echo "=========================================="
echo "✅ ALL TESTS PASSED!"
echo "=========================================="
echo ""
echo "Results:"
echo "  • Account: $USERNAME"
echo "  • Account ID: $ACCOUNT_ID"
echo "  • Video posted: ✅"
echo "  • Media ID: $MEDIA_ID"
echo ""
echo "🎉 Your Instagram integration is working!"
echo "=========================================="
