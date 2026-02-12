#!/bin/bash

echo "Starting Frontend (Expo)..."
cd /home/talha/Distribution_Mobile_App_MVP_For\ Instagram_Now/InstaDistro

# Kill any existing Expo process
pkill -f "expo start" 2>/dev/null || true
pkill -f "expo-cli" 2>/dev/null || true

# Start Expo
npm start
