# EtherScope Smart Contracts

This directory contains all on-chain helper contracts and sample contracts for the EtherScope transaction analyzer.

## Directory Structure

```
contracts/
├── src/
│   ├── analyzer/           # On-chain helper contracts
│   │   ├── Types.sol       # Shared data structures
│   │   ├── TraceHelper.sol # Proxy execution & trace events
│   │   ├── StorageInspector.sol # Storage slot utilities
│   │   └── BatchStateReader.sol # Batch balance/allowance reader
│   └── samples/            # Demo contracts for testing
│       ├── VulnerableVault.sol  # Contains vulnerabilities
│       ├── SafeVault.sol        # Secure implementation
│       └── GasHog.sol           # Gas-inefficient patterns
├── script/
│   ├── Deploy.s.sol        # Deployment script
│   └── Addresses.sol       # Address registry
├── test/
│   └── integration/
│       └── FullAnalysis.t.sol # Comprehensive integration tests
└── deployments/            # Deployment outputs (JSON)
```

## Quick Start

### 1. Install Dependencies

```bash
cd contracts
forge install
```

### 2. Compile Contracts

```bash
forge build
```

### 3. Run Tests

```bash
# Run all tests
forge test -vvv

# Run integration tests only
forge test --match-path test/integration/FullAnalysis.t.sol -vvv

# Run specific test
forge test --match-test test_TraceHelper_SingleCall -vvv
```

### 4. Deploy Contracts

#### Local Anvil

```bash
# Terminal 1: Start Anvil
anvil

# Terminal 2: Deploy
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
```

#### Sepolia Testnet

```bash
# Set environment variables
export SEPOLIA_RPC_URL="https://sepolia.infura.io/v3/YOUR_KEY"
export PRIVATE_KEY="your_private_key"

# Deploy
forge script script/Deploy.s.sol \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast \
  --verify
```

Deployment addresses will be saved to `deployments/deployments-<chainId>.json`.

## Contract Overview

### Analyzer Contracts

#### 1. TraceHelper.sol

**Purpose**: Proxy execution with event emission for trace analysis.

**Key Features**:
- `proxyCall()`: Execute single call with trace events
- `batchProxyCall()`: Execute multiple calls sequentially
- `label()`: Emit custom debug labels
- Emits `CallStarted` and `CallEnded` events for each call

**Usage**:
```solidity
TraceHelper helper = TraceHelper(0x...);

// Single call
(bool success, bytes memory data) = helper.proxyCall{value: 1 ether}(
    targetContract,
    abi.encodeWithSignature("deposit()"),
    1 ether
);

// Batch calls
address[] memory targets = [addr1, addr2];
bytes[] memory data = [data1, data2];
uint256[] memory values = [val1, val2];

Types.CallRecord[] memory records = helper.batchProxyCall(
    targets, data, values, false
);
```

#### 2. StorageInspector.sol

**Purpose**: Compute storage slots for mappings, arrays, and proxies.

**Key Features**:
- `mappingSlot()`: Compute slot for `mapping[key]`
- `nestedMappingSlot()`: Compute slot for `mapping[key1][key2]`
- `dynamicArraySlot()`: Compute starting slot for dynamic arrays
- EIP-1967 proxy slot constants

**Usage**:
```solidity
StorageInspector inspector = StorageInspector(0x...);

// Compute mapping slot: balances[alice]
bytes32 slot = inspector.mappingSlotAddr(
    bytes32(uint256(0)), // base slot
    alice                // key
);

// Read EIP-1967 implementation
address impl = inspector.getEIP1967Implementation(proxyAddress);
```

#### 3. BatchStateReader.sol

**Purpose**: Batch-read balances and allowances in a single `eth_call`.

**Key Features**:
- `getEthBalances()`: Read native ETH balances
- `getTokenBalances()`: Read ERC-20 balances
- `getAllowances()`: Read ERC-20 allowances
- `getBalancesAndAllowances()`: Combined read

**Usage**:
```solidity
BatchStateReader reader = BatchStateReader(0x...);

// Read ETH balances
address[] memory accounts = [alice, bob, charlie];
uint256[] memory balances = reader.getEthBalances(accounts);

// Read token balances
Types.TokenQuery[] memory queries = new Types.TokenQuery[](2);
queries[0] = Types.TokenQuery(tokenAddr, alice);
queries[1] = Types.TokenQuery(tokenAddr, bob);

Types.BalanceResult[] memory results = reader.getTokenBalances(queries);
```

### Sample Contracts

#### 1. VulnerableVault.sol

**Purpose**: Demonstration of common vulnerabilities for EtherScope to detect.

**Vulnerabilities**:
- ❌ Reentrancy in `withdraw()`
- ❌ Unchecked low-level call in `unsafeSend()`
- ❌ Missing access control in `emergencyWithdraw()`
- ❌ Dangerous delegatecall in `execute()`

**⚠️ DO NOT DEPLOY TO MAINNET**

#### 2. SafeVault.sol

**Purpose**: Secure implementation demonstrating best practices.

**Security Features**:
- ✅ Checks-effects-interactions pattern
- ✅ Reentrancy guard
- ✅ Access control with `onlyOwner`
- ✅ Safe ETH transfers

#### 3. GasHog.sol

**Purpose**: Demonstrate gas-inefficient patterns for profiler testing.

**Anti-patterns**:
- 🐌 Storage reads in loop
- 🐌 Repeated SSTORE operations
- 🐌 Unnecessary memory copies
- 🐌 External self-calls instead of internal

Also includes optimized versions for comparison.

## Integration Tests

The `test/integration/FullAnalysis.t.sol` file contains a comprehensive test suite:

1. ✅ **TraceHelper Single Call** - Basic proxy execution
2. ✅ **TraceHelper Batch Call** - Multiple calls with events
3. ✅ **StorageInspector Slot Computation** - Mapping/array slots
4. ✅ **BatchStateReader Balances** - ETH balance reading
5. ✅ **GasHog Profiling** - Gas comparison tests
6. ✅ **Vulnerability Detection** - Reentrancy attack demo
7. ✅ **Safe Contract Verification** - Protected vault test
8. ✅ **Full Workflow** - End-to-end trace + gas + storage
9. ✅ **Edge Cases** - Error handling & failed calls

Run with:
```bash
forge test --match-path test/integration/FullAnalysis.t.sol -vvv
```

## Gas Optimization

Contracts are optimized with:
- Compiler optimization enabled (200 runs)
- Efficient storage patterns
- Minimal external calls
- Batch operations where possible

## Backend Integration

### Reading Deployment Addresses

After deployment, read addresses from JSON:

```python
import json

with open('deployments/deployments-11155111.json') as f:
    deployment = json.load(f)

trace_helper = deployment['contracts']['analyzer']['TraceHelper']
vuln_vault = deployment['contracts']['samples']['VulnerableVault']
```

### Using with Backend

```python
from web3 import Web3

# Connect to node
w3 = Web3(Web3.HTTPProvider(RPC_URL))

# Load TraceHelper
trace_helper = w3.eth.contract(
    address=trace_helper_addr,
    abi=trace_helper_abi
)

# Execute traced call
tx = trace_helper.functions.proxyCall(
    target_addr,
    calldata,
    value
).transact({'from': sender, 'value': value})

# Get trace with events
receipt = w3.eth.wait_for_transaction_receipt(tx)
events = trace_helper.events.CallStarted().process_receipt(receipt)
```

## Example Workflow

### 1. Deploy Contracts
```bash
forge script script/Deploy.s.sol --rpc-url $RPC_URL --broadcast
```

### 2. Get Addresses
```bash
cat deployments/deployments-*.json
```

### 3. Update Backend Config
```python
# backend/config.py
TRACE_HELPER_ADDRESS = "0x..."
STORAGE_INSPECTOR_ADDRESS = "0x..."
BATCH_READER_ADDRESS = "0x..."
```

### 4. Run Analysis
```bash
python analyzer/main.py analyze --tx-hash 0x...
```

## Environment Variables

Create `.env` file:

```bash
# RPC endpoints
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
MAINNET_RPC_URL=https://mainnet.infura.io/v3/YOUR_KEY

# Deployment
PRIVATE_KEY=your_private_key_here

# Etherscan verification
ETHERSCAN_API_KEY=your_api_key_here
```

Load with:
```bash
source .env
```

## Verification

Verify contracts on Etherscan:

```bash
forge verify-contract \
  --chain-id 11155111 \
  --compiler-version v0.8.28 \
  CONTRACT_ADDRESS \
  src/analyzer/TraceHelper.sol:TraceHelper \
  --etherscan-api-key $ETHERSCAN_API_KEY
```

## Security Notes

1. **VulnerableVault** is intentionally insecure - NEVER deploy to mainnet
2. **ReentrancyAttacker** is for demonstration only
3. Always test on testnet first
4. Review all transactions before broadcasting
5. Use hardware wallet for mainnet deployments

## Contributing

When adding new contracts:

1. Add to appropriate directory (`analyzer/` or `samples/`)
2. Update `Deploy.s.sol` to include in deployment
3. Add tests to `test/integration/`
4. Update this README
5. Run full test suite

## License

MIT License - See LICENSE file for details.

## Support

For issues or questions:
- GitHub Issues: https://github.com/yourusername/EtherScope/issues
- Documentation: See main project README

## Useful Commands

```bash
# Format code
forge fmt

# Gas report
forge test --gas-report

# Coverage
forge coverage

# Snapshot gas costs
forge snapshot

# Clean build artifacts
forge clean

# Update dependencies
forge update
```
