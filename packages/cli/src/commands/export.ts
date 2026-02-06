import { Command } from "commander";
import fs from "node:fs/promises";
import path from "node:path";
import { mustGetString, isTxHash, normalizeHex } from "../utils/args.js";

export function registerExport(program: Command) {
  program
    .command("export")
    .description("Export a report JSON from stdin or file to reports/tx-<hash>.json")
    .argument("<txHash>", "Transaction hash (0x...)")
    .option("--in <file>", "Input JSON file (default: stdin)")
    .option("--out-dir <dir>", "Output dir", "reports")
    .action(async (txHashArg: string, opts: any) => {
      const txHash = normalizeHex(mustGetString(txHashArg, "txHash"));
      if (!isTxHash(txHash)) throw new Error(`Invalid txHash: ${txHash}`);

      const outDir = mustGetString(opts.outDir, "outDir");
      await fs.mkdir(outDir, { recursive: true });

      const input = opts.in
        ? await fs.readFile(mustGetString(opts.in, "in"), "utf8")
        : await new Promise<string>((resolve) => {
            let s = "";
            process.stdin.setEncoding("utf8");
            process.stdin.on("data", (c) => (s += c));
            process.stdin.on("end", () => resolve(s));
          });

      const outPath = path.join(outDir, `tx-${txHash.slice(2, 10)}.json`);
      await fs.writeFile(outPath, input, "utf8");
      process.stderr.write(`Saved: ${outPath}\n`);
    });
}
