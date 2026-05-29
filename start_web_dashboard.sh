#!/bin/bash

echo "🌐 Starting Web Dashboard..."
echo "=============================="

cd "/Volumes/WORK/PROJECT PROTOTYPE/SISTEM MOKA POS SINGGAH COFFEE/web-dashboard"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo ""
echo "🚀 Starting Vite dev server..."
echo "   Access at: http://localhost:5173"
echo ""

npm run dev
