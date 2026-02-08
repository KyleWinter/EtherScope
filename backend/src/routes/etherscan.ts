import { Router } from "express";
import * as etherscan from "../services/etherscanService";

export function registerEtherscanRoutes(router: Router) {
  // Transaction details
  router.get("/etherscan/tx/:hash", async (req, res) => {
    try {
      const tx = await etherscan.getTransaction(req.params.hash);
      if (!tx) {
        return res.status(404).json({ ok: false, error: "Transaction not found" });
      }
      res.json({ ok: true, data: tx });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // Transaction receipt
  router.get("/etherscan/tx/:hash/receipt", async (req, res) => {
    try {
      const receipt = await etherscan.getTransactionReceipt(req.params.hash);
      if (!receipt) {
        return res.status(404).json({ ok: false, error: "Receipt not found" });
      }
      res.json({ ok: true, data: receipt });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // Latest block number
  router.get("/etherscan/block/latest", async (req, res) => {
    try {
      const blockNumber = await etherscan.getLatestBlockNumber();
      res.json({ ok: true, data: blockNumber });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // Block by number
  router.get("/etherscan/block/:number", async (req, res) => {
    try {
      const block = await etherscan.getBlockByNumber(req.params.number);
      if (!block) {
        return res.status(404).json({ ok: false, error: "Block not found" });
      }
      res.json({ ok: true, data: block });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // Contract info (source + creation + balance)
  router.get("/etherscan/contract/:address", async (req, res) => {
    try {
      const address = req.params.address;
      const [sourceResult, creationResult, balanceResult] = await Promise.all([
        etherscan.getContractSource(address),
        etherscan.getContractCreation(address).catch(() => null),
        etherscan.getAccountBalance(address).catch(() => null),
      ]);

      const source = Array.isArray(sourceResult) ? sourceResult[0] : sourceResult;
      const creation = Array.isArray(creationResult) ? creationResult[0] : null;

      // Validate balance - should be hex string or null
      let balance = "0x0";
      if (balanceResult && typeof balanceResult === "string") {
        // Check if it's a valid hex number (starts with 0x or is numeric)
        const isValidHex = /^0x[0-9a-fA-F]+$/.test(balanceResult);
        const isValidDecimal = /^\d+$/.test(balanceResult);
        if (isValidHex || isValidDecimal) {
          balance = balanceResult;
        } else {
          console.warn(`Invalid balance format for ${address}: ${balanceResult}`);
        }
      }

      res.json({
        ok: true,
        data: {
          address,
          name: source?.ContractName || "",
          compiler: source?.CompilerVersion || "",
          sourceCode: source?.SourceCode || "",
          abi: source?.ABI || "",
          isVerified: source?.ABI !== "Contract source code not verified",
          creator: creation?.contractCreator || "",
          creationTxHash: creation?.txHash || "",
          balance,
        },
      });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // Account transaction history
  router.get("/etherscan/account/:address/txs", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const offset = parseInt(req.query.offset as string) || 20;
      const txs = await etherscan.getAccountTxs(req.params.address, page, offset);
      res.json({ ok: true, data: txs });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });
}
