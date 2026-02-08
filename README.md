# EtherScope

EtherScope is an EVM transaction debugging and analysis platform providing trace visualization, state diff inspection, gas profiling, and vulnerability detection for Ethereum smart contracts.

## Architecture

- **Frontend**: Next.js 14 web application with real-time updates
- **Backend**: Express.js API server with WebSocket support
- **Contracts**: Solidity contracts for on-chain analysis (Foundry)
- **Packages**: Core analysis logic and adapters (Slither, Mythril)

## Quick Start

### Prerequisites

This is a **pnpm workspace** monorepo. You'll need:

1. **Node.js** (v18 or higher) and **pnpm**:
   ```bash
   npm install -g pnpm
   ```

2. **Static Analysis Tools** (optional, for Static Analysis feature):
   ```bash
   # Install Slither
   pip install slither-analyzer

   # Install Mythril (optional)
   pip install mythril
   ```

3. **Etherscan API Key** (required for blockchain data):
   - Get a free API key from [Etherscan.io](https://etherscan.io/apis)
   - Create `backend/.env` file:
     ```bash
     ETHERSCAN_API_KEY=your_api_key_here
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

# 2. Check Slither is installed (for static analysis)
which slither

# 3. Check frontend is accessible
# Open http://localhost:3000 in your browser

# 4. Check WebSocket connection
# Look for "[WebSocket] Connected" in browser console
```

## Features

### 🔍 Static Analysis (Analyzer Tab)
Analyze Solidity smart contracts for vulnerabilities and code quality issues.

**How to Use:**
1. Ensure backend is running (`./start.sh` or `cd backend && pnpm run dev`)
2. Navigate to the **Analyzer** tab
3. Enter your **Project Root Path** (e.g., `/path/to/hardhat/project`)
4. Select analysis tools: **Slither** (fast) or **Mythril** (thorough)
5. Click **Start Analysis**
6. View results in the **Findings** tab

**Requirements:**
- Valid Hardhat or Foundry project with Solidity contracts
- Slither and/or Mythril installed locally
- Backend must be running on port 8787

### 🛡️ Vulnerability Detection (Findings Tab)
- Categorized findings by severity (Critical, High, Medium, Low, Info)
- Detailed descriptions with file locations and line numbers
- Interactive filtering by severity, tool, and impact
- Export reports for documentation

### 📊 Gas Profiling (Trends Tab)
- Historical gas usage trends for contracts
- Visual charts showing gas consumption over time
- Optimization insights and comparisons
- Track gas costs across multiple transactions

### 🔔 Real-Time Monitoring (Monitor Tab)
- Subscribe to contract addresses for activity alerts
- Live WebSocket notifications
- Transaction event tracking
- Unsubscribe/manage monitored addresses

### 🌲 Transaction Traces (Main Tab)
- Interactive call tree visualization
- Detailed gas usage per call
- Error detection and stack traces
- Step-by-step execution flow

## Usage Examples

### Example 1: Analyze a Local Smart Contract Project

```bash
# 1. Ensure you have a Hardhat/Foundry project
cd /path/to/your/project
ls contracts/  # Should show .sol files

# 2. Start EtherScope
cd /path/to/EtherScope
./start.sh

# 3. In the browser (http://localhost:3000):
#    - Go to "Analyzer" tab
#    - Enter Project Root: /path/to/your/project
#    - Select Tool: Slither
#    - Click "Start Analysis"
#    - Check "Findings" tab for results
```

### Example 2: Inspect an Ethereum Transaction

```bash
# 1. Get a transaction hash from Etherscan
# Example: 0x1234...abcd

# 2. In EtherScope (http://localhost:3000):
#    - Go to "Transaction" tab
#    - Enter transaction hash
#    - View call tree, gas usage, and state changes
```

### Example 3: Monitor a Contract Address

```bash
# 1. In EtherScope (http://localhost:3000):
#    - Go to "Monitor" tab
#    - Enter contract address (0x...)
#    - Click "Subscribe"
#    - Receive real-time alerts for new transactions
```

### Example 4: Analyze Gas Trends

```bash
# 1. In EtherScope (http://localhost:3000):
#    - Go to "Trends" tab
#    - Enter contract address
#    - View historical gas usage charts
#    - Identify optimization opportunities
```

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

### Verifying Configuration

```bash
# Check backend configuration
cd backend && pnpm run dev

# Check frontend can reach backend
curl http://localhost:8787/health

# Test Etherscan integration
curl http://localhost:8787/etherscan/block/latest
```

## Troubleshooting

### "Run Slither Analysis" Button Doesn't Work

**Problem:** Clicking the button shows no response or errors.

**Solutions:**

1. **Backend not running:**
   ```bash
   # Check if backend is running
   lsof -i :8787

   # If nothing shows, start the backend
   cd backend && pnpm run dev
   ```

2. **Slither not installed:**
   ```bash
   # Check if Slither is available
   which slither

   # If not found, install it
   pip install slither-analyzer
   ```

3. **Invalid project path:**
   - Ensure the project root path exists
   - Path should point to a Hardhat or Foundry project
   - Must contain a `contracts/` directory with `.sol` files

4. **Check browser console:**
   - Open DevTools (F12)
   - Look for API errors or network failures
   - Verify WebSocket connection is established

### Backend Connection Errors

**Error:** `Failed to fetch` or `Network error`

**Solutions:**
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

**Solutions:**
1. Create `backend/.env` file with valid API key:
   ```
   ETHERSCAN_API_KEY=your_actual_key_here
   ```
2. Get a free key from [Etherscan.io](https://etherscan.io/apis)
3. Restart backend after adding the key

### WebSocket Connection Issues

**Problem:** Real-time updates not working

**Solutions:**
1. Verify WebSocket URL in `frontend/.env.local`:
   ```
   NEXT_PUBLIC_WS_URL=ws://localhost:8787
   ```
2. Check browser console for WebSocket errors
3. Ensure no firewall blocking port 8787

### Port Already in Use

**Error:** `EADDRINUSE: address already in use :::8787`

**Solutions:**
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

# Type checking
pnpm typecheck
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
