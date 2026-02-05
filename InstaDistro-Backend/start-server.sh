#!/bin/bash

echo "🚀 Starting InstaDistro Backend..."
echo ""

# Check if already running
if lsof -i :3000 > /dev/null 2>&1; then
    echo "⚠️  Port 3000 is already in use"
    echo "Killing existing process..."
    kill $(lsof -t -i :3000) 2>/dev/null || true
    sleep 2
fi

# Start the server
echo "Starting backend server..."
npm run dev

