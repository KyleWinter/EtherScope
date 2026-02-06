# EtherScope Contracts - Quick Start Guide

## Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation) installed
- Node.js 16+ (optional, for backend integration)

## 1. Setup

```bash
cd contracts

# Install dependencies
forge install

# Compile contracts
forge build
```

## 2. Run Tests

```bash
# Run all tests
forge test -vv

# Run integration tests
forge test --match-path test/integration/FullAnalysis.t.sol -vvv

# Generate gas report
forge test --gas-report
```

Expected output:
```
Ran 2 test suites: 10 tests passed, 0 failed
```

## 3. Deploy Locally (Anvil)

Terminal 1 - Start Anvil:
```bash
anvil
```

Terminal 2 - Deploy:
```bash
# Deploy to local anvil
forge script script/Deploy.s.sol \
  --rpc-url http://127.0.0.1:8545 \
  --broadcast

# Check deployment output
cat deployments/deployments-31337.json
```

## 4. Deploy to Sepolia Testnet

```bash
# Set environment variables
export SEPOLIA_RPC_URL="https://sepolia.infura.io/v3/YOUR_KEY"
export PRIVATE_KEY="your_private_key"
export ETHERSCAN_API_KEY="your_etherscan_key"

# Deploy and verify
forge script script/Deploy.s.sol \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast \
  --verify

# Check deployment
cat deployments/deployments-11155111.json
```

## 5. Interact with Contracts

### Using Foundry Cast

```bash
# Read deployment addresses
TRACE_HELPER=$(jq -r '.contracts.analyzer.TraceHelper' deployments/deployments-31337.json)
VULN_VAULT=$(jq -r '.contracts.samples.VulnerableVault' deployments/deployments-31337.json)

# Deposit to VulnerableVault
cast send $VULN_VAULT "deposit()" \
  --value 1ether \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Check balance
cast call $VULN_VAULT "balances(address)(uint256)" \
  0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
```

### Using Python (Backend Integration)

```python
from web3 import Web3
import json

# Connect to node
w3 = Web3(Web3.HTTPProvider('http://127.0.0.1:8545'))

# Load deployment
with open('deployments/deployments-31337.json') as f:
    deployment = json.load(f)

trace_helper_addr = deployment['contracts']['analyzer']['TraceHelper']
print(f"TraceHelper deployed at: {trace_helper_addr}")

# Load contract (you'll need the ABI)
# trace_helper = w3.eth.contract(address=trace_helper_addr, abi=trace_helper_abi)
```

## 6. Example: Run Reentrancy Attack Demo

```bash
# Start anvil
anvil

# In another terminal
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast

# Run reentrancy test
forge test --match-test test_VulnerableVault_Reentrancy -vvv
```

Watch the attack in action:
```
=== Test 6: Reentrancy Attack Detection ===
  Vault balance before attack: 10000000000000000000
  Vault balance after attack:  0
  Attacker balance after:      12000000000000000000
  ETH stolen:                  10000000000000000000
  [OK] Reentrancy vulnerability demonstrated
  [WARNING] EtherScope should detect this pattern!
```

## 7. Contract Addresses (Update After Deployment)

### Local Anvil (Chain ID: 31337)
```
TraceHelper:       0x...
StorageInspector:  0x...
BatchStateReader:  0x...
VulnerableVault:   0x...
SafeVault:         0x...
GasHog:            0x...
```

### Sepolia Testnet (Chain ID: 11155111)
```
TraceHelper:       0x...
StorageInspector:  0x...
BatchStateReader:  0x...
SafeVault:         0x...
```

⚠️ **Note**: Never deploy vulnerable contracts to mainnet!

## 8. Next Steps

1. **Backend Integration**: Update backend config with deployed addresses
2. **Frontend Integration**: Use deployment JSON for contract addresses
3. **Testing**: Run integration tests with real transactions
4. **Monitoring**: Set up event indexing for TraceHelper events

## Common Issues

### Issue: "Stack too deep" error
**Solution**: Already configured with `via_ir = true` in `foundry.toml`

### Issue: Tests fail with Unicode characters
**Solution**: Fixed - now using ASCII characters only

### Issue: Reentrancy attack fails
**Solution**: VulnerableVault uses `unchecked` to demonstrate classic reentrancy

## Useful Commands

```bash
# Format code
forge fmt

# Generate coverage report
forge coverage

# Gas snapshot
forge snapshot

# Clean build artifacts
forge clean

# Update dependencies
forge update

# Verify contract on Etherscan
forge verify-contract \
  --chain-id 11155111 \
  --compiler-version v0.8.28 \
  CONTRACT_ADDRESS \
  src/path/Contract.sol:ContractName \
  --etherscan-api-key $ETHERSCAN_API_KEY
```

## Documentation

- Full README: [README.md](./README.md)
- Contract Documentation: See inline comments in `src/`
- Integration Tests: `test/integration/FullAnalysis.t.sol`

## Support

For issues or questions:
- Check the [main project README](../README.md)
- Review test cases for usage examples
- Examine contract comments for detailed explanations
