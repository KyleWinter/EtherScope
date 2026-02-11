#!/bin/bash
# EtherScope Quick Start Script

set -e

echo "🚀 Starting EtherScope..."

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Installing pnpm..."
    npm install -g pnpm
fi

# Setup frontend env if needed
if [ ! -f "frontend/.env.local" ]; then
    echo "📝 Creating frontend/.env.local..."
    cat > frontend/.env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:8787
NEXT_PUBLIC_WS_URL=ws://localhost:8787
EOF
fi

# Install dependencies if needed
if [ ! -d "node_modules" ] || [ ! -d "backend/node_modules" ] || [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing dependencies..."
    pnpm install
    echo "🔨 Building workspace packages..."
    pnpm -r --reporter=append-only run build 2>&1 | tee build.log
fi

# Create data directory
mkdir -p backend/data

# Cleanup on exit
cleanup() {
    echo -e "\n👋 Shutting down..."
    kill 0
}
trap cleanup EXIT

# Start services
echo "🔧 Starting backend on http://localhost:8787..."
(cd backend && pnpm run dev) 2>&1 | sed 's/^/[BACKEND] /' &

sleep 3

echo "🎨 Starting frontend on http://localhost:3000..."
(cd frontend && pnpm run dev) 2>&1 | sed 's/^/[FRONTEND] /' &

echo ""
echo "✅ EtherScope is running!"
echo "   Frontend:  http://localhost:3000"
echo "   Backend:   http://localhost:8787"
echo "   WebSocket: ws://localhost:8787"
echo ""
echo "Press Ctrl+C to stop"

wait
