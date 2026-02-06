import { Command } from "commander";
import { loadEnv } from "./utils/env.js";
import { registerAnalyze } from "./commands/analyze.js";
import { registerExport } from "./commands/export.js";
import { registerMonitor } from "./commands/monitor.js";
import { registerSlither } from "./commands/slither.js";

export function main() {
  loadEnv();

  const program = new Command();
  program
    .name("etherscope")
    .description("EtherScope CLI - trace-based tx analyzer")
    .version("0.1.0");

  registerAnalyze(program);
  registerExport(program);
  registerMonitor(program);
  registerSlither(program);

  program.parse(process.argv);
}
