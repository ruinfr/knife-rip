import {
  type ButtonInteraction,
  PermissionFlagsBits,
} from "discord.js";
import { getBotPrisma } from "./db-prisma";
import { parseButtonRowId } from "./button-role-components";
import { botCanAssignRole } from "./role-assignment-safety";

export async function handleButtonRoleInteraction(
  interaction: ButtonInteraction,
): Promise<boolean> {
  const rowId = parseButtonRowId(interaction.customId);
  if (!rowId) return false;

  if (!interaction.guildId || !interaction.guild) {
    await interaction.reply({
      content: "Button roles only work in servers.",
      ephemeral: true,
    }).catch(() => {});
    return true;
  }

  try {
    const prisma = getBotPrisma();
    const row = await prisma.botGuildButtonRole.findUnique({
      where: { id: rowId },
    });
    if (!row || row.guildId !== interaction.guildId) {
      await interaction.reply({
        content: "This button is outdated or invalid.",
        ephemeral: true,
      }).catch(() => {});
      return true;
    }

    const member = await interaction.guild.members
      .fetch(interaction.user.id)
      .catch(() => null);
    const role = interaction.guild.roles.cache.get(row.roleId);
    if (!member || !role) {
      await interaction.reply({
        content: "Role or member not found.",
        ephemeral: true,
      }).catch(() => {});
      return true;
    }

    if (!botCanAssignRole(role)) {
      await interaction.reply({
        content: "I cannot manage that role (hierarchy or permissions).",
        ephemeral: true,
      }).catch(() => {});
      return true;
    }

    const me = interaction.guild.members.me;
    if (
      !me?.permissions.has(PermissionFlagsBits.ManageRoles)
    ) {
      await interaction.reply({
        content: "I need **Manage Roles**.",
        ephemeral: true,
      }).catch(() => {});
      return true;
    }

    const has = member.roles.cache.has(row.roleId);
    if (has) {
      await member.roles.remove(row.roleId, "Button role toggle").catch(() => {});
      await interaction
        .reply({ content: `Removed ${role.name}.`, ephemeral: true })
        .catch(() => {});
    } else {
      await member.roles.add(row.roleId, "Button role toggle").catch(() => {});
      await interaction
        .reply({ content: `Added ${role.name}.`, ephemeral: true })
        .catch(() => {});
    }
    return true;
  } catch {
    await interaction
      .reply({ content: "Something went wrong.", ephemeral: true })
      .catch(() => {});
    return true;
  }
}
