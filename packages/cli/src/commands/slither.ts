import { Command } from "commander";

export function registerSlither(program: Command) {
  program
    .command("slither")
    .description("Run slither locally (skeleton)")
    .option("--target <path>", "Target project path")
    .action(async () => {
      process.stderr.write("slither: TODO (spawn slither + parse output)\n");
      process.exit(0);
    });
}
