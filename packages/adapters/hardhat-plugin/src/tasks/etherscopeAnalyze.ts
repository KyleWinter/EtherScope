import { task } from "hardhat/config";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

import type { Finding } from "@etherscope/core";
import { runSlither, parseSlitherJson, mapSlitherFindings } from "@etherscope/adapter-slither";
import { runMythril, parseMythrilJson, mapMythrilFindings } from "@etherscope/adapter-mythril";

type ToolChoice = "slither" | "mythril" | "all";
type ModeChoice = "local" | "docker";

function summarize(findings: Finding[]): string {
  const c: Record<string, number> = {};
  for (const f of findings) c[f.severity] = (c[f.severity] ?? 0) + 1;
  const parts = ["critical", "high", "medium", "low", "info"].map((s) => `${s}:${c[s] ?? 0}`);
  return parts.join("  ");
}

task("etherscope:analyze", "Run security analysis and output normalized findings")
  .addOptionalParam("tool", "slither|mythril|all", "slither")
  .addOptionalParam("mode", "local|docker", "local")
  .addOptionalParam("out", "Output JSON file", "reports/etherscope-findings.json")
  .addOptionalParam("timeout", "Timeout ms", "300000")
  .addOptionalParam("target", "Target path (contracts dir or file)", "contracts")
  .setAction(async (args, hre) => {
    const tool = (args.tool as ToolChoice) ?? "slither";
    const mode = (args.mode as ModeChoice) ?? "local";
    const timeoutMs = Number(args.timeout ?? "300000");
    const target = String(args.target ?? "contracts");

    // 确保编译（Slither 有时会依赖 artifacts）
    await hre.run("compile");

    const cwd = hre.config.paths.root;
    const findings: Finding[] = [];

    if (tool === "slither" || tool === "all") {
      const r = await runSlither({ cwd, target, timeoutMs, mode });
      if (!r.jsonText) {
        console.error("[etherscope] slither did not produce JSON.");
        console.error(r.stderr || r.stdout);
      } else {
        const p = parseSlitherJson(r.jsonText);
        if (!p.ok) {
          console.error("[etherscope] parse slither json failed:", p.error?.message);
          console.error(p.error?.detail);
        } else {
          findings.push(...mapSlitherFindings(p.data));
        }
      }
    }

    if (tool === "mythril" || tool === "all") {
      // mythril 更偏向单文件：这里先允许用户传文件；默认 contracts 可能不适配
      const r = await runMythril({ cwd, target, timeoutMs, mode });
      if (!r.jsonText) {
        console.error("[etherscope] mythril did not produce JSON.");
        console.error(r.stderr || r.stdout);
      } else {
        const p = parseMythrilJson(r.jsonText);
        if (!p.ok) {
          console.error("[etherscope] parse mythril json failed:", p.error?.message);
          console.error(p.error?.detail);
        } else {
          findings.push(...mapMythrilFindings(p.data));
        }
      }
    }

    // 输出
    const outPath = path.isAbsolute(args.out) ? String(args.out) : path.join(cwd, String(args.out));
    await mkdir(path.dirname(outPath), { recursive: true });
    await writeFile(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), findings }, null, 2), "utf8");

    console.log(`[etherscope] findings: ${findings.length}  (${summarize(findings)})`);
    console.log(`[etherscope] wrote: ${outPath}`);
  });
