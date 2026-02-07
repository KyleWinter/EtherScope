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
    let settled = false;

    const finish = (r: RunResult) => {
      if (settled) return;
      settled = true;
      resolve(r);
    };

    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));

    const timer = setTimeout(() => {
      // 超时强杀
      child.kill("SIGKILL");
    }, opts.timeoutMs);

    // ✅ 关键：spawn 失败（比如 slither 不在 PATH）会走这里，而不是 close
    child.on("error", (err: any) => {
      clearTimeout(timer);
      finish({
        ok: false,
        exitCode: -1,
        stdout,
        stderr: stderr + (stderr ? "\n" : "") + String(err?.message ?? err)
      });
    });

    // ✅ 注意：Slither 很可能返回 255 也算“正常输出结果”
    child.on("close", (code) => {
      clearTimeout(timer);
      finish({
        ok: true, // 先表示“命令执行结束”，真实 ok 交给 jsonText 判
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

  // Slither 更稳：--json 写文件（避免 stdout 混日志）
  const tmp = await mkdtemp(path.join(tmpdir(), "etherscope-slither-"));
  const outFile = path.join(tmp, "slither.json");

  try {
    if (mode === "local") {
      const args = [target, "--json", outFile, ...(opts.extraArgs ?? [])];

      const r = await runCmd("slither", args, { cwd: opts.cwd, timeoutMs, env: opts.env });

      let jsonText: string | undefined;
      try {
        jsonText = (await readFile(outFile, "utf8")).trim();
        if (!jsonText) jsonText = undefined;
      } catch {
        // ignore
      }

      // ✅ 核心：只要拿到了 json 文件，就认为“拿到扫描结果”
      return {
        ...r,
        ok: Boolean(jsonText),
        jsonText
      };
    }

    // docker mode
    const image = opts.dockerImage ?? "trailofbits/eth-security-toolbox";
    const containerOut = "/workspace/.etherscope/slither.json";

    const extra = (opts.extraArgs ?? []).join(" ");
    const cmdInContainer = [
      "mkdir -p .etherscope",
      `slither ${target} --json ${containerOut} ${extra}`.trim()
    ].join(" && ");

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
      cmdInContainer
    ];

    const r = await runCmd("docker", args, { cwd: opts.cwd, timeoutMs, env: opts.env });

    try {
      const hostOut = path.join(opts.cwd, ".etherscope", "slither.json");
      let jsonText = (await readFile(hostOut, "utf8")).trim();
      if (!jsonText) jsonText = undefined as any;

      return {
        ...r,
        ok: Boolean(jsonText),
        jsonText
      };
    } catch {
      return { ...r, ok: false };
    }
  } finally {
    await rm(tmp, { recursive: true, force: true }).catch(() => {});
  }
}
