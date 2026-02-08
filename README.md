# EtherScope

EtherScope is an EVM transaction debugging and analysis platform providing transaction lookup, block exploration, contract analysis, vulnerability detection, gas profiling, and real-time monitoring for Ethereum smart contracts.

## Architecture

- **Frontend**: Next.js 14 web application with React Query, Tailwind CSS, and real-time WebSocket updates
- **Backend**: Express.js API server with SQLite database, WebSocket support, and Etherscan API integration
- **Contracts**: Solidity contracts for on-chain analysis (Foundry)
- **Packages**: Core analysis logic and adapters (Slither, Mythril)

## Quick Start

### Prerequisites

This is a **pnpm workspace** monorepo. You'll need:

1. **Node.js** (v18 or higher) and **pnpm**:
   ```bash
   npm install -g pnpm
   ```

2. **Etherscan API Key** (required for blockchain data):
   - Get a free API key from [Etherscan.io](https://etherscan.io/apis)
   - Create `backend/.env` file:
     ```bash
     ETHERSCAN_API_KEY=your_api_key_here
     ```

3. **Static Analysis Tools** (optional, for Analyzer feature):
   ```bash
   # Install Slither
   pip install slither-analyzer

   # Install Mythril (optional)
   pip install mythril
   ```

### One-Command Startup (Recommended)

Start both frontend and backend with a single command:

```bash
./start.sh
# or
pnpm run dev
```

This will:
- Install dependencies if needed (runs `pnpm install`)
- Configure environment variables
- Start backend on http://localhost:8787
- Start frontend on http://localhost:3000
- Press Ctrl+C to stop all services

### Manual Startup

#### Install Dependencies First
```bash
pnpm install  # Install all workspace dependencies
```

#### Backend
```bash
cd backend
pnpm run dev
# Runs on http://localhost:8787
```

#### Frontend
```bash
cd frontend
# Create .env.local with:
# NEXT_PUBLIC_API_URL=http://localhost:8787
# NEXT_PUBLIC_WS_URL=ws://localhost:8787
pnpm run dev
# Open http://localhost:3000
```

#### Contracts
```bash
cd contracts
forge install
forge build
forge test
```

### Verifying Setup

After starting the services, verify everything is working:

```bash
# 1. Check backend is running
curl http://localhost:8787/health
# Expected: {"ok":true}

# 2. Check frontend is accessible
# Open http://localhost:3000 in your browser

# 3. Check Slither is installed (for static analysis)
which slither
```

## Features

The application is organized into 7 tabs, each serving a distinct purpose:

### Tx Lookup
Look up any Ethereum transaction by its hash. Displays transaction details including sender/receiver, value transferred, gas used, input data, and event logs from the receipt.

### Blocks
Browse Ethereum blocks with navigation controls. View block details (miner, gas used, timestamp, transaction count) and paginated transaction lists. Click any transaction to jump to Tx Lookup.

### Contract
Analyze verified smart contracts by address. View source code, ABI, balance, and recent transaction history fetched via the Etherscan API. Run static analysis directly from the contract view and navigate to findings.

### Analyzer
Run static analysis on local Solidity projects. Point to a Hardhat or Foundry project root, select analysis tools (Slither or Mythril), and start analysis. Results stream in real-time via WebSocket.

### Findings
Browse vulnerability findings from completed analyses. Filter by severity (Critical, High, Medium, Low, Info), tool, and impact. View detailed descriptions with file locations and line numbers.

### Trends
View historical gas usage trends for contracts. Visual charts showing gas consumption over time with optimization insights.

### Monitor
Subscribe to contract addresses for real-time activity alerts via WebSocket. Track transaction events and manage monitored addresses.

### Wallet Connection
Connect a MetaMask wallet via the header button. Displays connected address, chain name, and ETH balance. Supports Ethereum, Goerli, Sepolia, Polygon, and Mumbai networks.

## Configuration

### Backend Environment (.env)

Create `backend/.env` file with the following variables:

```bash
# Required: Etherscan API Key
ETHERSCAN_API_KEY=your_api_key_here

# Optional: Server Port (default: 8787)
PORT=8787

# Optional: Database Path (default: backend/data/etherscope.db)
DB_PATH=./data/etherscope.db

# Optional: Tool Paths (if tools not in system PATH)
# TOOL_PATH_EXTRA=/usr/local/bin:/opt/homebrew/bin
```

### Frontend Environment (.env.local)

The `start.sh` script creates this automatically, or create `frontend/.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8787
NEXT_PUBLIC_WS_URL=ws://localhost:8787
```

## Troubleshooting

### Backend Connection Errors

**Error:** `Failed to fetch` or `Network error`

```bash
# Verify backend health
curl http://localhost:8787/health
# Expected: {"ok":true}

# Check if backend is running
lsof -i :8787

# Restart backend if needed
cd backend && pnpm run dev
```

### Etherscan API Errors

**Error:** `Invalid API Key` or `Rate limit exceeded`

1. Create `backend/.env` file with valid API key:
   ```
   ETHERSCAN_API_KEY=your_actual_key_here
   ```
2. Get a free key from [Etherscan.io](https://etherscan.io/apis)
3. Restart backend after adding the key

### Slither Analysis Not Working

1. **Slither not installed:**
   ```bash
   which slither
   # If not found:
   pip install slither-analyzer
   ```

2. **Invalid project path:**
   - Ensure the project root path exists and points to a Hardhat or Foundry project
   - Must contain a `contracts/` directory with `.sol` files

### WebSocket Connection Issues

**Problem:** Real-time updates not working

1. Verify WebSocket URL in `frontend/.env.local`:
   ```
   NEXT_PUBLIC_WS_URL=ws://localhost:8787
   ```
2. Check browser console for WebSocket errors
3. Ensure no firewall blocking port 8787

### Port Already in Use

**Error:** `EADDRINUSE: address already in use :::8787`

```bash
# Find process using port 8787
lsof -i :8787

# Kill the process (replace PID with actual process ID)
kill -9 <PID>

# Or use a different port in backend/.env
PORT=8788
```

## Development

This is a monorepo. Each package can be developed independently.

### Quick Commands

```bash
# Install all dependencies
pnpm install

# Start all services
./start.sh

# Run tests
pnpm test

# Build for production
pnpm build
```

### Project Structure

```
EtherScope/
├── frontend/          # Next.js web app (port 3000)
├── backend/           # Express API (port 8787)
├── contracts/         # Solidity contracts (Foundry)
├── packages/
│   ├── core/          # Core types and utilities
│   ├── adapters/
│   │   ├── slither/   # Slither integration
│   │   └── mythril/   # Mythril integration
│   └── cli/           # CLI tool
└── start.sh           # Quick start script
```

For detailed documentation, see the README in each directory:
- [Frontend README](./frontend/README.md)
- [Backend README](./backend/README.md)
- [Contracts README](./contracts/README.md)
