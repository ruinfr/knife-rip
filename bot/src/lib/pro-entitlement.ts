import { isKnifePremium } from "../../../lib/knife-premium";
import { getBotInternalSecret } from "../config";
import { isCommandOwnerBypass } from "./owner-bypass";
import { fetchEntitlementFromSite } from "./site-client";

const PRICING_URL = "https://arivix.org/pricing";

/** Arivix Pro site entitlement check (shared by .remind, .vanity, etc.). */
export async function userCanUseKnifeProFeatures(
  userId: string,
  options?: { commandLabel?: string },
): Promise<{
  ok: boolean;
  reason?: string;
}> {
  if (await isCommandOwnerBypass(userId)) return { ok: true };
  if (isKnifePremium(userId)) return { ok: true };

  if (!getBotInternalSecret()) {
    return {
      ok: false,
      reason:
        "Arivix Pro isn’t linked on this bot (**BOT_INTERNAL_SECRET** missing).",
    };
  }

  try {
    const e = await fetchEntitlementFromSite(userId);
    if (e.premium || e.developer || e.owner) return { ok: true };
    const label = options?.commandLabel ?? "This command";
    return {
      ok: false,
      reason: `**${label}** is **Arivix Pro** only.\n**[Pricing](${PRICING_URL})**`,
    };
  } catch {
    return {
      ok: false,
      reason: "Could not verify Pro status. Try again shortly.",
    };
  }
}
