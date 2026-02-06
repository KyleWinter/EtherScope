import { nanoid } from "nanoid";
import path from "node:path";

import type { Finding } from "@etherscope/core";
import { runSlither, parseSlitherJson, mapSlitherFindings } from "@etherscope/adapter-slither";
import { runMythril, parseMythrilJson, mapMythrilFindings } from "@etherscope/adapter-mythril";

import { reportRepo } from "../db/repo/reportRepo";
import { txRepo } from "../db/repo/txRepo";

export interface AnalyzeInput {
  txHash?: string;
  projectRoot: string; // hardhat project root
  target: string;      // contracts or file path
  tools?: Array<"slither" | "mythril">;
  mode?: "local" | "docker";
  timeoutMs?: number;
}

export const analyzeService = {
  async run(input: AnalyzeInput): Promise<{ reportId: string; findings: Finding[] }> {
    const tools = input.tools?.length ? input.tools : (["slither"] as Array<"slither" | "mythril">);
    const mode = input.mode ?? "local";
    const timeoutMs = input.timeoutMs ?? 300000;

    const findings: Finding[] = [];
    const toolMeta: Record<string, any> = {};

    // normalize cwd
    const cwd = path.resolve(input.projectRoot);
    const target = input.target;

    if (tools.includes("slither")) {
      const r = await runSlither({ cwd, target, mode, timeoutMs });
      toolMeta.slither = { ok: r.ok, exitCode: r.exitCode };
      if (r.jsonText) {
        const p = parseSlitherJson(r.jsonText);
        if (p.ok && p.data) findings.push(...mapSlitherFindings(p.data));
        else toolMeta.slither.parseError = p.error?.message ?? "parse failed";
      } else {
        toolMeta.slither.noJson = true;
      }
    }

    if (tools.includes("mythril")) {
      const r = await runMythril({ cwd, target, mode, timeoutMs });
      toolMeta.mythril = { ok: r.ok, exitCode: r.exitCode };
      if (r.jsonText) {
        const p = parseMythrilJson(r.jsonText);
        if (p.ok && p.data) findings.push(...mapMythrilFindings(p.data));
        else toolMeta.mythril.parseError = p.error?.message ?? "parse failed";
      } else {
        toolMeta.mythril.noJson = true;
      }
    }

    const reportId = nanoid();
    reportRepo.createReport({
      id: reportId,
      txHash: input.txHash,
      tools: toolMeta,
      findings
    });

    if (input.txHash) {
      txRepo.upsertTxReport(input.txHash, reportId);
    }

    return { reportId, findings };
  }
};
