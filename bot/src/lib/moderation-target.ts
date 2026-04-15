import type { EmbedBuilder, GuildMember, Message, User } from "discord.js";

import { errorEmbed } from "./embeds";

export type ModTargetOk = {
  ok: true;
  member: GuildMember;
  tailArgs: string[];
};

export type ModTargetFail = { ok: false; embed: EmbedBuilder };

/**
 * Target must be a member currently in the guild (kick / timeout).
 */
export async function resolveModerationMember(
  message: Message,
  args: string[],
): Promise<ModTargetOk | ModTargetFail> {
  const guild = message.guild;
  if (!guild) {
    return { ok: false, embed: errorEmbed("This only works in a server.") };
  }

  const mentionMember = message.mentions.members?.first();
  if (mentionMember) {
    let skip = 1;
    const id = mentionMember.id;
    const a0 = args[0]?.trim() ?? "";
    if (a0 === `<@${id}>` || a0 === `<@!${id}>`) skip = 1;
    else if (a0 === id) skip = 1;
    return {
      ok: true,
      member: mentionMember,
      tailArgs: args.slice(skip),
    };
  }

  const raw = args[0]?.trim();
  if (raw && /^\d{17,20}$/.test(raw)) {
    const member = await guild.members.fetch(raw).catch(() => null);
    if (!member) {
      return {
        ok: false,
        embed: errorEmbed("That user is not in this server."),
      };
    }
    return { ok: true, member, tailArgs: args.slice(1) };
  }

  return {
    ok: false,
    embed: errorEmbed("Mention a member or use their **user ID**."),
  };
}

export type BanTargetOk = {
  ok: true;
  user: User;
  member: GuildMember | null;
  tailArgs: string[];
};

/**
 * Ban by mention or ID — user may be outside the guild.
 */
export async function resolveBanTarget(
  message: Message,
  args: string[],
): Promise<BanTargetOk | ModTargetFail> {
  const guild = message.guild;
  if (!guild) {
    return { ok: false, embed: errorEmbed("This only works in a server.") };
  }

  const mention = message.mentions.users.first();
  if (mention) {
    let skip = 1;
    const a0 = args[0]?.trim() ?? "";
    if (
      a0 === `<@${mention.id}>` ||
      a0 === `<@!${mention.id}>` ||
      a0 === mention.id
    ) {
      skip = 1;
    }
    const member = await guild.members.fetch(mention.id).catch(() => null);
    return {
      ok: true,
      user: mention,
      member,
      tailArgs: args.slice(skip),
    };
  }

  const raw = args[0]?.trim();
  if (raw && /^\d{17,20}$/.test(raw)) {
    let user: User | null = null;
    try {
      user = await message.client.users.fetch(raw);
    } catch {
      user = null;
    }
    if (!user) {
      return {
        ok: false,
        embed: errorEmbed("Unknown user ID."),
      };
    }
    const member = await guild.members.fetch(raw).catch(() => null);
    return { ok: true, user, member, tailArgs: args.slice(1) };
  }

  return {
    ok: false,
    embed: errorEmbed("Mention a user or pass a **user ID** to ban."),
  };
}

function banDeleteSecondsFromTail(tail: string[]): {
  deleteSeconds: number;
  reasonParts: string[];
} {
  if (tail.length > 0 && /^[0-7]$/.test(tail[0]!)) {
    const days = parseInt(tail[0]!, 10);
    return {
      deleteSeconds: days * 24 * 60 * 60,
      reasonParts: tail.slice(1),
    };
  }
  return { deleteSeconds: 0, reasonParts: tail };
}

export function parseBanOptions(tailArgs: string[]): {
  deleteMessageSeconds: number;
  reason: string;
} {
  const { deleteSeconds, reasonParts } = banDeleteSecondsFromTail(tailArgs);
  const reason = reasonParts.join(" ").trim().slice(0, 500);
  return { deleteMessageSeconds: deleteSeconds, reason };
}

/** Whether the actor can punish the target (hierarchy + self/bot guards). */
export function canPunish(actor: GuildMember, target: GuildMember): string | null {
  if (target.id === actor.id) {
    return "You can’t use this on yourself.";
  }
  if (target.user.bot && target.id === target.client.user?.id) {
    return "You can’t use this on me.";
  }
  if (target.id === target.guild.ownerId) {
    return "You can’t moderate the **server owner**.";
  }
  if (actor.id === target.guild.ownerId) {
    return null;
  }
  if (target.roles.highest.position >= actor.roles.highest.position) {
    return "That member’s top role is **above or equal** to yours.";
  }
  return null;
}

/** Bot role must be above the target’s top role. */
export function assertBotHierarchy(
  botMember: GuildMember,
  target: GuildMember,
): string | null {
  if (target.roles.highest.position >= botMember.roles.highest.position) {
    return "Move **Arivix’s** role **above** the member’s top role.";
  }
  return null;
}
