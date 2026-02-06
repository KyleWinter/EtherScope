import { Command } from "commander";

export function registerMonitor(program: Command) {
  program
    .command("monitor")
    .description("Monitor new blocks / addresses (skeleton)")
    .option("--rpc <url>", "RPC URL (or env RPC_URL)")
    .action(async () => {
      // 先占位：后续实现 ws 订阅 newHeads / logs
      process.stderr.write("monitor: TODO (use WS provider + subscriptions)\n");
      process.exit(0);
    });
}
