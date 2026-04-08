/** Common symbols → CoinGecko id (extend as needed). */
const ID_MAP: Record<string, string> = {
  btc: "bitcoin",
  bitcoin: "bitcoin",
  eth: "ethereum",
  ethereum: "ethereum",
  ltc: "litecoin",
  litecoin: "litecoin",
  sol: "solana",
  solana: "solana",
  xrp: "ripple",
  ripple: "ripple",
  doge: "dogecoin",
  dogecoin: "dogecoin",
  ada: "cardano",
  cardano: "cardano",
  dot: "polkadot",
  polkadot: "polkadot",
  matic: "matic-network",
  polygon: "matic-network",
  avax: "avalanche-2",
  bnb: "binancecoin",
  link: "chainlink",
  usdt: "tether",
  usdc: "usd-coin",
};

const VS_ALLOWED = new Set([
  "usd",
  "eur",
  "gbp",
  "jpy",
  "cad",
  "aud",
  "chf",
  "cny",
  "inr",
  "krw",
  "btc",
  "eth",
]);

export async function resolveCoingeckoId(raw: string): Promise<string | null> {
  const q = raw.toLowerCase().trim();
  if (!q) return null;
  if (ID_MAP[q]) return ID_MAP[q];
  const url = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      coins?: { id: string; symbol: string; name: string }[];
    };
    const c = data.coins?.[0];
    return c?.id ?? null;
  } catch {
    return null;
  }
}

export async function fetchSimplePrice(
  id: string,
  vs: string,
): Promise<{ price: number; vs: string; id: string } | null> {
  const vsCur = vs.toLowerCase();
  const fi = VS_ALLOWED.has(vsCur) ? vsCur : "usd";
  const url =
    `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(id)}` +
    `&vs_currencies=${encodeURIComponent(fi)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, Record<string, number>>;
    const p = data[id]?.[fi];
    if (p == null || Number.isNaN(p)) return null;
    return { price: p, vs: fi, id };
  } catch {
    return null;
  }
}
