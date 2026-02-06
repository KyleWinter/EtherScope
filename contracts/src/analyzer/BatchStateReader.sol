// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Types} from "./Types.sol";

/// @title BatchStateReader — batch-read balances & allowances in a single eth_call
/// @notice Reduces RPC round-trips by aggregating multiple balance/allowance queries.
///         Designed to be called via eth_call (view only, no state changes).
contract BatchStateReader {
    // ──────────── Balances ────────────

    /// @notice Batch-read native ETH balances for multiple accounts
    function getEthBalances(
        address[] calldata accounts
    ) external view returns (uint256[] memory balances) {
        balances = new uint256[](accounts.length);
        for (uint256 i; i < accounts.length; ++i) {
            balances[i] = accounts[i].balance;
        }
    }

    /// @notice Batch-read ERC-20 token balances.
    ///         Returns 0 for any query that reverts (e.g. EOA or non-ERC20).
    function getTokenBalances(
        Types.TokenQuery[] calldata queries
    ) external view returns (Types.BalanceResult[] memory results) {
        results = new Types.BalanceResult[](queries.length);
        for (uint256 i; i < queries.length; ++i) {
            Types.TokenQuery calldata q = queries[i];
            uint256 bal;

            if (q.token == address(0)) {
                // Native ETH
                bal = q.account.balance;
            } else {
                // ERC-20 balanceOf — safe staticcall
                (bool ok, bytes memory data) = q.token.staticcall(
                    abi.encodeWithSelector(0x70a08231, q.account) // balanceOf(address)
                );
                if (ok && data.length >= 32) {
                    bal = abi.decode(data, (uint256));
                }
            }

            results[i] = Types.BalanceResult({
                token: q.token,
                account: q.account,
                balance: bal
            });
        }
    }

    // ──────────── Allowances ────────────

    /// @notice Batch-read ERC-20 allowances.
    ///         Returns 0 for any query that reverts.
    function getAllowances(
        Types.AllowanceQuery[] calldata queries
    ) external view returns (Types.AllowanceResult[] memory results) {
        results = new Types.AllowanceResult[](queries.length);
        for (uint256 i; i < queries.length; ++i) {
            Types.AllowanceQuery calldata q = queries[i];
            uint256 allowance;

            (bool ok, bytes memory data) = q.token.staticcall(
                abi.encodeWithSelector(0xdd62ed3e, q.owner, q.spender) // allowance(address,address)
            );
            if (ok && data.length >= 32) {
                allowance = abi.decode(data, (uint256));
            }

            results[i] = Types.AllowanceResult({
                token: q.token,
                owner: q.owner,
                spender: q.spender,
                allowance: allowance
            });
        }
    }

    // ──────────── Combined ────────────

    /// @notice Read both balances and allowances in one call
    function getBalancesAndAllowances(
        Types.TokenQuery[] calldata balanceQueries,
        Types.AllowanceQuery[] calldata allowanceQueries
    )
        external
        view
        returns (
            Types.BalanceResult[] memory balances,
            Types.AllowanceResult[] memory allowances
        )
    {
        balances = this.getTokenBalances(balanceQueries);
        allowances = this.getAllowances(allowanceQueries);
    }
}
