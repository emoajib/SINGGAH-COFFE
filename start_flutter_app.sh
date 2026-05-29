#!/bin/bash

echo "📱 Starting Flutter Mobile App..."
echo "=================================="

cd "/Volumes/WORK/PROJECT PROTOTYPE/SISTEM MOKA POS SINGGAH COFFEE/mobile-app"

echo "📦 Getting Flutter dependencies..."
flutter pub get

echo ""
echo "🚀 Running Flutter app in Chrome..."
echo ""

flutter run -d chrome
