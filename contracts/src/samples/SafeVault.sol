// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title SafeVault — properly secured vault for EtherScope demo
/// @notice Demonstrates checks-effects-interactions, access control, and safe patterns.
contract SafeVault {
    mapping(address => uint256) public balances;
    address public owner;
    bool private _locked;

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    modifier nonReentrant() {
        require(!_locked, "reentrant");
        _locked = true;
        _;
        _locked = false;
    }

    constructor() {
        owner = msg.sender;
    }

    /// @notice Deposit ETH
    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    /// @notice SAFE: checks-effects-interactions + reentrancy guard
    function withdraw(uint256 amount) external nonReentrant {
        require(balances[msg.sender] >= amount, "insufficient");

        // Effect before interaction
        balances[msg.sender] -= amount;

        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "transfer failed");
    }

    /// @notice SAFE: access-controlled emergency withdraw
    function emergencyWithdraw(address to) external onlyOwner {
        uint256 bal = address(this).balance;
        (bool ok, ) = to.call{value: bal}("");
        require(ok, "transfer failed");
    }

    receive() external payable {}
}
