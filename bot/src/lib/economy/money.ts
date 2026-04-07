export function formatCash(n: bigint): string {
  if (n < 0n) return `−${formatCash(-n)}`;
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function parsePositiveBigInt(raw: string): bigint | null {
  const t = raw.replace(/[,_\s]/g, "").trim();
  if (!/^\d+$/.test(t)) return null;
  try {
    const v = BigInt(t);
    if (v <= 0n) return null;
    return v;
  } catch {
    return null;
  }
}

export function maxBetForBalance(balance: bigint): bigint {
  if (balance <= 0n) return 0n;
  const cap = (balance * 15n) / 100n;
  return cap > 0n ? cap : 1n;
}
