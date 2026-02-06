export type ChainKey = "mainnet" | "sepolia" | "polygon" | "arbitrum" | "optimism" | "bsc";

export type NetworkConfig = {
  chainId: number;
  name: ChainKey;
  rpcUrls: string[];
  etherscanApiBase?: string; // 各链 Etherscan-like 可能不同
  etherscanApiKeyEnv?: string;
};

export const NETWORKS: Record<ChainKey, NetworkConfig> = {
  mainnet: {
    chainId: 1,
    name: "mainnet",
    rpcUrls: [],
    etherscanApiBase: "https://api.etherscan.io/api",
    etherscanApiKeyEnv: "ETHERSCAN_API_KEY"
  },
  sepolia: {
    chainId: 11155111,
    name: "sepolia",
    rpcUrls: [],
    etherscanApiBase: "https://api-sepolia.etherscan.io/api",
    etherscanApiKeyEnv: "ETHERSCAN_API_KEY"
  },
  polygon: {
    chainId: 137,
    name: "polygon",
    rpcUrls: [],
    etherscanApiBase: "https://api.polygonscan.com/api",
    etherscanApiKeyEnv: "POLYGONSCAN_API_KEY"
  },
  arbitrum: {
    chainId: 42161,
    name: "arbitrum",
    rpcUrls: [],
    etherscanApiBase: "https://api.arbiscan.io/api",
    etherscanApiKeyEnv: "ARBISCAN_API_KEY"
  },
  optimism: {
    chainId: 10,
    name: "optimism",
    rpcUrls: [],
    etherscanApiBase: "https://api-optimistic.etherscan.io/api",
    etherscanApiKeyEnv: "OPTIMISTIC_ETHERSCAN_API_KEY"
  },
  bsc: {
    chainId: 56,
    name: "bsc",
    rpcUrls: [],
    etherscanApiBase: "https://api.bscscan.com/api",
    etherscanApiKeyEnv: "BSCSCAN_API_KEY"
  }
};
