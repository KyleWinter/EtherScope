// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title Types — shared structs for EtherScope on-chain helpers
library Types {
    /// @notice A single call record captured during proxy-execution
    struct CallRecord {
        address from;
        address to;
        bytes4 selector;
        uint256 value;
        uint256 gasUsed;
        bool success;
        bytes returnData;
    }

    /// @notice A single storage slot diff
    struct StateDiffItem {
        address account;
        bytes32 slot;
        bytes32 previousValue;
        bytes32 newValue;
    }

    /// @notice Token balance query for batch reader
    struct TokenQuery {
        address token; // address(0) = native ETH
        address account;
    }

    /// @notice Result from a batch balance read
    struct BalanceResult {
        address token;
        address account;
        uint256 balance;
    }

    /// @notice ERC-20 allowance query
    struct AllowanceQuery {
        address token;
        address owner;
        address spender;
    }

    /// @notice Result from a batch allowance read
    struct AllowanceResult {
        address token;
        address owner;
        address spender;
        uint256 allowance;
    }
}
