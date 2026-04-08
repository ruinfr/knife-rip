import type { Guild } from "discord.js";

const MENTION_RE = /^<@!?(\d{17,20})>$/;

export type ResolvePayRecipientResult =
  | { ok: true; userId: string }
  | { ok: false; error: string };

/**
 * Resolve pay recipient: snowflake, <@mention>, or this-server username / nickname / global name search.
 */
export async function resolveEconomyPayRecipientId(
  guild: Guild | null,
  raw: string,
): Promise<ResolvePayRecipientResult> {
  const t = raw.trim();
  if (!t) {
    return { ok: false, error: "Enter a **username**, **@mention**, or **user ID**." };
  }

  if (/^\d{17,20}$/.test(t)) {
    return { ok: true, userId: t };
  }

  const mention = MENTION_RE.exec(t);
  if (mention) {
    return { ok: true, userId: mention[1]! };
  }

  if (!guild) {
    return {
      ok: false,
      error:
        "In DMs, use a **numeric user ID** or paste an **@mention**. User search needs a **server** channel.",
    };
  }

  const q = t.replace(/^@+/, "").trim();
  if (q.length < 2) {
    return { ok: false, error: "Type at least **2 characters** for a name search." };
  }

  try {
    const results = await guild.members.search({ query: q, limit: 20 });
    if (results.size === 0) {
      return {
        ok: false,
        error: `Nobody in **${guild.name}** matched **${q}**. Try @mention or user ID.`,
      };
    }

    const qLower = q.toLowerCase();
    const exact = results.filter((m) => {
      const u = m.user;
      return (
        u.username.toLowerCase() === qLower ||
        u.globalName?.toLowerCase() === qLower ||
        m.displayName.toLowerCase() === qLower ||
        u.tag.toLowerCase() === qLower
      );
    });

    if (exact.size === 1) {
      return { ok: true, userId: exact.first()!.user.id };
    }
    if (exact.size > 1) {
      const listed = [...exact.values()]
        .slice(0, 6)
        .map((m) => `**${m.user.username}**`)
        .join(", ");
      return {
        ok: false,
        error: `Several people match — add a discriminator or use ID: ${listed}${exact.size > 6 ? ", …" : ""}.`,
      };
    }

    if (results.size === 1) {
      return { ok: true, userId: results.first()!.user.id };
    }

    const listed = [...results.values()]
      .slice(0, 6)
      .map((m) => `${m.user.username} (${m.id})`)
      .join("\n• ");
    return {
      ok: false,
      error:
        `Multiple matches for **${q}** — be more specific or use ID:\n• ${listed}`,
    };
  } catch {
    return {
      ok: false,
      error: "Could not search this server — try **@mention** or **user ID**.",
    };
  }
}
