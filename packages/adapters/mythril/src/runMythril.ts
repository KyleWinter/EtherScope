import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

export interface RunOptions {
  cwd: string;
  target?: string; // solidity file; mythril 更偏向单文件/合约
  timeoutMs?: number;
  mode?: "local" | "docker";
  dockerImage?: string; // e.g. "mythril/myth"
  extraArgs?: string[];
  env?: Record<string, string>;
}

export interface RunResult {
  ok: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  jsonText?: string;
}

function runCmd(
  cmd: string,
  args: string[],
  opts: { cwd: string; timeoutMs: number; env?: Record<string, string> }
): Promise<RunResult> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd: opts.cwd,
      env: { ...process.env, ...(opts.env ?? {}) },
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));

    const timer = setTimeout(() => child.kill("SIGKILL"), opts.timeoutMs);

    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({
        ok: code === 0,
        exitCode: code ?? -1,
        stdout,
        stderr
      });
    });
  });
}

function extractJsonFromMixedOutput(text: string): string | undefined {
  // mythril 有时 stdout 会夹杂日志：尝试从第一个 '{' 到最后一个 '}' 截
  const i = text.indexOf("{");
  const j = text.lastIndexOf("}");
  if (i >= 0 && j > i) return text.slice(i, j + 1);
  return undefined;
}

export async function runMythril(opts: RunOptions): Promise<RunResult> {
  const timeoutMs = opts.timeoutMs ?? 10 * 60_000; // mythril 通常更慢
  const mode = opts.mode ?? "local";
  const target = opts.target ?? "contracts/YourContract.sol";

  const tmp = await mkdtemp(path.join(tmpdir(), "etherscope-mythril-"));
  const outFile = path.join(tmp, "mythril.json");

  try {
    if (mode === "local") {
      // 兼容更多版本：myth analyze <file> -o json
      const args = ["analyze", target, "-o", "json", ...(opts.extraArgs ?? [])];
      const r = await runCmd("myth", args, { cwd: opts.cwd, timeoutMs, env: opts.env });

      const jsonText = extractJsonFromMixedOutput(r.stdout) ?? extractJsonFromMixedOutput(r.stderr);
      return { ...r, jsonText };
    }

    const image = opts.dockerImage ?? "mythril/myth";
    const args = [
      "run",
      "--rm",
      "-v",
      `${opts.cwd}:/workspace`,
      "-w",
      "/workspace",
      image,
      "bash",
      "-lc",
      `myth analyze ${target} -o json ${(opts.extraArgs ?? []).join(" ")}`.trim()
    ];

    const r = await runCmd("docker", args, { cwd: opts.cwd, timeoutMs, env: opts.env });
    const jsonText = extractJsonFromMixedOutput(r.stdout) ?? extractJsonFromMixedOutput(r.stderr);
    return { ...r, jsonText };
  } finally {
    await rm(tmp, { recursive: true, force: true }).catch(() => {});
  }
}
