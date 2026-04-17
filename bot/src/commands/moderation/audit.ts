import type { Message } from "discord.js";
import { PermissionFlagsBits } from "discord.js";
import { errorEmbed, minimalEmbed, missingPermissionEmbed } from "../../lib/embeds";
import { hasGuildPermission } from "../../lib/discord-member-perms";
import { fetchRecentGuildCommandAudit } from "../../lib/guild-command-audit";
import type { ArivixCommand } from "../types";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const MIN_LIMIT = 1;

function invokerCanViewAudit(message: Message): Promise<boolean> {
  return hasGuildPermission(message, PermissionFlagsBits.ManageGuild);
}

function parseLimit(raw: string | undefined): number | null {
  if (raw === undefined) return DEFAULT_LIMIT;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return null;
  if (n < MIN_LIMIT || n > MAX_LIMIT) return null;
  return n;
}

export const auditCommand: ArivixCommand = {
  name: "audit",
  aliases: ["auditlog", "cmdlog"],
  description:
    "Manage Server only — recent prefix runs (who, command, time, ok/fail); no message text",
  site: {
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
    usage: `.audit / .auditlog / .cmdlog — optional limit ${MIN_LIMIT}–${MAX_LIMIT}`,
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    if (!message.guild) {
      await message.reply({
        embeds: [errorEmbed("Use **audit** in a server.")],
      });
      return;
    }

    if (!(await invokerCanViewAudit(message))) {
      await message.reply({
        embeds: [missingPermissionEmbed("you", "Manage Server")],
      });
      return;
    }

    const limit = parseLimit(args[0]);
    if (limit === null) {
      await message.reply({
        embeds: [
          errorEmbed(
            `Give a number **${MIN_LIMIT}–${MAX_LIMIT}**, or nothing for **${DEFAULT_LIMIT}**.`,
          ),
        ],
      });
      return;
    }

    try {
      const rows = await fetchRecentGuildCommandAudit(message.guild.id, limit);
      if (rows.length === 0) {
        await message.reply({
          embeds: [
            minimalEmbed({
              title: "Command audit",
              description:
                "No prefix commands have been logged in this server yet.",
            }),
          ],
        });
        return;
      }

      const lines = rows.map((r, i) => {
        const t = Math.floor(r.createdAt.getTime() / 1000);
        const outcome = r.success ? "ok" : "fail";
        return `${i + 1}. <t:${t}:f> · <@${r.actorUserId}> · **.${r.commandKey}** · ${outcome}`;
      });

      await message.reply({
        embeds: [
          minimalEmbed({
            title: `Command audit (last ${rows.length})`,
            description: lines.join("\n"),
            footerText:
              "No message text or args stored. ok = finished; fail = bot error while handling.",
          }),
        ],
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await message.reply({
        embeds: [
          errorEmbed(
            `Could not load audit — database error? ${msg.slice(0, 200)}`,
          ),
        ],
      });
    }
  },
};
