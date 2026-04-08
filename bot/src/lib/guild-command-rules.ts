import type { Message } from "discord.js";
import { BotCommandRoleOverrideEffect } from "@prisma/client";
import { getBotPrisma } from "./db-prisma";
import { isCommandOwnerBypass } from "./owner-bypass";

/** Guild-wide scope for `.command` / overrides (not a real channel id). */
export const GUILD_COMMAND_SCOPE_ALL = "*" as const;

/** Cannot be disabled or role-overridden (avoids locking out prefix / meta config). */
export const NON_CONFIGURABLE_COMMAND_KEYS = new Set(["command", "prefix"]);

type RulesPayload = {
  disables: { commandKey: string; channelScope: string }[];
  overrides: {
    commandKey: string;
    roleId: string;
    channelScope: string;
    effect: BotCommandRoleOverrideEffect;
  }[];
};

const CACHE_MS = 8000;
const cache = new Map<string, { payload: RulesPayload; exp: number }>();

/** roleIds that may use commandKey when restriction is configured (empty = no restriction). */
const restrictCache = new Map<
  string,
  { byCmd: Map<string, string[]>; exp: number }
>();

export function invalidateGuildCommandRulesCache(guildId: string): void {
  cache.delete(guildId);
  restrictCache.delete(guildId);
}

async function loadRestrictRoleIds(
  guildId: string,
  commandKey: string,
): Promise<string[] | null> {
  const now = Date.now();
  let entry = restrictCache.get(guildId);
  if (!entry || entry.exp <= now) {
    try {
      const prisma = getBotPrisma();
      const rows = await prisma.botGuildCommandRestrictAllow.findMany({
        where: { guildId },
        select: { commandKey: true, roleId: true },
      });
      const byCmd = new Map<string, string[]>();
      for (const r of rows) {
        const list = byCmd.get(r.commandKey) ?? [];
        list.push(r.roleId);
        byCmd.set(r.commandKey, list);
      }
      entry = { byCmd, exp: now + CACHE_MS };
      restrictCache.set(guildId, entry);
    } catch {
      return null;
    }
  }
  const roles = entry.byCmd.get(commandKey);
  if (!roles || roles.length === 0) return null;
  return roles;
}

async function loadRulesPayload(guildId: string): Promise<RulesPayload | null> {
  const now = Date.now();
  const hit = cache.get(guildId);
  if (hit && hit.exp > now) return hit.payload;

  try {
    const prisma = getBotPrisma();
    const [disables, overrides] = await Promise.all([
      prisma.botGuildCommandDisable.findMany({
        where: { guildId },
        select: { commandKey: true, channelScope: true },
      }),
      prisma.botGuildCommandRoleOverride.findMany({
        where: { guildId },
        select: {
          commandKey: true,
          roleId: true,
          channelScope: true,
          effect: true,
        },
      }),
    ]);
    const payload: RulesPayload = { disables, overrides };
    cache.set(guildId, { payload, exp: now + CACHE_MS });
    return payload;
  } catch {
    return null;
  }
}

/** Text / thread channel id for rule matching (threads use parent). */
export function effectiveChannelScopeFromMessage(
  message: Message,
): string | null {
  const ch = message.channel;
  if (!ch.isTextBased() || ch.isDMBased()) return null;
  if (ch.isThread()) return ch.parentId ?? ch.id;
  return ch.id;
}

function isCommandDisabledInScope(
  commandKey: string,
  scopeChannelId: string | null,
  disables: RulesPayload["disables"],
): boolean {
  return disables.some(
    (d) =>
      d.commandKey === commandKey &&
      (d.channelScope === GUILD_COMMAND_SCOPE_ALL ||
        (scopeChannelId !== null && d.channelScope === scopeChannelId)),
  );
}

function memberHasDeny(
  roleIds: Set<string>,
  commandKey: string,
  scopeChannelId: string | null,
  overrides: RulesPayload["overrides"],
): boolean {
  return overrides.some(
    (o) =>
      o.effect === BotCommandRoleOverrideEffect.DENY &&
      o.commandKey === commandKey &&
      roleIds.has(o.roleId) &&
      (o.channelScope === GUILD_COMMAND_SCOPE_ALL ||
        (scopeChannelId !== null && o.channelScope === scopeChannelId)),
  );
}

function memberHasAllow(
  roleIds: Set<string>,
  commandKey: string,
  scopeChannelId: string | null,
  overrides: RulesPayload["overrides"],
): boolean {
  return overrides.some(
    (o) =>
      o.effect === BotCommandRoleOverrideEffect.ALLOW &&
      o.commandKey === commandKey &&
      roleIds.has(o.roleId) &&
      (o.channelScope === GUILD_COMMAND_SCOPE_ALL ||
        (scopeChannelId !== null && o.channelScope === scopeChannelId)),
  );
}

async function memberRoleIds(message: Message): Promise<Set<string>> {
  const roleIds = new Set<string>();
  if (!message.guild) return roleIds;
  roleIds.add(message.guild.id);
  let member = message.member;
  if (!member) {
    member = await message.guild.members
      .fetch(message.author.id)
      .catch(() => null);
  }
  for (const id of member?.roles.cache.keys() ?? []) {
    roleIds.add(id);
  }
  return roleIds;
}

/**
 * Guild prefix-command gate: DENY overrides, then disables + ALLOW bypass.
 * Fail-open if DB is unavailable.
 */
export async function isGuildPrefixCommandAllowed(
  message: Message,
  canonicalCommandName: string,
): Promise<boolean> {
  if (!message.guild) return true;
  if (NON_CONFIGURABLE_COMMAND_KEYS.has(canonicalCommandName)) return true;
  if (await isCommandOwnerBypass(message.author.id)) return true;

  const restrictRoles = await loadRestrictRoleIds(
    message.guild.id,
    canonicalCommandName,
  );
  if (restrictRoles) {
    const roleIds = await memberRoleIds(message);
    const allowed = restrictRoles.some((rid) => roleIds.has(rid));
    if (!allowed) return false;
  }

  const rules = await loadRulesPayload(message.guild.id);
  if (!rules) return true;

  const scopeChannelId = effectiveChannelScopeFromMessage(message);
  const roleIds = await memberRoleIds(message);

  if (
    memberHasDeny(roleIds, canonicalCommandName, scopeChannelId, rules.overrides)
  ) {
    return false;
  }

  const disabled = isCommandDisabledInScope(
    canonicalCommandName,
    scopeChannelId,
    rules.disables,
  );
  if (!disabled) return true;

  return memberHasAllow(
    roleIds,
    canonicalCommandName,
    scopeChannelId,
    rules.overrides,
  );
}
