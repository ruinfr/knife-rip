import type { Message } from "discord.js";
import { PermissionFlagsBits } from "discord.js";
import { describeDuration, parseModerationDuration } from "../../lib/moderation-duration";
import {
  actionableErrorEmbed,
  errorEmbed,
  minimalEmbed,
  missingPermissionEmbed,
} from "../../lib/embeds";
import {
  assertBotHierarchy,
  canPunish,
  resolveModerationMember,
} from "../../lib/moderation-target";
import type { KnifeCommand } from "../types";

async function requireTimeoutPerm(message: Message) {
  const g = message.guild;
  if (!g) return errorEmbed("Use this in a server channel.", { title: "Servers only" });
  const mem =
    message.member ??
    (await g.members.fetch(message.author.id).catch(() => null));
  if (!mem?.permissions.has(PermissionFlagsBits.ModerateMembers)) {
    return missingPermissionEmbed(
      "you",
      "Moderate Members (Timeout / mute)",
    );
  }
  return null;
}

export const timeoutCommand: KnifeCommand = {
  name: "timeout",
  aliases: ["mute", "to"],
  description:
    "Timeout a member — duration like 10m, 2h, 1d (max 28d); optional reason after",
  site: {
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
    usage: ".timeout @user 30m [reason]",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const deny = await requireTimeoutPerm(message);
    if (deny) {
      await message.reply({ embeds: [deny] });
      return;
    }

    const resolved = await resolveModerationMember(message, args);
    if (!resolved.ok) {
      await message.reply({ embeds: [resolved.embed] });
      return;
    }

    const { member: target, tailArgs } = resolved;
    const durationRaw = tailArgs[0]?.trim();
    if (!durationRaw) {
      await message.reply({
        embeds: [
          errorEmbed(
            "Usage: **`.timeout`** `@user` **`5m`** `[reason]` — units: **s m h d w** (plain number = minutes).",
          ),
        ],
      });
      return;
    }

    const ms = parseModerationDuration(durationRaw);
    if (!ms) {
      await message.reply({
        embeds: [
          errorEmbed(
            "Invalid duration. Examples: `30m`, `2h`, `1d`, `90` (minutes).",
          ),
        ],
      });
      return;
    }

    const reasonRaw = tailArgs.slice(1).join(" ").trim().slice(0, 450);
    const reason =
      reasonRaw || `Timeout ${describeDuration(ms)} by ${message.author.tag}`;

    const actor = message.member!;
    const v = canPunish(actor, target);
    if (v) {
      await message.reply({ embeds: [errorEmbed(v)] });
      return;
    }

    const me = message.guild!.members.me;
    if (!me) {
      await message.reply({ embeds: [errorEmbed("Could not load my member.")] });
      return;
    }
    const botChk = assertBotHierarchy(me, target);
    if (botChk) {
      await message.reply({ embeds: [errorEmbed(botChk)] });
      return;
    }
    if (!target.moderatable) {
      await message.reply({
        embeds: [
          errorEmbed("I can’t timeout that member (owner, admin, or hierarchy)."),
        ],
      });
      return;
    }

    try {
      await target.timeout(ms, reason);
    } catch {
      await message.reply({
        embeds: [
          actionableErrorEmbed({
            title: "Timeout failed",
            body: "Discord blocked it — I need **Moderate Members** and my role must sit above the member.",
            linkPermissionsDoc: true,
          }),
        ],
      });
      return;
    }

    await message.reply({
      embeds: [
        minimalEmbed({
          title: "Timed out",
          description:
            `**${target.user.tag}** — **${describeDuration(ms)}**\n**Reason:** ${reason}`,
        }),
      ],
    });
  },
};

export const timeoutlistCommand: KnifeCommand = {
  name: "timeoutlist",
  aliases: ["timeouts", "mutelist"],
  description: "Members currently timed out — **Moderate Members**",
  site: {
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
    usage: ".timeoutlist",
    tier: "free",
    style: "prefix",
  },
  async run({ message }) {
    const deny = await requireTimeoutPerm(message);
    if (deny) {
      await message.reply({ embeds: [deny] });
      return;
    }

    const guild = message.guild!;
    await guild.members.fetch().catch(() => {});
    const timed = guild.members.cache.filter(
      (m) =>
        m.communicationDisabledUntil !== null &&
        m.communicationDisabledUntil > new Date(),
    );
    if (timed.size === 0) {
      await message.reply({
        embeds: [
          minimalEmbed({ title: "Timeouts", description: "_Nobody is timed out._" }),
        ],
      });
      return;
    }
    const lines = [...timed.values()]
      .slice(0, 25)
      .map(
        (m) =>
          `${m.user.tag} · until <t:${Math.floor(m.communicationDisabledUntil!.getTime() / 1000)}:R>`,
      );
    await message.reply({
      embeds: [
        minimalEmbed({
          title: `Timed out (${timed.size})`,
          description: lines.join("\n").slice(0, 3900),
        }),
      ],
    });
  },
};

export const untimeoutCommand: KnifeCommand = {
  name: "untimeout",
  aliases: ["unmute", "ut"],
  description: "Remove a member’s active timeout",
  site: {
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
    usage: ".untimeout · .unmute · .ut — @user [reason]",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const deny = await requireTimeoutPerm(message);
    if (deny) {
      await message.reply({ embeds: [deny] });
      return;
    }

    const resolved = await resolveModerationMember(message, args);
    if (!resolved.ok) {
      await message.reply({ embeds: [resolved.embed] });
      return;
    }

    const { member: target, tailArgs } = resolved;
    const reason =
      tailArgs.join(" ").trim().slice(0, 450) ||
      `Timeout cleared by ${message.author.tag}`;

    const actor =
      message.member ??
      (await message.guild!.members.fetch(message.author.id));
    const v = canPunish(actor, target);
    if (v) {
      await message.reply({ embeds: [errorEmbed(v)] });
      return;
    }

    const me = message.guild!.members.me;
    if (!me) {
      await message.reply({ embeds: [errorEmbed("Could not load my member.")] });
      return;
    }
    const botChk = assertBotHierarchy(me, target);
    if (botChk) {
      await message.reply({ embeds: [errorEmbed(botChk)] });
      return;
    }
    if (!target.moderatable) {
      await message.reply({
        embeds: [
          errorEmbed("I can’t change timeout for that member (hierarchy)."),
        ],
      });
      return;
    }

    if (!target.communicationDisabledUntil) {
      await message.reply({
        embeds: [errorEmbed("That member is not timed out.")],
      });
      return;
    }

    try {
      await target.timeout(null, reason);
    } catch {
      await message.reply({
        embeds: [
          actionableErrorEmbed({
            title: "Couldn't clear timeout",
            body: "Discord rejected the change — check **Moderate Members** and role order.",
            linkPermissionsDoc: true,
          }),
        ],
      });
      return;
    }

    await message.reply({
      embeds: [
        minimalEmbed({
          title: "Timeout removed",
          description: `**${target.user.tag}** can speak again.\n**Note:** ${reason}`,
        }),
      ],
    });
  },
};
