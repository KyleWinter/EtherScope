import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

export interface RunOptions {
  cwd: string;
  target?: string; // file/dir; default "contracts"
  timeoutMs?: number;
  mode?: "local" | "docker";
  dockerImage?: string; // e.g. "trailofbits/eth-security-toolbox"
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

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
    }, opts.timeoutMs);

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

export async function runSlither(opts: RunOptions): Promise<RunResult> {
  const timeoutMs = opts.timeoutMs ?? 5 * 60_000;
  const mode = opts.mode ?? "local";
  const target = opts.target ?? "contracts";

  // Slither 更稳的做法：--json 写文件（避免 stdout 混日志）
  const tmp = await mkdtemp(path.join(tmpdir(), "etherscope-slither-"));
  const outFile = path.join(tmp, "slither.json");

  try {
    if (mode === "local") {
      const args = [
        target,
        "--json",
        outFile,
        ...(opts.extraArgs ?? [])
      ];

      const r = await runCmd("slither", args, { cwd: opts.cwd, timeoutMs, env: opts.env });
      let jsonText: string | undefined;
      try {
        jsonText = await readFile(outFile, "utf8");
      } catch {
        // ignore
      }
      return { ...r, jsonText };
    }

    // docker mode
    const image = opts.dockerImage ?? "trailofbits/eth-security-toolbox";
    // 在容器里输出到挂载目录，确保可读
    const containerOut = "/workspace/.etherscope/slither.json";
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
      [
        "mkdir -p .etherscope",
        `slither ${target} --json ${containerOut} ${(opts.extraArgs ?? []).join(" ")}`.trim()
      ].join(" && ")
    ];

    const r = await runCmd("docker", args, { cwd: opts.cwd, timeoutMs, env: opts.env });
    // 读宿主机挂载出来的文件
    try {
      const hostOut = path.join(opts.cwd, ".etherscope", "slither.json");
      const jsonText = await readFile(hostOut, "utf8");
      return { ...r, jsonText };
    } catch {
      return r;
    }
  } finally {
    await rm(tmp, { recursive: true, force: true }).catch(() => {});
  }
}
