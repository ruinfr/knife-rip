import { isBotOwnerDiscordId } from "../../../lib/bot-owners";
import { getBotInternalSecret } from "../config";
import { fetchEntitlementFromSite } from "./site-client";

/**
 * Bot owners: static IDs in `lib/bot-owners.ts` plus DB `.handout owner` rows
 * (resolved via the site entitlement API with a short cache).
 */
export async function isCommandOwnerBypass(
  userId: string,
): Promise<boolean> {
  if (isBotOwnerDiscordId(userId)) return true;

  const secret = getBotInternalSecret();
  if (!secret) return false;

  try {
    const ent = await fetchEntitlementFromSite(userId);
    return ent.owner;
  } catch {
    return false;
  }
}
