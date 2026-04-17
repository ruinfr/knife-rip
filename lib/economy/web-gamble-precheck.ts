import type { EconomyUser } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { WEB_GAMBLE_COOLDOWN_MS } from "./arivix-cash-web";

type Tx = Prisma.TransactionClient;

export async function upsertEconomyUserInTx(
  tx: Tx,
  discordId: string,
): Promise<EconomyUser> {
  return tx.economyUser.upsert({
    where: { discordUserId: discordId },
    create: { discordUserId: discordId },
    update: {},
  });
}

export function assertWebGambleAllowed(
  row: EconomyUser,
  bet: bigint,
): void {
  if (!row.gambleDisclaimerAcceptedAt) throw new Error("DISCLAIMER");
  if (row.cash < bet) throw new Error("INSUFFICIENT_FUNDS");
}

export async function assertWebGambleCooldown(
  tx: Tx,
  discordId: string,
  gameKey: string,
): Promise<void> {
  const last = await tx.economyGambleLog.findFirst({
    where: { discordUserId: discordId, game: gameKey },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (
    last &&
    Date.now() - last.createdAt.getTime() < WEB_GAMBLE_COOLDOWN_MS
  ) {
    throw new Error("COOLDOWN");
  }
}
