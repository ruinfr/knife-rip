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

/** Upper bound for a bet: entire wallet (no house-imposed cap). */
export function maxBetForBalance(balance: bigint): bigint {
  return balance > 0n ? balance : 0n;
}
