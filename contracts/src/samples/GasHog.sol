// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title GasHog — intentionally gas-inefficient contract for EtherScope gas-advice demo
/// @notice Contains common gas anti-patterns that the profiler should flag.
contract GasHog {
    // Anti-pattern 1: storage reads/writes in a loop
    uint256[] public data;
    mapping(address => uint256) public scores;

    /// @notice Wasteful: reads storage length every iteration + repeated SSTORE
    function pushMany(uint256 count) external {
        for (uint256 i = 0; i < count; i++) {
            data.push(i); // SSTORE each iteration
        }
    }

    /// @notice Wasteful: repeated SLOAD of mapping in a loop
    function incrementScore(address user, uint256 times) external {
        for (uint256 i = 0; i < times; i++) {
            scores[user] += 1; // SLOAD + SSTORE each iteration
        }
    }

    /// @notice Wasteful: copying large arrays to memory
    function sumAll() external view returns (uint256 total) {
        uint256[] memory copy = data; // copies entire array to memory
        for (uint256 i = 0; i < copy.length; i++) {
            total += copy[i];
        }
    }

    /// @notice Wasteful: unnecessary external self-calls
    function indirectSum() external view returns (uint256) {
        return this.sumAll(); // CALL to self instead of internal call
    }

    /// @notice Optimized version for comparison
    function sumAllOptimized() external view returns (uint256 total) {
        uint256 len = data.length;
        for (uint256 i; i < len; ++i) {
            total += data[i];
        }
    }
}
