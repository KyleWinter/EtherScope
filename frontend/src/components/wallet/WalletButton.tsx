"use client";

import { Wallet, LogOut, AlertCircle } from "lucide-react";
import { useWallet } from "@/providers/WalletProvider";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { truncateAddress } from "@/lib/utils";

const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum",
  5: "Goerli",
  11155111: "Sepolia",
  137: "Polygon",
  80001: "Mumbai",
};

export default function WalletButton() {
  const { address, chainId, balance, isConnected, isConnecting, error, connect, disconnect } = useWallet();

  if (error) {
    return (
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-destructive" />
        <span className="text-sm text-destructive">{error}</span>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <Button
        onClick={connect}
        disabled={isConnecting}
        size="sm"
        className="flex items-center gap-2"
      >
        <Wallet className="h-4 w-4" />
        {isConnecting ? "Connecting..." : "Connect Wallet"}
      </Button>
    );
  }

  const chainName = chainId ? CHAIN_NAMES[chainId] || `Chain ${chainId}` : "Unknown";

  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-col items-end">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {chainName}
          </Badge>
          <span className="text-sm font-medium">{truncateAddress(address!)}</span>
        </div>
        {balance && (
          <span className="text-xs text-muted-foreground">
            {balance} ETH
          </span>
        )}
      </div>
      <Button
        onClick={disconnect}
        size="sm"
        variant="ghost"
        className="flex items-center gap-1"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}
