/**
 * Arivix embed script — shared by the site builder and the bot.
 *
 * Format: optional message text, then `{embed}$v` then repeated `{key: value}` blocks.
 * In values, `$v` inserts a newline; `\` escapes the next character (e.g. `\}`).
 */

export const KNIFE_EMBED_MARKER = "{embed}$v";

export type KnifeEmbedPlaceholderContext = {
  message?: {
    id: string;
    content: string;
    createdTimestamp: number;
    url: string;
  };
  channel?: {
    id: string;
    name: string | null;
    topic: string | null;
    isThread: boolean;
    parentId: string | null;
    createdTimestamp: number;
  };
  guild?: {
    id: string;
    name: string;
    iconUrl: string | null;
    memberCount: number;
    ownerId: string;
    createdTimestamp: number;
    premiumTier: number;
    premiumSubscriptionCount: number | null;
  };
  user?: {
    id: string;
    username: string;
    globalName: string | null;
    tag: string;
    bot: boolean;
    createdTimestamp: number;
    avatarUrl: string;
    bannerUrl: string | null;
  };
  member?: {
    id: string;
    displayName: string;
    nickname: string | null;
    joinedTimestamp: number | null;
    roles: string;
    roleCount: number;
    avatarUrl: string;
  };
};

/** Discord API embed shape (discord.js `EmbedBuilder` accepts this). */
export type KnifeParsedEmbed = {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  timestamp?: string;
  thumbnail?: { url: string };
  image?: { url: string };
  author?: { name: string; url?: string; icon_url?: string };
  footer?: { text: string; icon_url?: string };
  fields?: { name: string; value: string; inline?: boolean }[];
};

function ageFrom(ms: number): string {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

/**
 * Replace `{user…}`, `{guild…}`, etc. using runtime context (best-effort).
 * Unknown placeholders are left unchanged.
 */
export function applyKnifeEmbedPlaceholders(
  raw: string,
  ctx: KnifeEmbedPlaceholderContext,
): string {
  const map = new Map<string, string>();
  const u = ctx.user;
  const m = ctx.member;
  const g = ctx.guild;
  const c = ctx.channel;
  const msg = ctx.message;

  if (u) {
    map.set("{user}", u.globalName ?? u.username);
    map.set("{user.id}", u.id);
    map.set("{user.name}", u.username);
    map.set("{user.mention}", `<@${u.id}>`);
    map.set("{user.avatar}", u.avatarUrl);
    map.set("{user.banner}", u.bannerUrl ?? "");
    map.set("{user.tag}", u.tag);
    map.set("{user.created_at}", ageFrom(u.createdTimestamp));
    map.set(
      "{user.created_at_timestamp}",
      String(Math.floor(u.createdTimestamp / 1000)),
    );
    map.set("{user.bot}", u.bot ? "Yes" : "No");
  }
  if (m) {
    map.set("{member}", m.displayName);
    map.set("{member.id}", m.id);
    map.set("{member.name}", m.displayName);
    map.set("{member.nick}", m.nickname ?? "");
    map.set("{member.mention}", `<@${m.id}>`);
    map.set("{member.avatar}", m.avatarUrl);
    map.set(
      "{member.joined_at}",
      m.joinedTimestamp != null ? ageFrom(m.joinedTimestamp) : "",
    );
    map.set(
      "{member.joined_at_timestamp}",
      m.joinedTimestamp != null
        ? String(Math.floor(m.joinedTimestamp / 1000))
        : "",
    );
    map.set("{member.roles}", m.roles);
    map.set("{member.role_count}", String(m.roleCount));
  }
  if (g) {
    map.set("{guild.name}", g.name);
    map.set("{guild.id}", g.id);
    map.set("{guild.icon}", g.iconUrl ?? "");
    map.set("{guild.count}", String(g.memberCount));
    map.set("{guild.member_count}", String(g.memberCount));
    map.set("{guild.owner}", `<@${g.ownerId}>`);
    map.set("{guild.owner_id}", g.ownerId);
    map.set("{guild.created_at}", ageFrom(g.createdTimestamp));
    map.set("{guild.boost_tier}", String(g.premiumTier));
    map.set(
      "{guild.boost_count}",
      String(g.premiumSubscriptionCount ?? 0),
    );
  }
  if (c) {
    map.set("{channel.name}", c.name ?? "channel");
    map.set("{channel.id}", c.id);
    map.set(
      "{channel.mention}",
      c.isThread ? `<#${c.id}>` : `<#${c.id}>`,
    );
    map.set("{channel.topic}", c.topic ?? "");
    map.set("{channel.created_at}", ageFrom(c.createdTimestamp));
    map.set("{channel.parent_id}", c.parentId ?? "");
    map.set("{channel.is_thread}", c.isThread ? "Yes" : "No");
  }
  if (msg) {
    map.set("{message.id}", msg.id);
    map.set("{message.url}", msg.url);
    map.set("{message.content}", msg.content);
    map.set("{message.created_at}", ageFrom(msg.createdTimestamp));
  }
  map.set("{timestamp}", new Date().toISOString());

  const keys = [...map.keys()].sort((a, b) => b.length - a.length);
  let out = raw;
  for (const k of keys) {
    const v = map.get(k);
    if (v === undefined) continue;
    out = out.split(k).join(v);
  }
  return out;
}

/** Sample context for the site embed builder (live preview placeholder expansion). */
export const KNIFE_EMBED_DEMO_CONTEXT: KnifeEmbedPlaceholderContext = {
  user: {
    id: "309630495930818560",
    username: "nightblade",
    globalName: "Alex",
    tag: "nightblade",
    bot: false,
    createdTimestamp: Date.now() - 86400 * 380 * 1000,
    avatarUrl: "https://cdn.discordapp.com/embed/avatars/1.png",
    bannerUrl: null,
  },
  member: {
    id: "309630495930818560",
    displayName: "Alex",
    nickname: "Alex • Mod",
    joinedTimestamp: Date.now() - 86400 * 120 * 1000,
    roles: "<@&111111111111111111> <@&222222222222222222>",
    roleCount: 7,
    avatarUrl: "https://cdn.discordapp.com/embed/avatars/1.png",
  },
  guild: {
    id: "1490477452726894693",
    name: "Arivix Lounge",
    iconUrl:
      "https://cdn.discordapp.com/embed/avatars/3.png",
    memberCount: 12847,
    ownerId: "999999999999999999",
    createdTimestamp: Date.now() - 86400 * 900 * 1000,
    premiumTier: 2,
    premiumSubscriptionCount: 14,
  },
  channel: {
    id: "1158878901234567890",
    name: "moderation-logs",
    topic: "Staff actions only",
    isThread: false,
    parentId: null,
    createdTimestamp: Date.now() - 86400 * 400 * 1000,
  },
  message: {
    id: "1234567890123456789",
    content: "Please review this case.",
    createdTimestamp: Date.now() - 3600_000,
    url: "https://discord.com/channels/1490477452726894693/1158878901234567890/1234567890123456789",
  },
};

export function applyPlaceholdersToParsedEmbed(
  embed: KnifeParsedEmbed,
  ctx: KnifeEmbedPlaceholderContext,
): KnifeParsedEmbed {
  const ap = (s?: string) =>
    s === undefined || s === "" ? s : applyKnifeEmbedPlaceholders(s, ctx);

  const out: KnifeParsedEmbed = {
    ...embed,
    title: ap(embed.title),
    description: ap(embed.description),
    url: ap(embed.url),
  };

  if (embed.author) {
    const name = ap(embed.author.name) ?? "";
    const icon_url = ap(embed.author.icon_url);
    const urlA = ap(embed.author.url);
    if (name.trim() || icon_url) {
      out.author = {
        name: name.trim() || (icon_url ? "·" : ""),
        url: urlA,
        icon_url,
      };
    } else {
      out.author = undefined;
    }
  }

  if (embed.footer) {
    const text = ap(embed.footer.text) ?? "";
    const icon_url = ap(embed.footer.icon_url);
    if (text.trim()) {
      out.footer = { text, icon_url };
    } else {
      out.footer = undefined;
    }
  }

  if (embed.fields?.length) {
    out.fields = embed.fields.map((f) => ({
      ...f,
      name: ap(f.name) ?? "",
      value: ap(f.value) ?? "",
    }));
  }

  if (embed.thumbnail?.url) {
    const u = ap(embed.thumbnail.url);
    out.thumbnail = u?.trim() ? { url: u } : undefined;
  }
  if (embed.image?.url) {
    const u = ap(embed.image.url);
    out.image = u?.trim() ? { url: u } : undefined;
  }

  return out;
}

export function splitKnifeEmbedScript(raw: string): {
  content: string;
  embedSegment: string | null;
} {
  const re = /\{embed\}\s*\$v/i;
  const m = re.exec(raw);
  if (!m || m.index == null) {
    return { content: raw.trim(), embedSegment: null };
  }
  const before = raw.slice(0, m.index).trimEnd();
  const embedSegment = raw.slice(m.index).trim();
  return { content: before, embedSegment };
}

function parseBracePairs(segment: string): { key: string; value: string }[] {
  const pairs: { key: string; value: string }[] = [];
  let i = 0;
  while (i < segment.length) {
    if (segment[i] !== "{") {
      i += 1;
      continue;
    }
    const rest = segment.slice(i);
    const km = /^\{\s*([a-zA-Z0-9_]+)\s*:\s*/.exec(rest);
    if (!km) {
      i += 1;
      continue;
    }
    const key = km[1]!;
    let pos = i + km[0].length;
    let value = "";
    for (; pos < segment.length; pos++) {
      const ch = segment[pos]!;
      if (ch === "\\" && pos + 1 < segment.length) {
        value += segment[pos + 1]!;
        pos += 1;
        continue;
      }
      if (ch === "}") break;
      value += ch;
    }
    if (pos >= segment.length || segment[pos] !== "}") break;
    const v = value.replace(/\$v/g, "\n").trim();
    pairs.push({ key, value: v });
    i = pos + 1;
  }
  return pairs;
}

function parseHexColor(raw: string): number | null {
  const t = raw.trim();
  const hex = t.startsWith("#") ? t.slice(1) : t;
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
  return Number.parseInt(hex, 16);
}

function truthy(raw: string): boolean {
  const t = raw.trim().toLowerCase();
  return t === "1" || t === "true" || t === "yes";
}

export function pairsToKnifeEmbed(
  pairList: { key: string; value: string }[],
): { embed: KnifeParsedEmbed; warnings: string[] } {
  const warnings: string[] = [];
  const embed: KnifeParsedEmbed = {};
  const scalar = new Map<string, string>();

  for (const { key, value } of pairList) {
    if (key === "field" || /^field_\d+$/.test(key)) continue;
    scalar.set(key, value);
  }

  if (scalar.has("title")) embed.title = scalar.get("title")!.slice(0, 256);
  if (scalar.has("description")) {
    embed.description = scalar.get("description")!.slice(0, 4096);
  }
  if (scalar.has("url")) embed.url = scalar.get("url")!.slice(0, 2000);
  if (scalar.has("color")) {
    const c = parseHexColor(scalar.get("color")!);
    if (c != null) embed.color = c;
    else warnings.push("Invalid color (use #RRGGBB).");
  }
  if (scalar.has("thumbnail")) {
    const url = scalar.get("thumbnail")!.trim();
    if (url) embed.thumbnail = { url: url.slice(0, 2000) };
  }
  if (scalar.has("image")) {
    const url = scalar.get("image")!.trim();
    if (url) embed.image = { url: url.slice(0, 2000) };
  }
  if (scalar.has("timestamp") && truthy(scalar.get("timestamp")!)) {
    embed.timestamp = new Date().toISOString();
  }

  if (scalar.has("author_name")) {
    embed.author = {
      name: scalar.get("author_name")!.slice(0, 256),
      url: scalar.get("author_url")?.slice(0, 2000),
      icon_url: scalar.get("author_icon_url")?.slice(0, 2000),
    };
  }

  if (scalar.has("footer_text")) {
    embed.footer = {
      text: scalar.get("footer_text")!.slice(0, 2048),
      icon_url: scalar.get("footer_icon_url")?.slice(0, 2000),
    };
  }

  const fields: { name: string; value: string; inline?: boolean }[] = [];
  for (const { key, value } of pairList) {
    if (key !== "field" && !/^field_\d+$/.test(key)) continue;
    const parts = value.split("||").map((s) => s.trim());
    if (parts.length < 2) continue;
    const inlineRaw = parts[2]?.toLowerCase();
    fields.push({
      name: parts[0]!.slice(0, 256),
      value: parts[1]!.slice(0, 1024),
      inline: inlineRaw === "true" || inlineRaw === "1",
    });
  }
  if (fields.length) embed.fields = fields;

  return { embed, warnings };
}

export function parseKnifeEmbedScript(embedSegment: string): {
  embed: KnifeParsedEmbed;
  warnings: string[];
  error?: string;
} {
  if (!/\{embed\}\s*\$v/i.test(embedSegment)) {
    return { embed: {}, warnings: [], error: "Missing {embed}$v header." };
  }
  const body = embedSegment.replace(/^\{embed\}\s*\$v/im, "").trim();
  const pairList = parseBracePairs(body);
  const { embed, warnings } = pairsToKnifeEmbed(pairList);
  const hasBody =
    Boolean(embed.title) ||
    Boolean(embed.description) ||
    Boolean(embed.image) ||
    Boolean(embed.thumbnail) ||
    Boolean(embed.author) ||
    Boolean(embed.footer) ||
    Boolean(embed.fields?.length) ||
    Boolean(embed.url);

  if (!hasBody && !embed.color && !embed.timestamp) {
    return {
      embed: {},
      warnings,
      error: "No embed properties were parsed (add {title: …}, {description: …}, etc.).",
    };
  }
  return { embed, warnings };
}

export type KnifeSerializeField = { name: string; value: string; inline?: boolean };

export function serializeKnifeEmbedScript(
  messageContent: string,
  data: {
    title?: string;
    description?: string;
    url?: string;
    color?: string;
    thumbnail?: string;
    image?: string;
    timestamp?: boolean;
    authorName?: string;
    authorUrl?: string;
    authorIconUrl?: string;
    footerText?: string;
    footerIconUrl?: string;
    fields?: KnifeSerializeField[];
  },
) {
  const segments: string[] = [];
  const mc = messageContent.trim();
  if (mc) segments.push(mc);
  segments.push("{embed}$v");

  const esc = (v: string) =>
    v
      .replace(/\\/g, "\\\\")
      .replace(/\}/g, "\\}")
      .replace(/\n/g, "$v");

  const add = (key: string, val: string | undefined) => {
    const t = val?.trim();
    if (!t) return;
    segments.push(`{${key}: ${esc(t)}}`);
  };

  add("title", data.title);
  add("description", data.description);
  add("url", data.url);
  add("color", data.color);
  add("thumbnail", data.thumbnail);
  add("image", data.image);
  if (data.timestamp) segments.push("{timestamp: true}");
  add("author_name", data.authorName);
  add("author_url", data.authorUrl);
  add("author_icon_url", data.authorIconUrl);
  add("footer_text", data.footerText);
  add("footer_icon_url", data.footerIconUrl);

  for (const f of data.fields ?? []) {
    if (!f.name?.trim() && !f.value?.trim()) continue;
    const inline = f.inline ? "||true" : "";
    segments.push(
      `{field: ${esc(f.name.trim())}||${esc(f.value.trim())}${inline}}`,
    );
  }

  return segments.join("");
}
