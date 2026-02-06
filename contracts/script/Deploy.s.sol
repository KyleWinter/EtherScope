// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {TraceHelper} from "../src/analyzer/TraceHelper.sol";
import {StorageInspector} from "../src/analyzer/StorageInspector.sol";
import {BatchStateReader} from "../src/analyzer/BatchStateReader.sol";
import {VulnerableVault, ReentrancyAttacker} from "../src/samples/VulnerableVault.sol";
import {SafeVault} from "../src/samples/SafeVault.sol";
import {GasHog} from "../src/samples/GasHog.sol";

/// @title Deploy — deploys all EtherScope helper & sample contracts
/// @notice Run with: forge script script/Deploy.s.sol --rpc-url <RPC> --broadcast
///         Local anvil: forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
///         Sepolia: forge script script/Deploy.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast --verify
contract DeployScript is Script {
    // Deployed contract addresses (will be populated during deployment)
    TraceHelper public traceHelper;
    StorageInspector public storageInspector;
    BatchStateReader public batchStateReader;

    VulnerableVault public vulnerableVault;
    ReentrancyAttacker public reentrancyAttacker;
    SafeVault public safeVault;
    GasHog public gasHog;

    function run() external {
        // Get deployer private key from env or use default anvil key
        uint256 deployerPrivateKey = vm.envOr(
            "PRIVATE_KEY",
            uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80)
        );

        vm.startBroadcast(deployerPrivateKey);

        // ──────────── Deploy Analyzer Helpers ────────────

        console2.log("\n=== Deploying Analyzer Helpers ===");

        traceHelper = new TraceHelper();
        console2.log("TraceHelper deployed at:", address(traceHelper));

        storageInspector = new StorageInspector();
        console2.log("StorageInspector deployed at:", address(storageInspector));

        batchStateReader = new BatchStateReader();
        console2.log("BatchStateReader deployed at:", address(batchStateReader));

        // ──────────── Deploy Sample Contracts ────────────

        console2.log("\n=== Deploying Sample Contracts ===");

        vulnerableVault = new VulnerableVault();
        console2.log("VulnerableVault deployed at:", address(vulnerableVault));

        reentrancyAttacker = new ReentrancyAttacker(address(vulnerableVault));
        console2.log("ReentrancyAttacker deployed at:", address(reentrancyAttacker));

        safeVault = new SafeVault();
        console2.log("SafeVault deployed at:", address(safeVault));

        gasHog = new GasHog();
        console2.log("GasHog deployed at:", address(gasHog));

        // ──────────── Optional: Fund Sample Contracts ────────────

        // Fund vulnerable vault with some ETH for testing
        if (address(vulnerableVault).balance == 0) {
            (bool ok, ) = address(vulnerableVault).call{value: 1 ether}("");
            require(ok, "Failed to fund VulnerableVault");
            console2.log("VulnerableVault funded with 1 ETH");
        }

        vm.stopBroadcast();

        // ──────────── Output Deployment Summary ────────────

        console2.log("\n=== Deployment Summary ===");
        console2.log("Network:", block.chainid);
        console2.log("Deployer:", vm.addr(deployerPrivateKey));
        console2.log("\nAnalyzer Contracts:");
        console2.log("  TraceHelper:       ", address(traceHelper));
        console2.log("  StorageInspector:  ", address(storageInspector));
        console2.log("  BatchStateReader:  ", address(batchStateReader));
        console2.log("\nSample Contracts:");
        console2.log("  VulnerableVault:   ", address(vulnerableVault));
        console2.log("  ReentrancyAttacker:", address(reentrancyAttacker));
        console2.log("  SafeVault:         ", address(safeVault));
        console2.log("  GasHog:            ", address(gasHog));

        // ──────────── Generate JSON Output ────────────

        string memory json = _generateJSON();
        string memory filename = string.concat("deployments-", vm.toString(block.chainid), ".json");
        vm.writeJson(json, string.concat("./deployments/", filename));
        console2.log("\nDeployment addresses written to:", filename);
    }

    /// @notice Generate JSON output for backend/frontend consumption
    function _generateJSON() internal view returns (string memory) {
        string memory json = string.concat(
            '{\n',
            '  "chainId": ', vm.toString(block.chainid), ',\n',
            '  "timestamp": ', vm.toString(block.timestamp), ',\n',
            '  "contracts": {\n',
            '    "analyzer": {\n',
            '      "TraceHelper": "', vm.toString(address(traceHelper)), '",\n',
            '      "StorageInspector": "', vm.toString(address(storageInspector)), '",\n',
            '      "BatchStateReader": "', vm.toString(address(batchStateReader)), '"\n',
            '    },\n',
            '    "samples": {\n',
            '      "VulnerableVault": "', vm.toString(address(vulnerableVault)), '",\n',
            '      "ReentrancyAttacker": "', vm.toString(address(reentrancyAttacker)), '",\n',
            '      "SafeVault": "', vm.toString(address(safeVault)), '",\n',
            '      "GasHog": "', vm.toString(address(gasHog)), '"\n',
            '    }\n',
            '  }\n',
            '}'
        );
        return json;
    }
}
