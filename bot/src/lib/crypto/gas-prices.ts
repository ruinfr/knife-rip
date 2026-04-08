import { getEtherscanApiKey } from "../../config";

export type GasOracle = {
  safe: string;
  proposed: string;
  fast: string;
  baseFeeGwei?: string;
};

async function tryEtherscanGas(): Promise<GasOracle | null> {
  const key = getEtherscanApiKey()?.trim() || "YourApiKeyToken";
  try {
    const res = await fetch(
      `https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=${encodeURIComponent(key)}`,
    );
    if (!res.ok) return null;
    const body = (await res.json()) as {
      status: string;
      result?: {
        SafeGasPrice: string;
        ProposeGasPrice: string;
        FastGasPrice: string;
        suggestBaseFee?: string;
      };
    };
    if (body.status !== "1" || !body.result) return null;
    const r = body.result;
    return {
      safe: r.SafeGasPrice,
      proposed: r.ProposeGasPrice,
      fast: r.FastGasPrice,
      baseFeeGwei: r.suggestBaseFee,
    };
  } catch {
    return null;
  }
}

/** Public RPC fallback — legacy gas price only (approx). */
async function tryRpcGasGwei(): Promise<string | null> {
  try {
    const res = await fetch("https://cloudflare-eth.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_gasPrice",
        params: [],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { result?: string };
    const hex = data.result;
    if (!hex?.startsWith("0x")) return null;
    const wei = BigInt(hex);
    const gwei = Number(wei) / 1e9;
    return gwei.toFixed(2);
  } catch {
    return null;
  }
}

export async function fetchGasOracle(): Promise<GasOracle | null> {
  const o = await tryEtherscanGas();
  if (o) return o;
  const g = await tryRpcGasGwei();
  if (g) {
    return { safe: g, proposed: g, fast: g };
  }
  return null;
}
