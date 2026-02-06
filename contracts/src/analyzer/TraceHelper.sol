// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Types} from "./Types.sol";

/// @title TraceHelper — on-chain proxy-execute & debug event helper
/// @notice Used with debug_traceCall to capture structured call data and emit
///         labelled events that the off-chain analyzer can correlate with traces.
contract TraceHelper {
    // ──────────────────── Events ────────────────────

    /// @notice Emitted before each proxy-call so indexers can tag it in the trace
    event CallStarted(
        uint256 indexed callIndex,
        address indexed target,
        bytes4 selector,
        uint256 value,
        uint256 gasProvided
    );

    /// @notice Emitted after each proxy-call with result summary
    event CallEnded(
        uint256 indexed callIndex,
        bool success,
        uint256 gasUsed,
        bytes returnData
    );

    /// @notice Free-form label for arbitrary trace annotation
    event DebugLabel(string label, bytes data);

    // ──────────────────── Errors ────────────────────

    error CallFailed(uint256 index, bytes returnData);

    // ──────────────────── State ─────────────────────

    uint256 private _callCounter;

    // ──────────────────── Core ──────────────────────

    /// @notice Execute a single call through the helper, emitting trace events.
    /// @param target  The contract to call
    /// @param data    Calldata (selector + encoded args)
    /// @param value   ETH value to forward
    /// @return success Whether the call succeeded
    /// @return returnData Raw return bytes
    function proxyCall(
        address target,
        bytes calldata data,
        uint256 value
    ) external payable returns (bool success, bytes memory returnData) {
        uint256 idx = _callCounter++;
        bytes4 sel = data.length >= 4 ? bytes4(data[:4]) : bytes4(0);

        emit CallStarted(idx, target, sel, value, gasleft());

        uint256 gasBefore = gasleft();
        (success, returnData) = target.call{value: value}(data);
        uint256 gasAfter = gasleft();

        emit CallEnded(idx, success, gasBefore - gasAfter, returnData);
    }

    /// @notice Execute a batch of calls, emitting events for each.
    ///         Reverts on first failure unless `continueOnFail` is true.
    function batchProxyCall(
        address[] calldata targets,
        bytes[] calldata dataArr,
        uint256[] calldata values,
        bool continueOnFail
    ) external payable returns (Types.CallRecord[] memory records) {
        uint256 len = targets.length;
        require(len == dataArr.length && len == values.length, "length mismatch");

        records = new Types.CallRecord[](len);

        for (uint256 i; i < len; ++i) {
            uint256 idx = _callCounter++;
            bytes4 sel = dataArr[i].length >= 4 ? bytes4(dataArr[i][:4]) : bytes4(0);

            emit CallStarted(idx, targets[i], sel, values[i], gasleft());

            uint256 gasBefore = gasleft();
            (bool ok, bytes memory ret) = targets[i].call{value: values[i]}(dataArr[i]);
            uint256 gasAfter = gasleft();

            emit CallEnded(idx, ok, gasBefore - gasAfter, ret);

            records[i] = Types.CallRecord({
                from: address(this),
                to: targets[i],
                selector: sel,
                value: values[i],
                gasUsed: gasBefore - gasAfter,
                success: ok,
                returnData: ret
            });

            if (!ok && !continueOnFail) {
                revert CallFailed(i, ret);
            }
        }
    }

    /// @notice Emit a free-form debug label (for trace annotation)
    function label(string calldata text, bytes calldata data) external {
        emit DebugLabel(text, data);
    }

    /// @notice Allow receiving ETH for value-forwarding
    receive() external payable {}
}
