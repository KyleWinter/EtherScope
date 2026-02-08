"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { BrowserProvider, formatEther } from "ethers";

interface WalletContextType {
  address: string | null;
  chainId: number | null;
  balance: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConnected = !!address;

  const getBalance = useCallback(async (provider: BrowserProvider, addr: string) => {
    try {
      const balanceWei = await provider.getBalance(addr);
      const balanceEth = formatEther(balanceWei);
      setBalance(parseFloat(balanceEth).toFixed(4));
    } catch (err) {
      console.error("Failed to get balance:", err);
    }
  }, []);

  const connect = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      setError("MetaMask is not installed. Please install MetaMask extension.");
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const provider = new BrowserProvider(window.ethereum);

      // Request account access
      const accounts = await provider.send("eth_requestAccounts", []);
      const network = await provider.getNetwork();

      const userAddress = accounts[0];
      setAddress(userAddress);
      setChainId(Number(network.chainId));

      // Get balance
      await getBalance(provider, userAddress);

    } catch (err: any) {
      console.error("Failed to connect wallet:", err);
      setError(err.message || "Failed to connect wallet");
    } finally {
      setIsConnecting(false);
    }
  }, [getBalance]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setChainId(null);
    setBalance(null);
    setError(null);
  }, []);

  // Listen for account changes
  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return;

    const ethereum = window.ethereum;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect();
      } else if (accounts[0] !== address) {
        setAddress(accounts[0]);
        const provider = new BrowserProvider(ethereum);
        getBalance(provider, accounts[0]);
      }
    };

    const handleChainChanged = (chainIdHex: string) => {
      setChainId(parseInt(chainIdHex, 16));
      // Reload balance on chain change
      if (address) {
        const provider = new BrowserProvider(ethereum);
        getBalance(provider, address);
      }
    };

    ethereum.on("accountsChanged", handleAccountsChanged);
    ethereum.on("chainChanged", handleChainChanged);

    return () => {
      ethereum.removeListener("accountsChanged", handleAccountsChanged);
      ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, [address, disconnect, getBalance]);

  // Auto-connect if previously connected
  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window === "undefined" || !window.ethereum) return;

      const ethereum = window.ethereum;

      try {
        const provider = new BrowserProvider(ethereum);
        const accounts = await provider.send("eth_accounts", []);

        if (accounts.length > 0) {
          const network = await provider.getNetwork();
          setAddress(accounts[0]);
          setChainId(Number(network.chainId));
          await getBalance(provider, accounts[0]);
        }
      } catch (err) {
        console.error("Failed to check connection:", err);
      }
    };

    checkConnection();
  }, [getBalance]);

  const value: WalletContextType = {
    address,
    chainId,
    balance,
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
