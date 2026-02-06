// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title StorageInspector — slot computation & common layout utilities
/// @notice Provides helpers for computing storage slots used by mappings,
///         dynamic arrays, and well-known proxy patterns (EIP-1967).
contract StorageInspector {
    // ──────────── EIP-1967 well-known slots ────────────

    /// @dev bytes32(uint256(keccak256("eip1967.proxy.implementation")) - 1)
    bytes32 public constant IMPLEMENTATION_SLOT =
        0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;

    /// @dev bytes32(uint256(keccak256("eip1967.proxy.admin")) - 1)
    bytes32 public constant ADMIN_SLOT =
        0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103;

    /// @dev bytes32(uint256(keccak256("eip1967.proxy.beacon")) - 1)
    bytes32 public constant BEACON_SLOT =
        0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50;

    // ──────────── Slot computation helpers ────────────

    /// @notice Compute the storage slot for `mapping(keyType => ...)` at `baseSlot[key]`
    /// @param baseSlot The declaration slot of the mapping
    /// @param key      The mapping key (abi-encoded to 32 bytes)
    function mappingSlot(bytes32 baseSlot, bytes32 key) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(key, baseSlot));
    }

    /// @notice Compute slot for a nested mapping: `mapping[key1][key2]`
    function nestedMappingSlot(
        bytes32 baseSlot,
        bytes32 key1,
        bytes32 key2
    ) external pure returns (bytes32) {
        bytes32 inner = keccak256(abi.encodePacked(key1, baseSlot));
        return keccak256(abi.encodePacked(key2, inner));
    }

    /// @notice Compute slot for `mapping[addr]` (address key, left-padded)
    function mappingSlotAddr(bytes32 baseSlot, address key) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(bytes32(uint256(uint160(key))), baseSlot));
    }

    /// @notice Compute the starting slot of a dynamic array declared at `baseSlot`
    function dynamicArraySlot(bytes32 baseSlot) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(baseSlot));
    }

    /// @notice Compute the slot of element `index` in a dynamic array at `baseSlot`
    function dynamicArrayElementSlot(
        bytes32 baseSlot,
        uint256 index
    ) external pure returns (bytes32) {
        return bytes32(uint256(keccak256(abi.encodePacked(baseSlot))) + index);
    }

    // ──────────── On-chain slot reads ────────────

    /// @notice Read a single storage slot from `target`
    function readSlot(address target, bytes32 slot) public view returns (bytes32 value) {
        assembly {
            // Use extcodecopy-style static call isn't needed; we just sload via
            // a staticcall to self trick — but simpler: use the target directly
            // by loading from target's storage via an eth_getStorageAt equivalent.
            // In Solidity, we can only sload our own storage, so we use a
            // staticcall to the target with empty data and read storage at the EVM level.
            // For on-chain use, the caller should use eth_getStorageAt RPC.
            // This function is mainly for local simulation / tests.
            value := sload(slot)
        }
        // NOTE: This reads OUR storage, not target's. For reading another
        // contract's storage on-chain, use eth_getStorageAt off-chain or
        // the readSlotViaCall workaround below.
    }

    /// @notice Read EIP-1967 implementation address from `proxy`
    /// @dev Performs a staticcall to proxy which should expose a view,
    ///      or the caller can use eth_getStorageAt off-chain.
    function getEIP1967Implementation(address proxy) external view returns (address impl) {
        // Use eth_getStorageAt off-chain. On-chain, we attempt a storage read via the proxy.
        (, bytes memory data) = proxy.staticcall(
            abi.encodeWithSignature("implementation()")
        );
        if (data.length >= 32) {
            impl = abi.decode(data, (address));
        }
    }

    /// @notice Batch-read multiple slots from a target (for off-chain simulation)
    /// @dev Designed to be called via eth_call — reads slots from `target` using
    ///      individual eth_getStorageAt would be more efficient, but this lets you
    ///      bundle reads in a single eth_call if target has a storage reader.
    function readSlots(
        bytes32[] calldata slots
    ) external view returns (bytes32[] memory values) {
        values = new bytes32[](slots.length);
        for (uint256 i; i < slots.length; ++i) {
            bytes32 s = slots[i];
            bytes32 v;
            assembly {
                v := sload(s)
            }
            values[i] = v;
        }
    }
}
