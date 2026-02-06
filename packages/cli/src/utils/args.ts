export function mustGetString(v: unknown, name: string): string {
  if (typeof v !== "string" || !v.trim()) throw new Error(`Missing or invalid ${name}`);
  return v.trim();
}

export function normalizeHex(x: string): string {
  const s = x.trim().toLowerCase();
  return s.startsWith("0x") ? s : `0x${s}`;
}

export function isTxHash(x: string): boolean {
  const s = normalizeHex(x);
  return /^0x[0-9a-f]{64}$/.test(s);
}
