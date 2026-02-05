#!/bin/bash

# Instagram Integration Test Script
# This script helps you test the Instagram integration safely
#
# IMPORTANT: Only use with a TEST Instagram account!
# Do NOT use your main account - it may get banned!

set -e  # Exit on error

echo "=========================================="
echo "Instagram Integration Test Script"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_BASE_URL="http://localhost:3000"
TEST_USER_ID="test_user_$(date +%s)"

echo -e "${YELLOW}⚠️  WARNING: Only use TEST accounts!${NC}"
echo -e "${YELLOW}Using your main Instagram account may result in a ban!${NC}"
echo ""

# Prompt for credentials
read -p "Enter Instagram username: " INSTAGRAM_USERNAME
read -sp "Enter Instagram password: " INSTAGRAM_PASSWORD
echo ""
echo ""

# Step 1: Check if backend is running
echo "Step 1: Checking if backend is running..."
if curl -s "${API_BASE_URL}/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend is running${NC}"
else
    echo -e "${RED}✗ Backend is not running${NC}"
    echo "Please start the backend with: npm run dev"
    exit 1
fi

# Step 2: Check database
echo ""
echo "Step 2: Checking database connection..."
HEALTH_RESPONSE=$(curl -s "${API_BASE_URL}/health")
if echo "$HEALTH_RESPONSE" | grep -q "connected"; then
    echo -e "${GREEN}✓ Database is connected${NC}"
else
    echo -e "${RED}✗ Database connection failed${NC}"
    echo "Please check docker-compose: docker-compose up -d"
    exit 1
fi

# Step 3: Create account
echo ""
echo "Step 3: Creating Instagram account in database..."
CREATE_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/api/accounts" \
  -H "Content-Type: application/json" \
  -H "x-user-id: ${TEST_USER_ID}" \
  -d "{
    \"username\": \"${INSTAGRAM_USERNAME}\",
    \"password\": \"${INSTAGRAM_PASSWORD}\",
    \"accountType\": \"personal\"
  }")

ACCOUNT_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$ACCOUNT_ID" ]; then
    echo -e "${RED}✗ Failed to create account${NC}"
    echo "Response: $CREATE_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✓ Account created with ID: ${ACCOUNT_ID}${NC}"

# Step 4: Verify Instagram credentials
echo ""
echo "Step 4: Verifying Instagram credentials..."
echo "This will attempt to login to Instagram..."
VERIFY_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/api/accounts/${ACCOUNT_ID}/verify" \
  -H "Content-Type: application/json" \
  -H "x-user-id: ${TEST_USER_ID}")

if echo "$VERIFY_RESPONSE" | grep -q '"authenticated":true'; then
    echo -e "${GREEN}✓ Instagram authentication successful!${NC}"
    echo "Account details:"
    echo "$VERIFY_RESPONSE" | grep -o '"username":"[^"]*"' || true
else
    echo -e "${RED}✗ Instagram authentication failed${NC}"
    echo "Response: $VERIFY_RESPONSE"

    # Check for specific errors
    if echo "$VERIFY_RESPONSE" | grep -q "checkpoint"; then
        echo -e "${YELLOW}⚠️  Instagram checkpoint required${NC}"
        echo "Please log into Instagram on a browser first"
    elif echo "$VERIFY_RESPONSE" | grep -q "2fa\|two.factor"; then
        echo -e "${YELLOW}⚠️  Two-factor authentication required${NC}"
        echo "Please disable 2FA temporarily or implement 2FA handling"
    elif echo "$VERIFY_RESPONSE" | grep -q "incorrect\|invalid"; then
        echo -e "${RED}✗ Invalid credentials${NC}"
    fi

    exit 1
fi

# Step 5: Get account details
echo ""
echo "Step 5: Fetching account details..."
ACCOUNT_DETAILS=$(curl -s "${API_BASE_URL}/api/accounts/${ACCOUNT_ID}" \
  -H "x-user-id: ${TEST_USER_ID}")

echo "Account information:"
echo "$ACCOUNT_DETAILS" | grep -o '"username":"[^"]*"' || true
echo "$ACCOUNT_DETAILS" | grep -o '"account_state":"[^"]*"' || true
echo "$ACCOUNT_DETAILS" | grep -o '"is_authenticated":[^,}]*' || true

# Step 6: Test posting (optional - requires image)
echo ""
read -p "Do you want to test posting? (requires image file) [y/N]: " TEST_POSTING

if [ "$TEST_POSTING" = "y" ] || [ "$TEST_POSTING" = "Y" ]; then
    read -p "Enter path to image file: " IMAGE_PATH

    if [ ! -f "$IMAGE_PATH" ]; then
        echo -e "${RED}✗ Image file not found${NC}"
    else
        echo "Testing image post..."
        POST_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/api/posts/verify-account" \
          -H "Content-Type: application/json" \
          -H "x-user-id: ${TEST_USER_ID}" \
          -d "{
            \"accountId\": \"${ACCOUNT_ID}\"
          }")

        if echo "$POST_RESPONSE" | grep -q '"canPost":true'; then
            echo -e "${GREEN}✓ Account verified for posting${NC}"

            # Attempt actual post
            echo "Posting to Instagram..."
            POST_RESULT=$(curl -s -X POST "${API_BASE_URL}/api/posts/immediate" \
              -H "Content-Type: application/json" \
              -H "x-user-id: ${TEST_USER_ID}" \
              -d "{
                \"accountId\": \"${ACCOUNT_ID}\",
                \"mediaPath\": \"${IMAGE_PATH}\",
                \"mediaType\": \"photo\",
                \"caption\": \"Test post from InstaDistro - $(date)\"
              }")

            if echo "$POST_RESULT" | grep -q '"success":true'; then
                echo -e "${GREEN}✓ Post successful!${NC}"
                MEDIA_ID=$(echo "$POST_RESULT" | grep -o '"mediaId":"[^"]*"' | cut -d'"' -f4)
                echo "Media ID: $MEDIA_ID"
            else
                echo -e "${RED}✗ Post failed${NC}"
                echo "Response: $POST_RESULT"
            fi
        else
            echo -e "${RED}✗ Account not verified for posting${NC}"
        fi
    fi
fi

# Summary
echo ""
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo -e "Backend:        ${GREEN}✓ Running${NC}"
echo -e "Database:       ${GREEN}✓ Connected${NC}"
echo -e "Account:        ${GREEN}✓ Created${NC}"
echo -e "Instagram Auth: ${GREEN}✓ Verified${NC}"
echo ""
echo "Account ID: ${ACCOUNT_ID}"
echo "User ID: ${TEST_USER_ID}"
echo ""
echo -e "${YELLOW}Remember to test with ONLY test accounts!${NC}"
echo "=========================================="
