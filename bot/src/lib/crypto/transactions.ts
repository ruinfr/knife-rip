export type TxChain = "btc" | "ltc" | "eth";

export type LookupResult = {
  chain: TxChain;
  hash: string;
  summary: string;
};

function isEthHash(h: string): boolean {
  return /^0x[0-9a-fA-F]{64}$/.test(h);
}

function isBtcLikeHash(h: string): boolean {
  return /^[0-9a-fA-F]{64}$/.test(h);
}

/** Mempool.space — Bitcoin only. */
async function tryMempoolBtc(txHash: string): Promise<LookupResult | null> {
  try {
    const res = await fetch(`https://mempool.space/api/tx/${txHash}`);
    if (!res.ok) return null;
    const tx = (await res.json()) as {
      txid: string;
      status?: { confirmed?: boolean; block_height?: number };
      fee?: number;
      vsize?: number;
    };
    const st = tx.status;
    const conf = st?.confirmed
      ? `confirmed (block **${st.block_height ?? "?"}**)`
      : "unconfirmed (mempool)";
    const fee = tx.fee != null ? ` · fee ${tx.fee} sats` : "";
    return {
      chain: "btc",
      hash: tx.txid ?? txHash,
      summary: `**BTC** · ${conf}${fee}`,
    };
  } catch {
    return null;
  }
}

/** Blockchair — Litecoin. */
async function tryBlockchairLtc(txHash: string): Promise<LookupResult | null> {
  try {
    const res = await fetch(
      `https://api.blockchair.com/litecoin/dashboards/transaction/${txHash}`,
    );
    if (!res.ok) return null;
    const body = (await res.json()) as {
      data?: Record<
        string,
        { transaction?: { block_id: number; hash: string; fee: number } }
      >;
      context?: { state?: number };
    };
    const row = body.data?.[txHash]?.transaction;
    if (!row) return null;
    const blk =
      row.block_id > 0
        ? `confirmed (block **${row.block_id}**)`
        : "unconfirmed";
    return {
      chain: "ltc",
      hash: row.hash,
      summary: `**LTC** · ${blk} · fee ${row.fee ?? 0} litoshi`,
    };
  } catch {
    return null;
  }
}

/** Etherscan transaction receipt + proxy, or Blockchair ETH. */
async function tryEthTx(
  txHash: string,
  apiKey: string | undefined,
): Promise<LookupResult | null> {
  const key = apiKey?.trim() || "YourApiKeyToken";
  try {
    const res = await fetch(
      `https://api.etherscan.io/api?module=proxy&action=eth_getTransactionByHash` +
        `&txhash=${encodeURIComponent(txHash)}&apikey=${encodeURIComponent(key)}`,
    );
    if (!res.ok) return null;
    const wrapper = (await res.json()) as {
      result: null | Record<string, string>;
    };
    const tx = wrapper.result;
    if (!tx || typeof tx !== "object" || !tx.hash) return null;
    const blockHex = tx.blockNumber;
    const status = blockHex && blockHex !== "0x" ? "included" : "pending";
    const to = tx.to ?? "?";
    const summary = `**ETH** · ${status}${blockHex ? ` · block \`${blockHex}\`` : ""} · to \`${to}\``;
    return { chain: "eth", hash: tx.hash, summary };
  } catch {
    return null;
  }
}

/** Auto-detect network from hash shape and try APIs in order. */
export async function lookupTransaction(
  raw: string,
  etherscanKey: string | undefined,
): Promise<LookupResult | null> {
  const h = raw.trim();
  if (!h) return null;

  if (isEthHash(h)) {
    return (await tryEthTx(h, etherscanKey)) ?? null;
  }

  if (!isBtcLikeHash(h)) {
    return null;
  }

  return (
    (await tryMempoolBtc(h)) ??
    (await tryBlockchairLtc(h)) ??
    null
  );
}
