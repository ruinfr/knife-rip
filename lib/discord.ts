const DISCORD_API = "https://discord.com/api/v10";

/** Bit 3 — Administrator (implicit full access) */
const ADMINISTRATOR = BigInt(1) << BigInt(3);
/** Bit 5 — Manage Server */
const MANAGE_GUILD = BigInt(1) << BigInt(5);

export type DiscordGuild = {
  id: string;
  name: string;
  icon: string | null;
  permissions: string;
  owner?: boolean;
};

function canManageGuild(g: DiscordGuild): boolean {
  if (g.owner === true) return true;
  const p = BigInt(g.permissions);
  return (
    (p & ADMINISTRATOR) === ADMINISTRATOR ||
    (p & MANAGE_GUILD) === MANAGE_GUILD
  );
}

export async function fetchGuildsWithManage(
  accessToken: string,
): Promise<DiscordGuild[]> {
  const res = await fetch(`${DISCORD_API}/users/@me/guilds`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`Discord guilds failed: ${res.status}`);
  }

  const guilds = (await res.json()) as DiscordGuild[];
  return guilds.filter(canManageGuild);
}

export type BotGuildPartial = {
  id: string;
  name: string;
  icon: string | null;
};

async function fetchAllBotGuildPartials(
  botToken: string,
  init?: RequestInit,
): Promise<BotGuildPartial[]> {
  const all: BotGuildPartial[] = [];
  let after: string | undefined;
  const token = botToken.trim();

  for (;;) {
    const url = new URL(`${DISCORD_API}/users/@me/guilds`);
    url.searchParams.set("limit", "200");
    if (after) url.searchParams.set("after", after);

    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bot ${token}`);

    const res = await fetch(url, { ...init, headers });

    if (!res.ok) {
      throw new Error(`Discord bot guilds failed: ${res.status}`);
    }

    const batch = (await res.json()) as BotGuildPartial[];
    if (batch.length === 0) break;
    all.push(...batch);
    if (batch.length < 200) break;
    after = batch[batch.length - 1]!.id;
  }

  return all;
}

/**
 * Guild IDs the bot user is a member of (paginated).
 */
export async function fetchBotGuildIds(botToken: string): Promise<Set<string>> {
  const partials = await fetchAllBotGuildPartials(botToken, {
    cache: "no-store",
  });
  return new Set(partials.map((p) => p.id));
}

type GuildApiWithCounts = {
  id: string;
  name: string;
  icon: string | null;
  approximate_member_count?: number;
  vanity_url_code?: string | null;
  system_channel_id?: string | null;
};

async function fetchGuildWithCountsApi(
  botToken: string,
  guildId: string,
  init?: RequestInit,
): Promise<GuildApiWithCounts | null> {
  const url = `${DISCORD_API}/guilds/${guildId}?with_counts=true`;
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bot ${botToken.trim()}`);
  const res = await fetch(url, { ...init, headers });
  if (!res.ok) return null;
  return (await res.json()) as GuildApiWithCounts;
}

async function resolveGuildJoinHref(
  botToken: string,
  g: GuildApiWithCounts,
  init?: RequestInit,
): Promise<string | null> {
  if (g.vanity_url_code) {
    return `https://discord.gg/${g.vanity_url_code}`;
  }
  if (g.system_channel_id) {
    return `https://discord.com/channels/${g.id}/${g.system_channel_id}`;
  }

  const widgetRes = await fetch(`${DISCORD_API}/guilds/${g.id}/widget.json`, {
    ...init,
  });
  if (widgetRes.ok) {
    const w = (await widgetRes.json()) as { instant_invite?: string | null };
    if (w.instant_invite) {
      if (w.instant_invite.startsWith("http")) return w.instant_invite;
      return `https://discord.com/invite/${w.instant_invite}`;
    }
  }

  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bot ${botToken.trim()}`);
  const chRes = await fetch(`${DISCORD_API}/guilds/${g.id}/channels`, {
    ...init,
    headers,
  });
  if (chRes.ok) {
    const channels = (await chRes.json()) as { id: string; type: number }[];
    const text = channels.find((c) => c.type === 0);
    if (text) return `https://discord.com/channels/${g.id}/${text.id}`;
  }

  return null;
}

export type ShowcaseCommunity = {
  id: string;
  name: string;
  icon: string | null;
  approximateMemberCount: number;
  href: string;
};

export function formatApproxMemberLabel(n: number): string {
  const c = Math.max(0, Math.floor(n));
  if (c >= 1_000_000) return `${(c / 1_000_000).toFixed(1)}M members`;
  if (c >= 100_000) return `${Math.round(c / 1000)}k members`;
  if (c >= 10_000) return `${Math.round(c / 1000)}k members`;
  if (c >= 1_000) return `${(c / 1000).toFixed(1)}k members`;
  if (c < 1) return "Growing community";
  return `${c.toLocaleString()} members`;
}

const SHOWCASE_FETCH_INIT: RequestInit & { next: { revalidate: number } } = {
  next: { revalidate: 900 },
};

/**
 * Bot guilds with the highest approximate member counts, for the marketing showcase.
 * Join links use vanity URL, system channel, widget invite, or first text channel.
 */
export async function fetchTopShowcaseCommunities(
  botToken: string,
  maxSlots: number,
): Promise<ShowcaseCommunity[]> {
  const partials = await fetchAllBotGuildPartials(
    botToken,
    SHOWCASE_FETCH_INIT,
  );
  if (partials.length === 0 || maxSlots < 1) return [];

  const concurrency = 8;
  const withCounts: GuildApiWithCounts[] = [];

  for (let i = 0; i < partials.length; i += concurrency) {
    const slice = partials.slice(i, i + concurrency);
    const batch = await Promise.all(
      slice.map((p) =>
        fetchGuildWithCountsApi(botToken, p.id, SHOWCASE_FETCH_INIT),
      ),
    );
    for (const g of batch) {
      if (g) withCounts.push(g);
    }
  }

  withCounts.sort(
    (a, b) =>
      (b.approximate_member_count ?? 0) - (a.approximate_member_count ?? 0),
  );

  const out: ShowcaseCommunity[] = [];
  for (const g of withCounts) {
    if (out.length >= maxSlots) break;
    const href = await resolveGuildJoinHref(botToken, g, SHOWCASE_FETCH_INIT);
    if (!href) continue;
    out.push({
      id: g.id,
      name: g.name,
      icon: g.icon,
      approximateMemberCount: g.approximate_member_count ?? 0,
      href,
    });
  }

  return out;
}

export type DashboardGuildSummary = {
  /** Manage Server (or owner/admin) and Arivix is in the guild */
  arivixGuilds: DiscordGuild[];
  /** You can manage these, but the bot is not installed */
  inviteCandidates: DiscordGuild[];
  botConfigured: boolean;
};

export async function getDashboardGuildSummary(
  userAccessToken: string,
  botToken: string | undefined,
): Promise<DashboardGuildSummary> {
  const manageable = await fetchGuildsWithManage(userAccessToken);
  const trimmed = botToken?.trim();

  if (!trimmed) {
    return {
      arivixGuilds: [],
      inviteCandidates: manageable,
      botConfigured: false,
    };
  }

  const botIds = await fetchBotGuildIds(trimmed);
  const arivixGuilds = manageable.filter((g) => botIds.has(g.id));
  const inviteCandidates = manageable.filter((g) => !botIds.has(g.id));

  return { arivixGuilds, inviteCandidates, botConfigured: true };
}

/**
 * Resolve a guild the user may open in the dashboard: must manage (or own) and bot must be present.
 */
export async function getArivixGuildForUser(
  userAccessToken: string,
  botToken: string,
  guildId: string,
): Promise<DiscordGuild | null> {
  if (!/^\d{17,20}$/.test(guildId)) return null;

  const manageable = await fetchGuildsWithManage(userAccessToken);
  const guild = manageable.find((g) => g.id === guildId);
  if (!guild) return null;

  const botIds = await fetchBotGuildIds(botToken);
  if (!botIds.has(guildId)) return null;

  return guild;
}

export function guildIconUrl(id: string, icon: string | null, size = 64) {
  if (!icon) return null;
  return `https://cdn.discordapp.com/icons/${id}/${icon}.webp?size=${size}`;
}

export type DiscordApiUser = {
  id: string;
  username: string;
  global_name?: string | null;
  avatar: string | null;
};

/** Resolve a user by snowflake using the bot token (for leaderboards, etc.). */
export async function fetchDiscordUserAsBot(
  botToken: string,
  userId: string,
): Promise<DiscordApiUser | null> {
  if (!/^\d{17,20}$/.test(userId)) return null;
  const res = await fetch(`${DISCORD_API}/users/${userId}`, {
    headers: { Authorization: `Bot ${botToken.trim()}` },
    next: { revalidate: 60 },
  });
  if (res.status === 404) return null;
  if (!res.ok) return null;
  return (await res.json()) as DiscordApiUser;
}

export function discordUserAvatarUrl(
  userId: string,
  avatarHash: string | null,
  size = 64,
): string | null {
  if (!avatarHash) return null;
  const ext = avatarHash.startsWith("a_") ? "gif" : "webp";
  return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${ext}?size=${size}`;
}
