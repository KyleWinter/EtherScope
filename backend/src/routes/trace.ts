import type { Router } from "express";
import { traceService } from "../services/traceService";
import { getTransactionReceipt, getContractSource } from "../services/etherscanService";

function isTxHash(s: string): boolean {
  return /^0x[0-9a-fA-F]{64}$/.test(s);
}

export function registerTraceRoutes(router: Router) {
  /**
   * GET /trace/:txHash
   * Get full transaction trace with call stack
   */
  router.get("/trace/:txHash", async (req, res) => {
    const txHash = String(req.params.txHash ?? "").trim();

    if (!txHash || !isTxHash(txHash)) {
      return res.status(400).json({
        ok: false,
        error: "Invalid transaction hash"
      });
    }

    try {
      const trace = await traceService.getTransactionTrace(txHash);

      return res.json({
        ok: true,
        trace,
      });
    } catch (error: any) {
      // If it's a "not available" error, return 200 with ok: false and helpful message
      if (error.message?.includes("not available")) {
        return res.json({
          ok: false,
          error: "Call stack trace requires a paid RPC endpoint. Internal transactions and event logs are still available.",
          errorType: "RPC_NOT_SUPPORTED"
        });
      }

      console.error("[TraceRoute] Error getting trace:", error);
      return res.status(500).json({
        ok: false,
        error: error.message || "Failed to get transaction trace"
      });
    }
  });

  /**
   * GET /trace/:txHash/internal
   * Get internal transactions
   */
  router.get("/trace/:txHash/internal", async (req, res) => {
    const txHash = String(req.params.txHash ?? "").trim();

    if (!txHash || !isTxHash(txHash)) {
      return res.status(400).json({
        ok: false,
        error: "Invalid transaction hash"
      });
    }

    try {
      const internals = await traceService.getInternalTransactions(txHash);

      return res.json({
        ok: true,
        internals,
        count: internals.length,
      });
    } catch (error: any) {
      console.error("[TraceRoute] Error getting internal transactions:", error);
      return res.status(500).json({
        ok: false,
        error: error.message || "Failed to get internal transactions"
      });
    }
  });

  /**
   * GET /trace/:txHash/logs
   * Get decoded event logs
   */
  router.get("/trace/:txHash/logs", async (req, res) => {
    const txHash = String(req.params.txHash ?? "").trim();

    if (!txHash || !isTxHash(txHash)) {
      return res.status(400).json({
        ok: false,
        error: "Invalid transaction hash"
      });
    }

    try {
      // Get transaction receipt for logs
      const receipt = await getTransactionReceipt(txHash);

      if (!receipt || !receipt.logs) {
        return res.json({
          ok: true,
          logs: [],
        });
      }

      // Try to get contract ABI for decoding
      let abi: any[] | undefined;
      if (receipt.to) {
        try {
          const contractSource = await getContractSource(receipt.to);
          if (contractSource?.ABI && contractSource.ABI !== "Contract source code not verified") {
            abi = JSON.parse(contractSource.ABI);
          }
        } catch (e) {
          console.log("[TraceRoute] Could not get ABI for contract:", receipt.to);
        }
      }

      const decodedLogs = await traceService.decodeEventLogs(
        receipt.logs,
        receipt.to || "",
        abi
      );

      return res.json({
        ok: true,
        logs: decodedLogs,
        count: decodedLogs.length,
      });
    } catch (error: any) {
      console.error("[TraceRoute] Error getting logs:", error);
      return res.status(500).json({
        ok: false,
        error: error.message || "Failed to get event logs"
      });
    }
  });

  /**
   * POST /trace/decode-logs
   * Decode logs with provided ABI
   */
  router.post("/trace/decode-logs", async (req, res) => {
    const { logs, abi, contractAddress } = req.body;

    if (!logs || !Array.isArray(logs)) {
      return res.status(400).json({
        ok: false,
        error: "Invalid logs array"
      });
    }

    try {
      const decodedLogs = await traceService.decodeEventLogs(
        logs,
        contractAddress || "",
        abi
      );

      return res.json({
        ok: true,
        logs: decodedLogs,
      });
    } catch (error: any) {
      console.error("[TraceRoute] Error decoding logs:", error);
      return res.status(500).json({
        ok: false,
        error: error.message || "Failed to decode logs"
      });
    }
  });

  /**
   * GET /trace/:txHash/gas-profile
   * Get gas profiling data (function breakdown, opcode stats, optimization suggestions)
   */
  router.get("/trace/:txHash/gas-profile", async (req, res) => {
    const txHash = String(req.params.txHash ?? "").trim();

    if (!txHash || !isTxHash(txHash)) {
      return res.status(400).json({
        ok: false,
        error: "Invalid transaction hash"
      });
    }

    try {
      const gasProfile = await traceService.getGasProfile(txHash);

      return res.json({
        ok: true,
        gasProfile,
      });
    } catch (error: any) {
      console.error("[TraceRoute] Error getting gas profile:", error);

      // If it's a "not available" error, return helpful message
      if (error.message?.includes("not available")) {
        return res.json({
          ok: false,
          error: "Gas profiling requires a paid RPC endpoint with debug API support.",
          errorType: "RPC_NOT_SUPPORTED"
        });
      }

      return res.status(500).json({
        ok: false,
        error: error.message || "Failed to get gas profile"
      });
    }
  });

  /**
   * GET /trace/:txHash/state-diff
   * Get state diff (storage changes, balance changes, token transfers)
   */
  router.get("/trace/:txHash/state-diff", async (req, res) => {
    const txHash = String(req.params.txHash ?? "").trim();

    if (!txHash || !isTxHash(txHash)) {
      return res.status(400).json({
        ok: false,
        error: "Invalid transaction hash"
      });
    }

    try {
      // Get state diff
      const stateDiff = await traceService.getStateDiff(txHash);

      // Get receipt for token transfers
      const receipt = await getTransactionReceipt(txHash);

      if (receipt?.logs) {
        stateDiff.tokenTransfers = traceService.extractTokenTransfers(receipt.logs);
      }

      return res.json({
        ok: true,
        stateDiff,
      });
    } catch (error: any) {
      console.error("[TraceRoute] Error getting state diff:", error);

      // If it's a "not available" error, still try to get token transfers
      if (error.message?.includes("not available")) {
        try {
          const receipt = await getTransactionReceipt(txHash);
          const tokenTransfers = receipt?.logs
            ? traceService.extractTokenTransfers(receipt.logs)
            : [];

          return res.json({
            ok: true,
            stateDiff: {
              balanceChanges: [],
              storageChanges: [],
              tokenTransfers,
            },
            warning: "State diff not available on this RPC endpoint. Showing token transfers only."
          });
        } catch (fallbackError) {
          console.error("[TraceRoute] Fallback failed:", fallbackError);
        }
      }

      return res.status(500).json({
        ok: false,
        error: error.message || "Failed to get state diff"
      });
    }
  });
}
