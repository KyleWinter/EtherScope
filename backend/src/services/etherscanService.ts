import { env } from "../config/env";

const ETHERSCAN_BASE = "https://api.etherscan.io/v2/api";
const CHAIN_ID = "1"; // Ethereum Mainnet

async function etherscanFetch(params: Record<string, string>): Promise<any> {
  const url = new URL(ETHERSCAN_BASE);

  // Add chainid for V2 API
  url.searchParams.set("chainid", CHAIN_ID);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  if (env.etherscanApiKey) {
    url.searchParams.set("apikey", env.etherscanApiKey);
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Etherscan API error: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();

  // Check for API errors (rate limits, invalid key, etc.)
  if (json.message && json.message.includes("rate limit")) {
    throw new Error(json.message);
  }
  if (json.status === "0" && json.message && json.message !== "No transactions found") {
    // Log the URL for debugging (without the API key)
    const debugUrl = url.toString().replace(/apikey=[^&]+/, 'apikey=***');
    console.error(`[EtherscanService] API error: ${json.message} (URL: ${debugUrl})`);
    throw new Error(json.message);
  }

  // V2 API returns JSON-RPC format for proxy calls
  // For proxy module, result is directly in the response
  // For other modules, check for status/message/result structure
  return json;
}

export async function getTransaction(hash: string) {
  const data = await etherscanFetch({
    module: "proxy",
    action: "eth_getTransactionByHash",
    txhash: hash,
  });
  return data.result;
}

export async function getTransactionReceipt(hash: string) {
  const data = await etherscanFetch({
    module: "proxy",
    action: "eth_getTransactionReceipt",
    txhash: hash,
  });
  return data.result;
}

export async function getBlockByNumber(blockNumber: string) {
  // Accept decimal or hex; convert decimal to hex
  const hex = blockNumber.startsWith("0x")
    ? blockNumber
    : "0x" + parseInt(blockNumber, 10).toString(16);

  const data = await etherscanFetch({
    module: "proxy",
    action: "eth_getBlockByNumber",
    tag: hex,
    boolean: "true",
  });
  return data.result;
}

export async function getLatestBlockNumber() {
  const data = await etherscanFetch({
    module: "proxy",
    action: "eth_blockNumber",
  });
  return data.result;
}

export async function getContractSource(address: string) {
  const data = await etherscanFetch({
    module: "contract",
    action: "getsourcecode",
    address,
  });
  return data.result;
}

export async function getContractCreation(address: string) {
  const data = await etherscanFetch({
    module: "contract",
    action: "getcontractcreation",
    contractaddresses: address,
  });
  return data.result;
}

export async function getAccountBalance(address: string) {
  const data = await etherscanFetch({
    module: "account",
    action: "balance",
    address,
    tag: "latest",
  });
  return data.result;
}

export async function getAccountTxs(address: string, page = 1, offset = 20) {
  const data = await etherscanFetch({
    module: "account",
    action: "txlist",
    address,
    startblock: "0",
    endblock: "99999999",
    page: String(page),
    offset: String(offset),
    sort: "desc",
  });
  return data.result;
}

export async function getInternalTxs(txHash: string) {
  try {
    const data = await etherscanFetch({
      module: "account",
      action: "txlistinternal",
      txhash: txHash,
    });

    // Return empty array if no internal transactions found
    if (data.status === "0" && data.message === "No transactions found") {
      return [];
    }

    return data.result || [];
  } catch (error: any) {
    // If error is "No transactions found", return empty array
    if (error.message?.includes("No transactions found")) {
      return [];
    }
    console.error("[etherscanService] Error fetching internal txs:", error.message);
    return [];
  }
}
