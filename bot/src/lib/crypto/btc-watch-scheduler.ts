import type { Client } from "discord.js";
import { getBotPrisma } from "../db-prisma";

type MempoolStatus = { confirmed: boolean; block_height?: number };

async function mempoolTxStatus(txHash: string): Promise<MempoolStatus | null> {
  try {
    const res = await fetch(
      `https://mempool.space/api/tx/${txHash}/status`,
    );
    if (!res.ok) return null;
    return (await res.json()) as MempoolStatus;
  } catch {
    return null;
  }
}

export async function tickBtcTxWatches(client: Client): Promise<void> {
  try {
    const prisma = getBotPrisma();
    const rows = await prisma.botBtcTxWatch.findMany({ take: 100 });
    for (const row of rows) {
      const st = await mempoolTxStatus(row.txHash);
      if (!st?.confirmed) continue;

      const body =
        `Your Bitcoin transaction received **at least one confirmation**.\n` +
        `\`${row.txHash}\`\n` +
        (st.block_height != null ? `Block: **${st.block_height}**\n` : "") +
        `https://mempool.space/tx/${row.txHash}`;

      const user = await client.users.fetch(row.userId).catch(() => null);
      let notified = false;
      if (user) {
        await user.send({ content: body }).catch(() => {});
        notified = true;
      }

      if (!notified && row.guildId && row.channelId) {
        const g = client.guilds.cache.get(row.guildId);
        const ch = await g?.channels.fetch(row.channelId).catch(() => null);
        if (ch?.isTextBased()) {
          await ch
            .send({ content: `<@${row.userId}> ${body}` })
            .catch(() => {});
        }
      }

      await prisma.botBtcTxWatch.delete({ where: { id: row.id } }).catch(() => {});
    }
  } catch {
    /* DB or network */
  }
}
