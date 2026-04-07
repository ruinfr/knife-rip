/**
 * Optional per-server economy: message/.lb/.vlb tracking + env-defined shop items.
 * Populated on bot `ready` via `loadEconomyGuildEnvConfig()`.
 */

export type EnvShopDisplayItem = {
  id: string;
  emoji: string;
  name: string;
  price: bigint;
  roleId: string;
  sortOrder: number;
};

let trackedGuildIds = new Set<string>();
const shopByGuild = new Map<string, EnvShopDisplayItem[]>();
let loaded = false;

function normalizeEnvKeys(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (v != null && v !== "") out[k.toLowerCase()] = v.trim();
  }
  return out;
}

function extractInviteCode(raw: string): string | null {
  const t = raw.trim();
  if (/^[a-zA-Z0-9-]{2,32}$/.test(t) && !/^\d{17,20}$/.test(t)) {
    return t;
  }
  const m = t.match(
    /(?:discord\.gg\/|discordapp\.com\/invite\/|discord\.com\/invite\/)([a-zA-Z0-9-]+)/i,
  );
  return m?.[1] ?? null;
}

async function resolveGuildId(raw: string): Promise<string | null> {
  const t = raw.trim();
  if (/^\d{17,20}$/.test(t)) return t;
  const code = extractInviteCode(t);
  if (!code) return null;
  try {
    const r = await fetch(
      `https://discord.com/api/v10/invites/${encodeURIComponent(code)}`,
    );
    if (!r.ok) return null;
    const j = (await r.json()) as { guild?: { id?: string } };
    const id = j.guild?.id;
    return id && /^\d{17,20}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

function serverSlotNumbers(env: Record<string, string>): number[] {
  const slots = new Set<number>();
  for (const key of Object.keys(env)) {
    const m = /^server(\d+)$/.exec(key);
    if (m) slots.add(Number(m[1]));
  }
  return [...slots].sort((a, b) => a - b);
}

function parseShopForSlot(
  env: Record<string, string>,
  slot: number,
  guildId: string,
): EnvShopDisplayItem[] {
  const items: EnvShopDisplayItem[] = [];
  const pre = `server${slot}`;
  for (let ix = 1; ix <= 25; ix++) {
    const roleId = env[`${pre}shoproleid${ix}`];
    const name = env[`${pre}shoprolename${ix}`];
    if (!roleId || !name) continue;
    if (!/^\d{17,20}$/.test(roleId)) continue;
    const priceRaw = env[`${pre}shopprice${ix}`] ?? "1000";
    const price = BigInt(priceRaw.replace(/[,_\s]/g, "") || "0");
    if (price <= 0n) continue;
    const emoji = env[`${pre}shopemoji${ix}`] ?? "🛒";
    items.push({
      id: `envshop:${guildId}:${slot}:${ix}`,
      emoji,
      name: name.slice(0, 100),
      price,
      roleId,
      sortOrder: ix,
    });
  }
  return items;
}

/**
 * Call once from `ClientReady`. Resolves invite URLs to guild IDs and builds shop map.
 */
export async function loadEconomyGuildEnvConfig(): Promise<void> {
  trackedGuildIds = new Set();
  shopByGuild.clear();
  const env = normalizeEnvKeys();

  const explicit = (process.env.ECONOMY_MESSAGE_TRACK_GUILDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^\d{17,20}$/.test(s));

  if (explicit.length > 0) {
    for (const id of explicit) trackedGuildIds.add(id);
  }

  const slots = serverSlotNumbers(env);
  for (const slot of slots) {
    const raw = env[`server${slot}`];
    if (!raw) continue;
    const guildId = await resolveGuildId(raw);
    if (!guildId) continue;
    if (explicit.length === 0) trackedGuildIds.add(guildId);
    const items = parseShopForSlot(env, slot, guildId);
    if (items.length > 0) shopByGuild.set(guildId, items);
  }

  loaded = true;
}

export function economyGuildConfigLoaded(): boolean {
  return loaded;
}

/** Economy milestones + .lb / .vlb only count in these guilds (empty = nowhere). */
export function isEconomyTrackedGuild(guildId: string): boolean {
  return trackedGuildIds.has(guildId);
}

export function getEnvShopItemsForGuild(
  guildId: string,
): EnvShopDisplayItem[] | undefined {
  const list = shopByGuild.get(guildId);
  return list && list.length > 0 ? list : undefined;
}

export function parseEnvShopItemId(
  id: string,
): { guildId: string; slot: number; index: number } | null {
  const m = /^envshop:(\d{17,20}):(\d+):(\d+)$/.exec(id);
  if (!m) return null;
  return {
    guildId: m[1]!,
    slot: Number(m[2]),
    index: Number(m[3]),
  };
}

export function findEnvShopItem(
  guildId: string,
  itemId: string,
): EnvShopDisplayItem | null {
  const items = shopByGuild.get(guildId);
  if (!items) return null;
  return items.find((i) => i.id === itemId) ?? null;
}
