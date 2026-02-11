import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function truncateAddress(address: string | undefined | null, startLength = 6, endLength = 4): string {
  if (!address) return "";
  if (address.length <= startLength + endLength) {
    return address;
  }
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
}

export function formatGas(gas: number | string): string {
  const gasNum = typeof gas === "string" ? parseInt(gas, 10) : gas;
  if (gasNum >= 1_000_000) {
    return `${(gasNum / 1_000_000).toFixed(2)}M`;
  }
  if (gasNum >= 1_000) {
    return `${(gasNum / 1_000).toFixed(2)}K`;
  }
  return gasNum.toString();
}

export function formatTimestamp(timestamp: number | string): string {
  const ts = typeof timestamp === "string" ? parseInt(timestamp) : timestamp;
  // If timestamp looks like Unix seconds (before year 2100), convert to ms
  const ms = ts < 4102444800 ? ts * 1000 : ts;
  return new Date(ms).toLocaleString();
}

export function hexToNumber(hex: string | undefined | null): number {
  if (!hex || hex === "0x" || hex.trim() === "") return 0;

  try {
    const result = parseInt(hex, 16);
    return isNaN(result) ? 0 : result;
  } catch (error) {
    console.error(`Failed to parse hex value: ${hex}`, error);
    return 0;
  }
}

export function weiToEth(wei: string | undefined | null): number {
  // Handle null/undefined/empty
  if (!wei || wei === "0x" || wei.trim() === "") return 0;

  // Validate format before attempting conversion
  const isValidHex = /^0x[0-9a-fA-F]+$/.test(wei);
  const isValidDecimal = /^\d+$/.test(wei);

  if (!isValidHex && !isValidDecimal) {
    console.error(`Invalid wei format (not hex or decimal): ${wei}`);
    return 0;
  }

  try {
    // Handle both hex and decimal strings
    const weiBigInt = wei.startsWith("0x") ? BigInt(wei) : BigInt(wei);
    // Convert to ETH with 18 decimal precision
    const eth = Number(weiBigInt) / 1e18;
    return eth;
  } catch (error) {
    console.error(`Failed to parse wei value: ${wei}`, error);
    return 0;
  }
}

export function formatEth(wei: string | undefined | null, decimals = 6): string {
  const eth = weiToEth(wei);
  if (eth === 0) return "0 ETH";
  return `${eth.toFixed(decimals)} ETH`;
}

export function gweiFromWei(wei: string | undefined | null): string {
  if (!wei || wei === "0x" || wei.trim() === "") return "0.00";

  // Validate format before attempting conversion
  const isValidHex = /^0x[0-9a-fA-F]+$/.test(wei);
  const isValidDecimal = /^\d+$/.test(wei);

  if (!isValidHex && !isValidDecimal) {
    console.error(`Invalid wei format (not hex or decimal): ${wei}`);
    return "0.00";
  }

  try {
    const val = wei.startsWith("0x") ? BigInt(wei) : BigInt(wei);
    const gwei = Number(val) / 1e9;
    return gwei.toFixed(2);
  } catch (error) {
    console.error(`Failed to parse wei value: ${wei}`, error);
    return "0.00";
  }
}
