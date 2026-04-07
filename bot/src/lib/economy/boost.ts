import type { GuildMember } from "discord.js";
import { getBotInternalSecret } from "../../config";
import { fetchEntitlementFromSite } from "../site-client";
import { ECONOMY_BONUS_MULT } from "./config";

/**
 * Payout multiplier for milestones and gambling wins (1 or ~1.2).
 * Pro / owner / server boost = bonus (single +20%, not stacked twice).
 */
export async function economyPayoutMultiplier(
  member: GuildMember | null,
  /** Used in DMs when `member` is null (Pro / owner still counts). */
  discordUserIdFallback?: string,
): Promise<number> {
  let boosted = false;
  if (member?.premiumSince) boosted = true;
  const uid = member?.user?.id ?? discordUserIdFallback;
  const secret = getBotInternalSecret();
  if (secret && uid) {
    try {
      const ent = await fetchEntitlementFromSite(uid);
      if (ent.premium || ent.owner || ent.developer) boosted = true;
    } catch {
      /* offline / misconfig — ignore */
    }
  }
  return boosted ? ECONOMY_BONUS_MULT : 1;
}
