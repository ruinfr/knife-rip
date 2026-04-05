import { getBotInternalSecret } from "../../config";
import { errorEmbed, minimalEmbed } from "../../lib/embeds";
import { isCommandOwnerBypass } from "../../lib/owner-bypass";
import { resolveTargetUser } from "../../lib/resolve-target-user";
import {
  invalidateEntitlementCache,
  postHandoutToSite,
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

/**
 * Not listed on the public /commands page (`site` omitted) — owner-only tool.
 */
export const handoutCommand: KnifeCommand = {
  name: "handout",
  description:
    "Grant complimentary Pro or bot owner in the database (bot owners only)",
  async run({ message, args }) {
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

    const kind = normalizeKind(args[0]);
    if (!kind) {
      await message.reply({
        embeds: [
          errorEmbed(
            "Usage: **.handout** `premium` `@user` · **.handout** `owner` `@user`\n" +
              "Aliases: **site** / **pro** → complimentary Pro · **bot** → owner\n" +
              "Omit `@user` to hand out to yourself.",
          ),
        ],
      });
      return;
    }

    const userArgs = args.slice(1);
    const target = await resolveTargetUser(message, userArgs);
    const actorId = message.author.id;
    const targetId = target.id;

    try {
      await postHandoutToSite({
        actorDiscordId: actorId,
        targetDiscordId: targetId,
        kind,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await message.reply({ embeds: [errorEmbed(msg)] });
      return;
    }

    invalidateEntitlementCache(actorId);
    invalidateEntitlementCache(targetId);

    const label =
      kind === "OWNER" ? "Bot owner (full bypass)" : "Complimentary Knife Pro";
    const who = target.id === actorId ? "You" : `**${target.username}**`;
    await message.reply({
      embeds: [
        minimalEmbed({
          title: "Handout saved",
          description:
            `${who} (${targetId}) now has **${label}** in the database. ` +
            "Dashboard and bot entitlement update without restarting — refresh the site if needed.",
        }),
      ],
    });
  },
};
