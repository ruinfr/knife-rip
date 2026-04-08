import type { Client, GuildMember } from "discord.js";
import { getBotInternalSecret } from "../../config";
import { fetchEntitlementFromSite } from "../site-client";
import { getEconomyPartnerGuildIds } from "./economy-guild-config";
import { ECONOMY_BONUS_MULT } from "./config";

const PARTNER_BOOST_TTL_MS = 120_000;
const partnerBoostCache = new Map<string, { exp: number; value: boolean }>();

/**
 * Nitro server boost counts for the economy bonus when it applies in a configured partner guild
 * (`server1`, `server2`, …). If no partner guilds are configured, any guild the user is boosting
 * in the current `member` context still counts (legacy behavior).
 */
async function hasNitroBoostBonus(
  member: GuildMember | null,
  userId: string | undefined,
  client: Client | undefined,
): Promise<boolean> {
  const partners = getEconomyPartnerGuildIds();
  if (partners.size === 0) {
    return Boolean(member?.premiumSince);
  }
  if (member?.premiumSince && partners.has(member.guild.id)) return true;
  if (!userId || !client) return false;

  const now = Date.now();
  const hit = partnerBoostCache.get(userId);
  if (hit && hit.exp > now) return hit.value;

  let value = false;
  for (const gid of partners) {
    const g = client.guilds.cache.get(gid);
    if (!g) continue;
    try {
      const m = await g.members.fetch(userId).catch(() => null);
      if (m?.premiumSince) {
        value = true;
        break;
      }
    } catch {
      /* ignore */
    }
  }
  partnerBoostCache.set(userId, { value, exp: now + PARTNER_BOOST_TTL_MS });
  return value;
}

/**
 * Payout multiplier for milestones and gambling wins (1 or ~1.2).
 * Counts once: Nitro boost in partner servers (server1/server2/…) OR Knife Pro / owner / developer.
 */
export async function economyPayoutMultiplier(
  member: GuildMember | null,
  /** Used in DMs when `member` is null (Pro / owner still counts). */
  discordUserIdFallback?: string,
  /** Required to detect Nitro boost in partner guilds when the user is not in the hub guild. */
  client?: Client,
): Promise<number> {
  const uid = member?.user?.id ?? discordUserIdFallback;

  let boosted = await hasNitroBoostBonus(member, uid, client);

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
