import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export function useTransaction(hash: string | null) {
  return useQuery({
    queryKey: ["etherscan", "tx", hash],
    queryFn: async () => {
      const res = await apiClient.getTransaction(hash!);
      if (!res.ok) throw new Error(res.error || "Failed to fetch transaction");
      return res.data!;
    },
    enabled: !!hash,
  });
}

export function useTransactionReceipt(hash: string | null) {
  return useQuery({
    queryKey: ["etherscan", "receipt", hash],
    queryFn: async () => {
      const res = await apiClient.getTransactionReceipt(hash!);
      if (!res.ok) throw new Error(res.error || "Failed to fetch receipt");
      return res.data!;
    },
    enabled: !!hash,
  });
}

export function useLatestBlock() {
  return useQuery({
    queryKey: ["etherscan", "latestBlock"],
    queryFn: async () => {
      const res = await apiClient.getLatestBlockNumber();
      if (!res.ok) throw new Error(res.error || "Failed to fetch latest block");
      return res.data!;
    },
    refetchInterval: 15000,
  });
}

export function useBlock(blockNumber: string | null) {
  return useQuery({
    queryKey: ["etherscan", "block", blockNumber],
    queryFn: async () => {
      const res = await apiClient.getBlock(blockNumber!);
      if (!res.ok) throw new Error(res.error || "Failed to fetch block");
      return res.data!;
    },
    enabled: !!blockNumber,
  });
}

export function useContractInfo(address: string | null) {
  return useQuery({
    queryKey: ["etherscan", "contract", address],
    queryFn: async () => {
      const res = await apiClient.getContractInfo(address!);
      if (!res.ok) throw new Error(res.error || "Failed to fetch contract info");
      return res.data!;
    },
    enabled: !!address,
  });
}
