import type { EconomyUser } from "@prisma/client";
import type { GuildMember } from "discord.js";
import { applyRebirthCoinMult, totalRebirthCoinIncomeBps } from "./rebirth-mult";

/** Apply permanent rebirth + gem-shop coin % to a positive earn (work, gather, crime win, etc.). */
export function rebirthBoostEarn(
  row: Pick<EconomyUser, "rebirthCount" | "rebirthShop">,
  member: GuildMember | null,
  gross: bigint,
): bigint {
  return applyRebirthCoinMult(gross, totalRebirthCoinIncomeBps(row, member));
}
