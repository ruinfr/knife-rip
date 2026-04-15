const DISCORD_API = "https://discord.com/api/v10";

/** arivix.org hub — override with `KNIFE_RIP_*_ROLE_ID` if roles are recreated. */
export const KNIFE_RIP_DEFAULT_PREMIUM_ROLE_ID = "1490510690429964379";
export const KNIFE_RIP_DEFAULT_OWNER_ROLE_ID = "1490510979380023446";
export const KNIFE_RIP_DEFAULT_DEVELOPER_ROLE_ID = "1490510979157594243";

export type KnifeRipPrivilegeSyncEnv = {
  guildId: string;
  premiumRoleId: string;
  ownerRoleId: string;
  developerRoleId: string;
};

function snowflakeOrDefault(
  raw: string | undefined,
  fallback: string,
): string | null {
  const v = (raw?.trim() || fallback).trim();
  return /^\d{17,20}$/.test(v) ? v : null;
}

/**
 * arivix.org community: sync Discord roles with site entitlement.
 * Set **KNIFE_RIP_GUILD_ID** (server id). Role IDs default to the live arivix.org roles unless overridden.
 * Bot role must sit above these roles in the hierarchy.
 */
export function getKnifeRipPrivilegeSyncEnv(): KnifeRipPrivilegeSyncEnv | null {
  const guildId = process.env.KNIFE_RIP_GUILD_ID?.trim();
  if (!guildId || !/^\d{17,20}$/.test(guildId)) return null;

  const premiumRoleId = snowflakeOrDefault(
    process.env.KNIFE_RIP_PREMIUM_ROLE_ID,
    KNIFE_RIP_DEFAULT_PREMIUM_ROLE_ID,
  );
  const ownerRoleId = snowflakeOrDefault(
    process.env.KNIFE_RIP_OWNER_ROLE_ID,
    KNIFE_RIP_DEFAULT_OWNER_ROLE_ID,
  );
  const developerRoleId = snowflakeOrDefault(
    process.env.KNIFE_RIP_DEVELOPER_ROLE_ID,
    KNIFE_RIP_DEFAULT_DEVELOPER_ROLE_ID,
  );
  if (!premiumRoleId || !ownerRoleId || !developerRoleId) return null;

  return {
    guildId,
    premiumRoleId,
    ownerRoleId,
    developerRoleId,
  };
}

/** Shapes from {@link getEntitlementForDiscordUserId} for role mapping. */
export type EntitlementForDiscordRoles = {
  developer: boolean;
  owner: boolean;
  premium: boolean;
};

/**
 * Developer → developer role only. Non-dev owner tier → owner role only. Pro without owner tier → premium only.
 */
export function computePrivilegeRoleDelta(
  ent: EntitlementForDiscordRoles,
  env: KnifeRipPrivilegeSyncEnv,
  currentRoleIds: readonly string[],
): { add: string[]; remove: string[] } {
  const { developerRoleId, ownerRoleId, premiumRoleId } = env;

  const wantDeveloper = ent.developer;
  const wantOwner = ent.owner && !ent.developer;
  const wantPremium = ent.premium && !ent.owner;

  const managed = [developerRoleId, ownerRoleId, premiumRoleId] as const;
  const shouldHave = new Set<string>();
  if (wantDeveloper) shouldHave.add(developerRoleId);
  if (wantOwner) shouldHave.add(ownerRoleId);
  if (wantPremium) shouldHave.add(premiumRoleId);

  const add: string[] = [];
  const remove: string[] = [];
  for (const id of managed) {
    const has = currentRoleIds.includes(id);
    const want = shouldHave.has(id);
    if (want && !has) add.push(id);
    if (!want && has) remove.push(id);
  }

  return { add, remove };
}

export type GuildMemberRolesFetch =
  | { ok: true; roleIds: string[] }
  | { ok: false; kind: "not_member" }
  | { ok: false; kind: "http_error"; status: number };

export async function fetchGuildMemberRoleIds(
  botToken: string,
  guildId: string,
  userId: string,
): Promise<GuildMemberRolesFetch> {
  const res = await fetch(
    `${DISCORD_API}/guilds/${guildId}/members/${userId}`,
    {
      headers: { Authorization: `Bot ${botToken.trim()}` },
    },
  );
  if (res.status === 404) return { ok: false, kind: "not_member" };
  if (!res.ok) return { ok: false, kind: "http_error", status: res.status };
  const j = (await res.json()) as { roles?: string[] };
  const roleIds = Array.isArray(j.roles) ? j.roles : [];
  return { ok: true, roleIds };
}

async function discordMemberRoleRequest(
  method: "PUT" | "DELETE",
  botToken: string,
  guildId: string,
  userId: string,
  roleId: string,
): Promise<Response> {
  return fetch(
    `${DISCORD_API}/guilds/${guildId}/members/${userId}/roles/${roleId}`,
    {
      method,
      headers: { Authorization: `Bot ${botToken.trim()}` },
    },
  );
}

export async function applyPrivilegeRoleDelta(
  botToken: string,
  guildId: string,
  userId: string,
  delta: { add: string[]; remove: string[] },
): Promise<{ ok: boolean; detail?: string }> {
  for (const roleId of delta.remove) {
    const res = await discordMemberRoleRequest(
      "DELETE",
      botToken,
      guildId,
      userId,
      roleId,
    );
    if (!res.ok && res.status !== 404) {
      return {
        ok: false,
        detail: `remove role ${roleId}: HTTP ${res.status}`,
      };
    }
  }
  for (const roleId of delta.add) {
    const res = await discordMemberRoleRequest(
      "PUT",
      botToken,
      guildId,
      userId,
      roleId,
    );
    if (!res.ok) {
      return {
        ok: false,
        detail: `add role ${roleId}: HTTP ${res.status}`,
      };
    }
  }
  return { ok: true };
}

export async function syncKnifeRipPrivilegeRolesFromEntitlement(
  botToken: string,
  env: KnifeRipPrivilegeSyncEnv,
  discordUserId: string,
  ent: EntitlementForDiscordRoles,
): Promise<
  { ok: true; skipped?: "not_member" | "no_change" } | { ok: false; detail: string }
> {
  const fetched = await fetchGuildMemberRoleIds(
    botToken,
    env.guildId,
    discordUserId,
  );
  if (!fetched.ok) {
    if (fetched.kind === "not_member") {
      return { ok: true, skipped: "not_member" };
    }
    return {
      ok: false,
      detail: `Discord API GET member failed (HTTP ${fetched.status})`,
    };
  }

  const delta = computePrivilegeRoleDelta(ent, env, fetched.roleIds);
  if (delta.add.length === 0 && delta.remove.length === 0) {
    return { ok: true, skipped: "no_change" };
  }

  const applied = await applyPrivilegeRoleDelta(
    botToken,
    env.guildId,
    discordUserId,
    delta,
  );
  if (!applied.ok) {
    return { ok: false, detail: applied.detail ?? "apply failed" };
  }
  return { ok: true };
}
