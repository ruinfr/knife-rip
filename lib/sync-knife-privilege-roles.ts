import { db } from "@/lib/db";
import { getEntitlementForDiscordUserId } from "@/lib/entitlement";
import {
  getKnifeRipPrivilegeSyncEnv,
  syncKnifeRipPrivilegeRolesFromEntitlement,
} from "@/lib/discord-guild-role-sync";

/** Returned from handout API and logged on failures. */
export type KnifeRipDiscordRoleSyncReport =
  | { state: "disabled"; detail?: string }
  | { state: "applied" }
  | { state: "no_change" }
  | { state: "not_member" }
  | { state: "error"; detail: string };

/**
 * After entitlement changes on the site (Stripe, handout API), align arivix.org Discord roles.
 * No-op if guild/role env or bot token is missing.
 * **Await** this in serverless routes so work finishes before the invocation ends.
 */
export async function syncKnifeRipDiscordRolesForDiscordUser(
  discordUserId: string,
): Promise<KnifeRipDiscordRoleSyncReport> {
  const env = getKnifeRipPrivilegeSyncEnv();
  const token = process.env.DISCORD_BOT_TOKEN?.trim();
  if (!env || !token) {
    return {
      state: "disabled",
      detail: !token
        ? "DISCORD_BOT_TOKEN missing"
        : "KNIFE_RIP_GUILD_ID not set (role IDs have defaults)",
    };
  }

  if (!/^\d{17,20}$/.test(discordUserId)) {
    return { state: "error", detail: "invalid discord user id" };
  }

  try {
    const ent = await getEntitlementForDiscordUserId(discordUserId);
    const result = await syncKnifeRipPrivilegeRolesFromEntitlement(
      token,
      env,
      discordUserId,
      ent,
    );
    if (!result.ok) {
      console.error(
        "[knife-privilege-roles]",
        discordUserId,
        result.detail,
      );
      return { state: "error", detail: result.detail };
    }
    if (result.skipped === "not_member") return { state: "not_member" };
    if (result.skipped === "no_change") return { state: "no_change" };
    return { state: "applied" };
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error("[knife-privilege-roles]", discordUserId, e);
    return { state: "error", detail };
  }
}

export async function resolveDiscordProviderAccountId(
  userId: string,
): Promise<string | null> {
  const acc = await db.account.findFirst({
    where: { userId, provider: "discord" },
    select: { providerAccountId: true },
  });
  const id = acc?.providerAccountId?.trim();
  return id && /^\d{17,20}$/.test(id) ? id : null;
}

/**
 * Stripe and other user-scoped hooks: sync by internal `User.id` when they use Discord login.
 */
export async function syncKnifeRipDiscordRolesForUserId(
  userId: string,
): Promise<KnifeRipDiscordRoleSyncReport | null> {
  const discordId = await resolveDiscordProviderAccountId(userId);
  if (!discordId) return null;
  return syncKnifeRipDiscordRolesForDiscordUser(discordId);
}
