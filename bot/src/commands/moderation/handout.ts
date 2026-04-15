import type { Message, User } from "discord.js";
import { resolveCommunityDiscordInviteUrl } from "../../../../lib/community-discord";
import { isDeveloperDiscordId } from "../../../../lib/bot-developers";
import { getBotInternalSecret } from "../../config";
import { errorEmbed, minimalEmbed } from "../../lib/embeds";
import { isCommandOwnerBypass } from "../../lib/owner-bypass";
import { resolveTargetUser } from "../../lib/resolve-target-user";
import {
  fetchEntitlementFromSite,
  invalidateEntitlementCache,
  postHandoutToSite,
  type HandoutRoleSync,
} from "../../lib/site-client";
import type { KnifeCommand } from "../types";

function stripParens(s: string): string {
  let t = s.trim();
  if (t.startsWith("(") && t.endsWith(")")) {
    t = t.slice(1, -1).trim();
  }
  return t;
}

function normalizeKind(raw: string | undefined): "OWNER" | "PREMIUM" | null {
  if (!raw) return null;
  const k = stripParens(raw).toLowerCase();
  if (k === "owner" || k === "bot") return "OWNER";
  if (k === "premium" || k === "pro" || k === "site") return "PREMIUM";
  return null;
}

function findActionIndex(
  args: string[],
): { idx: number; action: "add" | "remove" } | null {
  let addI = -1;
  let remI = -1;
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!.toLowerCase();
    if (a === "add") addI = i;
    else if (a === "remove") remI = i;
  }
  if (addI >= 0 && remI >= 0) return null;
  if (addI >= 0) return { idx: addI, action: "add" };
  if (remI >= 0) return { idx: remI, action: "remove" };
  return null;
}

function roleSyncFootnote(rs: HandoutRoleSync | undefined): string {
  if (!rs) return "";
  switch (rs.state) {
    case "applied":
      return "\n\n**Discord:** Roles updated for the arivix.org server.";
    case "no_change":
      return "\n\n**Discord:** Roles already matched entitlement.";
    case "not_member":
      return "\n\n**Discord:** Not in the hub server yet — handout saved; roles apply after they join (see footer).";
    case "disabled":
      return `\n\n**Discord:** Role sync disabled (${rs.detail ?? "set KNIFE_RIP_GUILD_ID + DISCORD_BOT_TOKEN on the site"}).`;
    case "error": {
      const detail = (rs.detail ?? "unknown").slice(0, 400);
      return `\n\n**Discord:** Role sync failed — ${detail}`;
    }
    default:
      return "";
  }
}

function handoutHubFooter(rs: HandoutRoleSync | undefined): string | undefined {
  if (rs?.state !== "not_member") return undefined;
  return `Join ${resolveCommunityDiscordInviteUrl()} for Pro/owner/dev roles`;
}

function firstArgLooksLikeUserRef(raw: string | undefined): boolean {
  if (!raw) return false;
  const t = raw.trim();
  return /^<@!?\d{17,20}>$/.test(t) || /^\d{17,20}$/.test(t);
}

async function resolveHandoutTarget(
  message: Message,
  userArgs: string[],
): Promise<User | null> {
  const botId = message.client.user?.id;
  const mentions = [...message.mentions.users.values()].filter(
    (u) => u.id !== botId,
  );

  if (userArgs.length > 0) {
    // Broken/garbled tokens after ".handout" (e.g. Discord glitches) — still use @mentions.
    if (mentions.length >= 1 && !firstArgLooksLikeUserRef(userArgs[0])) {
      return mentions[0]!;
    }
    return resolveTargetUser(message, userArgs);
  }

  if (mentions.length === 1) {
    return mentions[0]!;
  }
  return null;
}

export const handoutCommand: KnifeCommand = {
  name: "handout",
  aliases: ["granttier", "tierhandout"],
  description:
    "Handouts in DB — Developers control owner; owners handle premium for non-owners",
  site: {
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
    usage: ".handout add @user premium · remove @user owner",
    tier: "free",
    style: "prefix",
    developerOnly: true,
  },
  async run({ message, args }) {
    const ch = message.channel;
    if (ch.isTextBased() && "sendTyping" in ch) {
      await ch.sendTyping().catch(() => {});
    }

    if (!(await isCommandOwnerBypass(message.author.id))) {
      await message.reply({
        embeds: [errorEmbed("Only **bot owners** can use **.handout**.")],
      });
      return;
    }

    if (!getBotInternalSecret()) {
      await message.reply({
        embeds: [
          errorEmbed(
            "**.handout** needs **BOT_INTERNAL_SECRET** and a reachable site URL (**SITE_API_BASE_URL** / **AUTH_URL**) so the bot can write to the shared database.",
          ),
        ],
      });
      return;
    }

    const found = findActionIndex(args);
    if (!found) {
      await message.reply({
        embeds: [
          errorEmbed(
            "Use **add** or **remove** once.\n\n" +
              "**Owners:** `.handout` `@user` **add** `premium` · **remove** `premium` (or **pro** / **site**).\n" +
              "**Developers** also: **add** / **remove** **owner** (or **bot**) for anyone.\n" +
              "Owners can’t change handouts for **other owners** (or yourself is OK) — ask a **Developer**.",
          ),
        ],
      });
      return;
    }

    const { idx: actionIdx, action } = found;
    const userArgs = args.slice(0, actionIdx);
    const roleToken = args[actionIdx + 1];
    const trailing = args.slice(actionIdx + 2);

    if (trailing.length > 0) {
      await message.reply({
        embeds: [
          errorEmbed(
            "Too many words after the role. Use: **.handout** `@user` **add** `owner` (nothing after the role).",
          ),
        ],
      });
      return;
    }

    const kind = normalizeKind(roleToken);
    if (!kind) {
      await message.reply({
        embeds: [
          errorEmbed(
            "Missing or invalid role after **add** / **remove**. Use **owner** (or **bot**) or **premium** (or **pro** / **site**).",
          ),
        ],
      });
      return;
    }

    const target = await resolveHandoutTarget(message, userArgs);
    if (!target) {
      await message.reply({
        embeds: [
          errorEmbed(
            "Couldn’t figure out **who** to change. Put `@user` or a user ID **before** **add** / **remove**, e.g. `.handout` `@user` **add** `owner`.",
          ),
        ],
      });
      return;
    }

    const actorId = message.author.id;
    const targetId = target.id;
    const actorIsDev = isDeveloperDiscordId(actorId);

    if (kind === "OWNER" && !actorIsDev) {
      await message.reply({
        embeds: [
          errorEmbed(
            "Only **Developers** can **add** or **remove** the **owner** role. You can still use **premium** / **pro** / **site** for non-owners (or yourself).",
          ),
        ],
      });
      return;
    }

    if (!actorIsDev && targetId !== actorId) {
      try {
        const ent = await fetchEntitlementFromSite(targetId, {
          bypassCache: true,
        });
        if (ent.owner) {
          await message.reply({
            embeds: [
              errorEmbed(
                "**Owners** cannot change handouts for **other owners**. Ask a **Developer**.",
              ),
            ],
          });
          return;
        }
      } catch {
        await message.reply({
          embeds: [
            errorEmbed(
              "Could not verify the target user against the site — try again in a moment.",
            ),
          ],
        });
        return;
      }
    }

    let result;
    try {
      result = await postHandoutToSite({
        actorDiscordId: actorId,
        targetDiscordId: targetId,
        kind,
        action,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await message.reply({ embeds: [errorEmbed(msg)] });
      return;
    }

    invalidateEntitlementCache(actorId);
    invalidateEntitlementCache(targetId);

    const label =
      kind === "OWNER" ? "bot owner" : "complimentary Arivix Pro";
    const who =
      target.id === actorId ? "You" : `**${target.username}** (${targetId})`;

    const syncNote = roleSyncFootnote(result.roleSync);

    if (action === "add") {
      await message.reply({
        embeds: [
          minimalEmbed({
            title: "Handout added",
            description:
              `${who} now has **${label}** in the database (plus any static lists in code). Refresh the dashboard if needed.${syncNote}`,
            footerText: handoutHubFooter(result.roleSync),
          }),
        ],
      });
      return;
    }

    const changed = result.removed === true;
    const dbRow = result.removedFromDatabase === true;
    const bootOff = result.revokedBootstrapOwner === true;
    let removeTitle: string;
    let removeBody: string;
    if (changed) {
      removeTitle = "Handout removed";
      const bits: string[] = [];
      if (dbRow) {
        bits.push(`removed **${label}** from the database`);
      }
      if (bootOff) {
        bits.push(
          "revoked **bootstrap owner** (their ID is still listed in `bot-owners` code, but the site and bot no longer treat them as owner)",
        );
      }
      removeBody =
        bits.length > 0
          ? `${who}: ${bits.join("; ")}.`
          : `${who}: updated.`;
      removeBody += syncNote;
    } else {
      removeTitle = "Nothing to remove";
      removeBody =
        kind === "OWNER"
          ? `${who}: no **${label}** row in the database, and they are not a bootstrap owner (or already revoked).${syncNote}`
          : `${who}: no **${label}** row in the database (they may only be on a static code list).${syncNote}`;
    }
    await message.reply({
      embeds: [
        minimalEmbed({
          title: removeTitle,
          description: removeBody,
          footerText: handoutHubFooter(result.roleSync),
        }),
      ],
    });
  },
};
