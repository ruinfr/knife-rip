import {
  PermissionFlagsBits,
  type GuildMember,
  type Role,
} from "discord.js";

/** Bot can safely assign this role to members (hierarchy + managed + everyone). */
export function botCanAssignRole(role: Role): boolean {
  const guild = role.guild;
  const me = guild.members.me;
  if (!me?.permissions.has(PermissionFlagsBits.ManageRoles)) return false;
  if (role.managed) return false;
  if (role.id === guild.id) return false;
  if (role.position >= me.roles.highest.position) return false;
  return true;
}

/** Executor (moderator) may configure this role in commands. */
export function executorMayConfigureRole(
  executor: GuildMember,
  role: Role,
): boolean {
  const me = executor.guild.members.me;
  if (!me) return false;
  if (role.managed) return false;
  if (role.id === executor.guild.id) return false;
  if (role.position >= me.roles.highest.position) return false;

  if (executor.permissions.has(PermissionFlagsBits.ManageGuild)) {
    return true;
  }
  if (!executor.permissions.has(PermissionFlagsBits.ManageRoles)) return false;
  if (role.position >= executor.roles.highest.position) return false;
  return true;
}
