// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title Addresses — centralized address registry for deployed EtherScope contracts
/// @notice Update these addresses after deployment for easy reference in tests & scripts.
///         This library provides a type-safe, compile-time address registry.
library Addresses {
    // ──────────── Network IDs ────────────

    uint256 constant MAINNET = 1;
    uint256 constant SEPOLIA = 11155111;
    uint256 constant ANVIL = 31337;

    // ──────────── Analyzer Contracts ────────────

    struct AnalyzerContracts {
        address traceHelper;
        address storageInspector;
        address batchStateReader;
    }

    struct SampleContracts {
        address vulnerableVault;
        address reentrancyAttacker;
        address safeVault;
        address gasHog;
    }

    struct Deployment {
        AnalyzerContracts analyzer;
        SampleContracts samples;
    }

    // ──────────── Anvil (Local) Addresses ────────────

    /// @notice Returns deployed addresses for Anvil local network
    /// @dev Update these after running: forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
    function getAnvilAddresses() internal pure returns (Deployment memory) {
        return Deployment({
            analyzer: AnalyzerContracts({
                traceHelper: address(0), // TODO: Update after deployment
                storageInspector: address(0),
                batchStateReader: address(0)
            }),
            samples: SampleContracts({
                vulnerableVault: address(0),
                reentrancyAttacker: address(0),
                safeVault: address(0),
                gasHog: address(0)
            })
        });
    }

    // ──────────── Sepolia Addresses ────────────

    /// @notice Returns deployed addresses for Sepolia testnet
    /// @dev Update these after running: forge script script/Deploy.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast --verify
    function getSepoliaAddresses() internal pure returns (Deployment memory) {
        return Deployment({
            analyzer: AnalyzerContracts({
                traceHelper: address(0), // TODO: Update after deployment
                storageInspector: address(0),
                batchStateReader: address(0)
            }),
            samples: SampleContracts({
                vulnerableVault: address(0),
                reentrancyAttacker: address(0),
                safeVault: address(0),
                gasHog: address(0)
            })
        });
    }

    // ──────────── Mainnet Addresses (DO NOT DEPLOY VULNERABLE CONTRACTS) ────────────

    /// @notice Returns deployed addresses for Ethereum mainnet
    /// @dev IMPORTANT: Only deploy analyzer helpers to mainnet, NOT vulnerable sample contracts!
    function getMainnetAddresses() internal pure returns (Deployment memory) {
        return Deployment({
            analyzer: AnalyzerContracts({
                traceHelper: address(0),
                storageInspector: address(0),
                batchStateReader: address(0)
            }),
            samples: SampleContracts({
                vulnerableVault: address(0), // DO NOT DEPLOY
                reentrancyAttacker: address(0), // DO NOT DEPLOY
                safeVault: address(0),
                gasHog: address(0)
            })
        });
    }

    // ──────────── Convenience Getter ────────────

    /// @notice Returns deployment addresses for the current chain
    function getCurrent() internal view returns (Deployment memory) {
        uint256 chainId = block.chainid;

        if (chainId == ANVIL) {
            return getAnvilAddresses();
        } else if (chainId == SEPOLIA) {
            return getSepoliaAddresses();
        } else if (chainId == MAINNET) {
            return getMainnetAddresses();
        } else {
            revert("Unsupported chain");
        }
    }

    // ──────────── Helper Functions ────────────

    /// @notice Check if a deployment is complete (all addresses are non-zero)
    function isDeployed(Deployment memory deployment) internal pure returns (bool) {
        return deployment.analyzer.traceHelper != address(0) &&
               deployment.analyzer.storageInspector != address(0) &&
               deployment.analyzer.batchStateReader != address(0);
    }

    /// @notice Get all analyzer contract addresses as an array
    function getAnalyzerAddresses(Deployment memory deployment) internal pure returns (address[] memory) {
        address[] memory addresses = new address[](3);
        addresses[0] = deployment.analyzer.traceHelper;
        addresses[1] = deployment.analyzer.storageInspector;
        addresses[2] = deployment.analyzer.batchStateReader;
        return addresses;
    }

    /// @notice Get all sample contract addresses as an array
    function getSampleAddresses(Deployment memory deployment) internal pure returns (address[] memory) {
        address[] memory addresses = new address[](4);
        addresses[0] = deployment.samples.vulnerableVault;
        addresses[1] = deployment.samples.reentrancyAttacker;
        addresses[2] = deployment.samples.safeVault;
        addresses[3] = deployment.samples.gasHog;
        return addresses;
    }
}
