import { isDeveloperDiscordId } from "../../../lib/bot-developers";
import { getBotInternalSecret } from "../config";
import { fetchEntitlementFromSite } from "./site-client";

/**
 * **Developers** and **owners**: skip Discord **Administrator** + **Arivix Pro** gates (e.g. `.say`),
 * prefix cooldown, and **`.command` disable rules** (dispatch still runs for support).
 *
 * Does **not** bypass **Manage Server** / **Manage Nicknames** for **`.prefix`**, **`.command`**,
 * **`.audit`**, or **`.nickname`** — those require normal guild permissions in that server.
 *
 * Owners: via site entitlement API (handouts, bootstrap revocations).
 */
export async function isCommandOwnerBypass(
  userId: string,
): Promise<boolean> {
  if (isDeveloperDiscordId(userId)) return true;

  const secret = getBotInternalSecret();
  if (!secret) return false;

  try {
    const ent = await fetchEntitlementFromSite(userId);
    return ent.owner;
  } catch {
    return false;
  }
}
