import chalk from "chalk";

export function printHeadline(title: string) {
  console.log(chalk.bold.cyan(`\n=== ${title} ===\n`));
}

export function printKV(k: string, v: unknown) {
  console.log(`${chalk.gray(k)}: ${chalk.white(String(v))}`);
}

export function printSection(title: string) {
  console.log(chalk.bold(`\n${title}`));
}
