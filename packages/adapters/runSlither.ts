export interface RunOptions {
  cwd: string;                 // 项目根目录
  target?: string;             // 合约路径 / 文件 / 目录
  timeoutMs?: number;
  mode?: "local" | "docker";
  dockerImage?: string;
  extraArgs?: string[];
  env?: Record<string, string>;
}

export interface RunResult {
  ok: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  jsonText?: string;           // 最终抽出来的 JSON 文本（有些工具混输出）
}
