# EtherScope

> **EVM Transaction Debugger & Analyzer**

EtherScope is a comprehensive Ethereum analysis platform providing transaction lookup, block exploration, contract analysis, vulnerability detection, gas profiling, and real-time monitoring for Ethereum smart contracts.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org)
[![pnpm](https://img.shields.io/badge/pnpm-workspace-orange.svg)](https://pnpm.io)

---

## 📑 Table of Contents

- [Features](#-features)
- [Quick Start](#-quick-start)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [Project Structure](#-project-structure)
- [Development](#-development)
- [Deployment](#-deployment)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)

---

## ✨ Features

EtherScope provides 7 main feature modules, each accessible through a dedicated tab:

### 🔍 Tx Lookup
Look up any Ethereum transaction by its hash. View comprehensive transaction details including:
- Sender/receiver addresses
- Value transferred
- Gas usage and pricing
- Input data and decoded parameters
- Event logs from transaction receipt
- Internal transactions

### 📦 Blocks
Browse Ethereum blockchain blocks with intuitive navigation:
- View block details (miner, gas used, timestamp, transaction count)
- Navigate through blocks (previous/next)
- Paginated transaction lists
- Click any transaction to view details

### 📜 Contract
Analyze verified smart contracts:
- View source code and ABI
- Check contract balance
- Browse recent transaction history
- Run static analysis (Slither/Mythril)
- Navigate directly to analysis findings

### 🔬 Analyzer
Run static analysis on local Solidity projects:
- Support for Hardhat and Foundry projects
- Multiple analysis tools (Slither, Mythril)
- Real-time analysis results via WebSocket
- Detailed vulnerability reports with severity levels

### 🐛 Findings
Browse and filter vulnerability findings:
- Filter by severity (Critical, High, Medium, Low, Info)
- Filter by analysis tool
- View detailed descriptions with file locations and line numbers
- Export findings for reporting

### 📊 Trends
Visualize historical gas usage trends:
- Contract gas consumption over time
- Interactive charts and graphs
- Gas optimization insights
- Identify expensive operations

### 👁️ Monitor
Real-time contract activity monitoring:
- Subscribe to contract addresses
- Receive instant WebSocket alerts
- Track transaction events
- Manage monitored addresses

### 💼 Wallet Connection
MetaMask integration:
- Connect wallet with one click
- View connected address and balance
- Support for multiple networks (Ethereum, Sepolia, Polygon, Mumbai)
- Network switching

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 18.0.0
- **pnpm** (will be installed automatically if missing)
- **Etherscan API Key** ([Get free API key](https://etherscan.io/apis))

### One-Command Setup (Recommended)

```bash
# 1. Clone the repository
git clone <your-repository-url>
cd EtherScope

# 2. Run automated setup
./setup.sh

# 3. Start the application
./start.sh
```

The setup script will:
- ✅ Check system requirements
- ✅ Install dependencies
- ✅ Configure environment variables
- ✅ Create necessary directories

Access the application:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8787
- **WebSocket**: ws://localhost:8787

### Verify Installation

```bash
# Check backend health
curl http://localhost:8787/health
# Expected: {"ok":true}

# Open frontend
open http://localhost:3000  # macOS
# or visit http://localhost:3000 in your browser
```

---

## 📥 Installation

### Manual Installation

If you prefer manual setup or the automated script fails:

#### Step 1: Install pnpm

```bash
# Install pnpm globally
npm install -g pnpm

# Verify installation
pnpm --version
```

#### Step 2: Clone and Install Dependencies

```bash
# Clone repository
git clone <your-repository-url>
cd EtherScope

# Install all workspace dependencies
pnpm install
```

This will install dependencies for:
- Root workspace
- Backend (`@etherscope/backend`)
- Frontend (`@etherscope/frontend`)
- Packages (`core`, `cli`, `adapters`)

#### Step 3: Configure Backend

```bash
# Copy environment template
cp backend/.env.example backend/.env

# Edit configuration
nano backend/.env  # or use your preferred editor
```

**Minimum required configuration:**

```bash
# backend/.env
ETHERSCAN_API_KEY=your_etherscan_api_key_here
```

**Full configuration options:**

```bash
# Required
ETHERSCAN_API_KEY=your_etherscan_api_key

# Optional - RPC Endpoints
MAINNET_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/your_key
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your_key
ALCHEMY_API_KEY=your_alchemy_key

# Optional - Server Configuration
PORT=8787
NODE_ENV=development
DB_PATH=./data/backend.sqlite
```

#### Step 4: Configure Frontend

```bash
# Frontend config is auto-created by start.sh
# Or manually create:
cat > frontend/.env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:8787
NEXT_PUBLIC_WS_URL=ws://localhost:8787
EOF
```

#### Step 5: Start Services

**Option A: Use start script (recommended)**

```bash
./start.sh
```

**Option B: Start manually in separate terminals**

```bash
# Terminal 1 - Backend
cd backend
pnpm run dev

# Terminal 2 - Frontend
cd frontend
pnpm run dev
```

---

## ⚙️ Configuration

### Backend Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ETHERSCAN_API_KEY` | ✅ Yes | - | Etherscan API key for blockchain data |
| `PORT` | ❌ No | 8787 | Backend server port |
| `MAINNET_RPC_URL` | ❌ No | - | Ethereum mainnet RPC endpoint |
| `SEPOLIA_RPC_URL` | ❌ No | - | Sepolia testnet RPC endpoint |
| `ALCHEMY_API_KEY` | ❌ No | - | Alchemy API key (if using Alchemy RPC) |
| `DB_PATH` | ❌ No | ./data/backend.sqlite | SQLite database file path |
| `NODE_ENV` | ❌ No | development | Environment mode |

### Frontend Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | ✅ Yes | http://localhost:8787 | Backend API base URL |
| `NEXT_PUBLIC_WS_URL` | ✅ Yes | ws://localhost:8787 | WebSocket server URL |

### Optional: Static Analysis Tools

For the **Analyzer** feature, install these tools:

```bash
# Python 3.8+ required
python3 --version

# Install Slither (recommended)
pip3 install slither-analyzer
slither --version

# Install Mythril (optional)
pip3 install mythril
myth version
```

---

## 💡 Usage

### Transaction Analysis

1. Navigate to the **Tx Lookup** tab
2. Enter a transaction hash (e.g., `0x123...`)
3. View transaction details, logs, and internal calls

### Block Exploration

1. Go to the **Blocks** tab
2. Navigate through blocks using Previous/Next buttons
3. Click any transaction to view details

### Contract Analysis

1. Open the **Contract** tab
2. Enter a verified contract address
3. View source code, ABI, and balance
4. Click "Analyze" to run static analysis
5. View findings in the **Findings** tab

### Local Project Analysis

1. Navigate to the **Analyzer** tab
2. Enter your local Solidity project path
3. Select analysis tools (Slither/Mythril)
4. Click "Start Analysis"
5. Watch real-time results stream in

### Gas Trends

1. Go to the **Trends** tab
2. Enter a contract address
3. View historical gas usage charts
4. Identify optimization opportunities

### Contract Monitoring

1. Open the **Monitor** tab
2. Enter contract address to monitor
3. Click "Subscribe"
4. Receive real-time alerts for transactions

---

## 📁 Project Structure

```
EtherScope/
├── frontend/                 # Next.js 14 web application
│   ├── src/
│   │   ├── app/             # Next.js app router pages
│   │   ├── components/      # React components
│   │   ├── lib/             # Utilities and types
│   │   ├── hooks/           # Custom React hooks
│   │   └── providers/       # Context providers
│   ├── public/              # Static assets
│   ├── .env.local           # Frontend config (git ignored)
│   └── package.json
│
├── backend/                  # Express.js API server
│   ├── src/
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   ├── db/              # Database (SQLite)
│   │   ├── jobs/            # Job queue for analysis
│   │   ├── ws/              # WebSocket handlers
│   │   └── config/          # Configuration
│   ├── data/                # SQLite database files
│   ├── dist/                # Compiled JavaScript (git ignored)
│   ├── .env                 # Backend config (git ignored)
│   └── package.json
│
├── packages/                 # Shared packages
│   ├── core/                # Core types and utilities
│   ├── cli/                 # Command-line interface
│   └── adapters/            # Analysis tool adapters
│       ├── slither/         # Slither adapter
│       └── mythril/         # Mythril adapter
│
├── contracts/                # Solidity smart contracts (Foundry)
│   ├── src/                 # Contract source code
│   ├── test/                # Contract tests
│   └── lib/                 # Dependencies (forge-std)
│
├── setup.sh                  # 🔧 Automated setup script
├── start.sh                  # 🚀 Quick start script
├── pnpm-workspace.yaml      # pnpm workspace configuration
├── .gitignore               # Git ignore rules
├── README.md                # This file
└── DEPLOYMENT.md            # Detailed deployment guide
```

---

## 🛠️ Development

### Development Workflow

```bash
# Install dependencies
pnpm install

# Start development servers
./start.sh

# Run tests (if available)
pnpm test

# Build for production
pnpm run build

# Lint code
pnpm run lint
```

### Working with Workspace Packages

This is a **pnpm workspace** monorepo. To work on individual packages:

```bash
# Run command in specific package
pnpm --filter @etherscope/backend dev
pnpm --filter @etherscope/frontend build

# Add dependency to specific package
pnpm --filter @etherscope/backend add express

# Run command in all packages
pnpm -r run build
```

### Technology Stack

#### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Query (@tanstack/react-query)
- **Web3**: ethers.js
- **Real-time**: WebSocket
- **Charts**: Recharts

#### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: SQLite (better-sqlite3)
- **Real-time**: ws (WebSocket)
- **Blockchain API**: Etherscan API
- **Validation**: Zod

#### Analysis Tools
- **Slither**: Solidity static analysis
- **Mythril**: Security analysis framework

---

## 🚢 Deployment

### Development Deployment

Already covered in [Quick Start](#-quick-start) and [Installation](#-installation).

### Production Deployment

For production deployment, see the detailed [DEPLOYMENT.md](./DEPLOYMENT.md) guide which covers:

- **System Requirements**: Detailed prerequisites for production
- **PM2 Process Management**: Keep services running
- **Nginx Reverse Proxy**: Production-grade web server
- **SSL/HTTPS**: Secure your deployment with Let's Encrypt
- **Environment Security**: Best practices for secrets management
- **Performance Optimization**: Caching, compression, and more
- **Monitoring**: Logging and health checks

**Quick production build:**

```bash
# Build all packages
pnpm run build

# Start backend (production mode)
cd backend
pnpm run start

# Start frontend (production mode)
cd frontend
pnpm run start
```

---

## 🐛 Troubleshooting

### Common Issues and Solutions

#### ❌ Port Already in Use

**Error**: `EADDRINUSE: address already in use :::8787`

**Solution**:
```bash
# Find and kill the process
lsof -i :8787
kill -9 <PID>

# Or use a different port
echo "PORT=8788" >> backend/.env
```

#### ❌ pnpm Not Found

**Solution**:
```bash
npm install -g pnpm
```

#### ❌ Backend Connection Failed

**Error**: `Failed to fetch` or `Network error`

**Solution**:
```bash
# 1. Verify backend is running
curl http://localhost:8787/health

# 2. Check frontend .env.local
cat frontend/.env.local
# Should have:
# NEXT_PUBLIC_API_URL=http://localhost:8787
# NEXT_PUBLIC_WS_URL=ws://localhost:8787

# 3. Check for CORS issues in browser console

# 4. Restart services
./start.sh
```

#### ❌ Etherscan API Errors

**Error**: `Invalid API Key` or `Rate limit exceeded`

**Solution**:
```bash
# 1. Get API key from https://etherscan.io/apis

# 2. Add to backend/.env
echo "ETHERSCAN_API_KEY=your_key_here" >> backend/.env

# 3. Restart backend
cd backend && pnpm run dev

# 4. For rate limits, wait or upgrade API tier
# Free tier: 5 calls/sec, 100k calls/day
```

#### ❌ Slither Not Found

**Error**: `slither: command not found`

**Solution**:
```bash
# Install Slither
pip3 install slither-analyzer

# Verify installation
which slither
slither --version

# If installed but not in PATH
echo 'export PATH="$PATH:$HOME/.local/bin"' >> ~/.bashrc
source ~/.bashrc
```

#### ❌ WebSocket Connection Failed

**Problem**: Real-time updates not working

**Solution**:
```bash
# 1. Check WebSocket URL
cat frontend/.env.local
# Should be: NEXT_PUBLIC_WS_URL=ws://localhost:8787

# 2. Check browser console for errors

# 3. Verify no firewall blocking port 8787

# 4. Test WebSocket endpoint
# Use a WebSocket client or browser extension
```

#### ❌ Missing Source Files

**Error**: `Cannot find module 'frontend/src/lib/types.ts'`

**Solution**:
```bash
# Pull latest code (gitignore was fixed)
git pull origin main

# Verify files exist
ls frontend/src/lib/types.ts
ls frontend/src/lib/utils.ts

# If still missing, check git status
git status
```

#### ❌ Build Errors

**Error**: TypeScript compilation errors

**Solution**:
```bash
# Clean and rebuild
rm -rf node_modules */node_modules */dist */.next
pnpm install
pnpm run build

# If adapter build fails, see BUILD_FIXES.md
```

#### ❌ Database Locked

**Error**: `database is locked`

**Solution**:
```bash
# Stop all backend processes
pkill -f "tsx watch"

# Remove lock files
rm -f backend/data/*.sqlite-shm
rm -f backend/data/*.sqlite-wal

# Restart
cd backend && pnpm run dev
```

### Getting Help

1. Check [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment issues
2. Check [BUILD_FIXES.md](./BUILD_FIXES.md) for build-related problems
3. Review logs in terminal output
4. Open an issue on GitHub with:
   - Error message
   - Steps to reproduce
   - System info (OS, Node version, pnpm version)

---

## 📚 Additional Documentation

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Complete deployment guide with production setup
- **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** - Step-by-step deployment checklist
- **[BUILD_FIXES.md](./BUILD_FIXES.md)** - Known build issues and solutions
- **[backend/.env.example](./backend/.env.example)** - Backend environment variable reference
- **[frontend/.env.example](./frontend/.env.example)** - Frontend environment variable reference

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow existing code style
- Write clear commit messages
- Add tests for new features
- Update documentation as needed
- Ensure all builds pass (`pnpm run build`)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Etherscan** for blockchain data API
- **Slither** for Solidity static analysis
- **Mythril** for security analysis
- **Next.js** team for the amazing framework
- **pnpm** for fast, efficient package management

---

## 📞 Support

- 📧 **Email**: [your-email@example.com]
- 🐛 **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)

---

**Happy Analyzing! 🚀**

Built with ❤️ for the Ethereum community
