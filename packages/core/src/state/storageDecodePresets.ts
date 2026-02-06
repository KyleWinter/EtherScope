export type StoragePreset = {
  name: string;
  // slot -> human label (简单点，复杂的你们可以做 keccak mapping 等)
  slotLabels: Record<string, string>;
};

export const STORAGE_PRESETS: StoragePreset[] = [
  {
    name: "EIP1967 Proxy",
    slotLabels: {
      // bytes32(uint256(keccak256('eip1967.proxy.implementation')) - 1)
      "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc": "implementation",
      // admin slot
      "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103": "admin"
    }
  }
];
