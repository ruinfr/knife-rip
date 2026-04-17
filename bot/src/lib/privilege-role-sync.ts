import type { Client } from "discord.js";
import {
  getArivixRipPrivilegeSyncEnv,
  syncArivixRipPrivilegeRolesFromEntitlement,
} from "../../../lib/discord-guild-role-sync";
import { fetchEntitlementFromSite } from "./site-client";

/**
 * Align arivix.org guild roles with production entitlement (same REST logic as Vercel).
 * Backup for handout + catches members who already hold managed roles (cache-dependent).
 */
export async function syncArivixRipRolesForDiscordUser(
  discordUserId: string,
): Promise<void> {
  const env = getArivixRipPrivilegeSyncEnv();
  const token = process.env.DISCORD_BOT_TOKEN?.trim();
  if (!env || !token) return;

  try {
    const ent = await fetchEntitlementFromSite(discordUserId, {
      bypassCache: true,
    });
    const result = await syncArivixRipPrivilegeRolesFromEntitlement(
      token,
      env,
      discordUserId,
      ent,
    );
    if (!result.ok) {
      console.error("[privilege-roles]", discordUserId, result.detail);
    }
  } catch (e) {
    console.error("[privilege-roles]", discordUserId, e);
  }
}

export async function reconcileArivixRipSuspectRoles(client: Client): Promise<void> {
  const env = getArivixRipPrivilegeSyncEnv();
  if (!env) return;

  const guild = client.guilds.cache.get(env.guildId);
  if (!guild) return;

  const suspects = new Set<string>();
  guild.roles.cache.get(env.developerRoleId)?.members.forEach((m) => {
    suspects.add(m.id);
  });
  guild.roles.cache.get(env.ownerRoleId)?.members.forEach((m) => {
    suspects.add(m.id);
  });
  guild.roles.cache.get(env.premiumRoleId)?.members.forEach((m) => {
    suspects.add(m.id);
  });

  for (const id of suspects) {
    await syncArivixRipRolesForDiscordUser(id);
    await new Promise((r) => setTimeout(r, 400));
  }
}
