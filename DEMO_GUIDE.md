# EtherScope Demonstration Guide

## Introduction

**EtherScope** is an EVM transaction debugging and analysis platform that provides comprehensive tools for exploring and analyzing Ethereum smart contracts. It offers transaction lookup, block exploration, contract analysis with integrated vulnerability detection (Slither/Mythril), gas profiling, and real-time monitoring capabilities—all through an intuitive web interface.

The platform combines a Next.js frontend with an Express backend, leveraging the Etherscan API for blockchain data and WebSocket connections for real-time updates.

---

## Demonstration Steps

### 1. **Setup & Installation** (5 minutes)

```bash
# Clone the repository (if needed)
cd /Users/tanzhiwen/Documents/code/NTU/SC6107/EtherScope

# Install dependencies
pnpm install

# Configure Etherscan API key
# Create backend/.env file with:
echo "ETHERSCAN_API_KEY=your_api_key_here" > backend/.env

# Start the application (both frontend & backend)
./start.sh
```

**Verify Setup:**
- Backend should be running on http://localhost:8787
- Frontend should be accessible at http://localhost:3000
- Test backend: `curl http://localhost:8787/health` (should return `{"ok":true}`)

---

### 2. **Feature Demonstrations**

#### **A. Transaction Lookup** (Demo Tab 1)
*Purpose: Analyze any Ethereum transaction*

1. Navigate to the **Tx Lookup** tab
2. Enter a transaction hash (example: `0x...`)
3. View detailed information:
   - Sender/receiver addresses
   - Value transferred
   - Gas used vs gas limit
   - Input data
   - Event logs from the receipt

**Demo Tip:** Use a well-known transaction like a large token transfer or DEX swap

---

#### **B. Block Explorer** (Demo Tab 2)
*Purpose: Browse blockchain blocks*

1. Go to the **Blocks** tab
2. Navigate between blocks using controls
3. Show block details:
   - Block number, miner address
   - Gas used, timestamp
   - Transaction count
4. Click any transaction to jump to Tx Lookup tab

---

#### **C. Contract Analysis** (Demo Tab 3)
*Purpose: Analyze verified smart contracts*

1. Navigate to **Contract** tab
2. Enter a verified contract address (e.g., USDT, USDC, or popular DeFi contract)
3. Display:
   - Source code
   - ABI (Application Binary Interface)
   - Contract balance
   - Recent transaction history
4. **Run static analysis** directly from this view
5. Navigate to findings from the analysis results

**Demo Tip:** Use popular contracts like Uniswap V2 Router or a well-known token

---

#### **D. Static Analysis** (Demo Tab 4)
*Purpose: Run vulnerability detection on local projects*

**Prerequisites:**
```bash
# Install Slither (if not already installed)
pip install slither-analyzer

# Optional: Install Mythril
pip install mythril
```

**Demo Steps:**
1. Go to **Analyzer** tab
2. Point to a local Hardhat or Foundry project root
3. Select analysis tools (Slither or Mythril)
4. Start analysis
5. Watch results stream in **real-time via WebSocket**

**Demo Tip:** Use the included `contracts/` directory in the repo

---

#### **E. Findings Browser** (Demo Tab 5)
*Purpose: Review vulnerability findings*

1. Navigate to **Findings** tab
2. Filter by:
   - Severity: Critical, High, Medium, Low, Info
   - Tool: Slither, Mythril
   - Impact type
3. View detailed descriptions with:
   - File locations
   - Line numbers
   - Remediation suggestions

---

#### **F. Gas Trends** (Demo Tab 6)
*Purpose: Visualize gas usage patterns*

1. Go to **Trends** tab
2. Enter a contract address
3. View historical gas usage charts
4. Identify optimization opportunities

---

#### **G. Real-Time Monitor** (Demo Tab 7)
*Purpose: Track contract activity in real-time*

1. Navigate to **Monitor** tab
2. Subscribe to contract addresses
3. Receive real-time alerts via WebSocket
4. Track transaction events
5. Manage monitored addresses

---

#### **H. Wallet Connection**
*Purpose: Connect MetaMask for on-chain interactions*

1. Click the **Connect Wallet** button in header
2. Connect MetaMask
3. Display shows:
   - Connected address
   - Chain name
   - ETH balance
4. Supports: Ethereum, Goerli, Sepolia, Polygon, Mumbai

---

### 3. **Key Talking Points**

- **Unified Platform**: All-in-one solution for transaction debugging, contract analysis, and monitoring
- **Real-Time Updates**: WebSocket integration for live analysis results and monitoring alerts
- **Industry-Standard Tools**: Integration with Slither and Mythril for vulnerability detection
- **Developer-Friendly**: Clean UI with detailed information and easy navigation between features
- **Production-Ready**: SQLite database, job queue system, comprehensive error handling

---

### 4. **Troubleshooting Quick Reference**

If issues arise during demo:

```bash
# Check backend health
curl http://localhost:8787/health

# Verify Slither installation
which slither

# Check ports
lsof -i :8787
lsof -i :3000

# Restart services
./start.sh
```

---

## Demo Flow Recommendation (10-15 minutes)

1. **Introduction** (1 min) - Explain EtherScope's purpose
2. **Transaction Lookup** (2 min) - Show transaction analysis
3. **Block Explorer** (1 min) - Quick navigation demo
4. **Contract Analysis** (3 min) - Verify contract + run static analysis
5. **Findings** (2 min) - Review vulnerability results
6. **Monitor** (2 min) - Real-time monitoring setup
7. **Wallet Connection** (1 min) - MetaMask integration
8. **Q&A** (3-5 min)

This flow demonstrates all major features while maintaining engagement!

---

## Sample Data for Demo

### Example Transaction Hashes
- Uniswap V2 Swap: `0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22060`
- Large ETH Transfer: `0x1d12e6c9e3e0e8e9a5e8c5e9e8e9e8e9e8e9e8e9e8e9e8e9e8e9e8e9e8e9e8e9`

### Example Contract Addresses
- USDT (Tether): `0xdac17f958d2ee523a2206206994597c13d831ec7`
- USDC (Circle): `0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48`
- Uniswap V2 Router: `0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D`
- Compound cDAI: `0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643`

### Local Project for Analysis
Use the `contracts/` directory in this repository for demonstrating the static analysis feature.

---

## Additional Notes

- Ensure you have a valid Etherscan API key before starting the demo
- Pre-load some analysis results in the database for the Findings tab demonstration
- Keep MetaMask unlocked and on a supported network for wallet connection demo
- Have backup transaction hashes and contract addresses ready in case of network issues
