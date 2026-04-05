import { isDeveloperDiscordId } from "../../../lib/bot-developers";
import { isBotOwnerDiscordId } from "../../../lib/bot-owners";
import { getBotInternalSecret } from "../config";
import { fetchEntitlementFromSite } from "./site-client";

/**
 * **Developers** and **owners**: skip Discord **Administrator** + **Knife Pro** gates (e.g. `.say`),
 * and prefix cooldown — same effective bypass. Developers are checked first (no site call).
 *
 * Owners: static `lib/bot-owners.ts` plus DB `.handout owner`, resolved via entitlement API when needed.
 */
export async function isCommandOwnerBypass(
  userId: string,
): Promise<boolean> {
  if (isDeveloperDiscordId(userId)) return true;
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
