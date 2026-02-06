export function writeJson(json: string) {
  process.stdout.write(json);
  if (!json.endsWith("\n")) process.stdout.write("\n");
}
