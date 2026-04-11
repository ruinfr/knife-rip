export function formatCash(n: bigint): string {
  if (n < BigInt(0)) return `−${formatCash(-n)}`;
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function parsePositiveBigInt(raw: string): bigint | null {
  const t = raw.replace(/[,_\s]/g, "").trim();
  if (!/^\d+$/.test(t)) return null;
  try {
    const v = BigInt(t);
    if (v <= BigInt(0)) return null;
    return v;
  } catch {
    return null;
  }
}
