/**
 * Command list types and DB-backed catalog.
 *
 * The Discord bot POSTs metadata to /api/internal/commands on startup; this
 * module reads the latest snapshot for the Commands page (server-rendered only).
 */

import { CANONICAL_COMMAND_SITE_ROWS } from "@/lib/command-catalog-canonical";
import { db } from "@/lib/db";

export const COMMAND_CATALOG_VERSION = 29 as const;
export const COMMAND_SNAPSHOT_ID = "default" as const;

export type CommandInvokeStyle = "prefix" | "slash";

export type CommandTier = "free" | "pro";

export type BotCommand = {
  /** Trigger name without prefix/slash */
  name: string;
  description: string;
  usage?: string;
  tier?: CommandTier;
  /** How the command is invoked (site displays `.name` or `/name`). */
  style?: CommandInvokeStyle;
  /** Shorter names that call the same command (shown in a disclosure on the site). */
  aliases?: string[];
  /** Bot owner / operator only — shown as Developer on /commands. */
  developerOnly?: boolean;
};

export type CommandCategory = {
  id: string;
  title: string;
  description: string;
  commands: BotCommand[];
};

export type CommandCatalogPayload = {
  version: number;
  categories: CommandCategory[];
};

function parsePayload(raw: unknown): CommandCategory[] {
  if (!raw || typeof raw !== "object") return mergeCanonicalCatalog([]);
  const categories = (raw as { categories?: unknown }).categories;
  if (!Array.isArray(categories)) return mergeCanonicalCatalog([]);
  return mergeCanonicalCatalog(categories as CommandCategory[]);
}

/**
 * Applies `CANONICAL_COMMAND_SITE_ROWS` on top of the bot snapshot: correct
 * descriptions, tiers, aliases, and commands missing from DB (e.g. before sync).
 * Unknown commands from the DB are kept in their categories.
 */
function mergeCanonicalCatalog(db: CommandCategory[]): CommandCategory[] {
  const canonicalNames = new Set(
    CANONICAL_COMMAND_SITE_ROWS.map((r) => r.name),
  );
  const result = new Map<string, CommandCategory>();

  for (const row of CANONICAL_COMMAND_SITE_ROWS) {
    if (!result.has(row.categoryId)) {
      result.set(row.categoryId, {
        id: row.categoryId,
        title: row.categoryTitle,
        description: row.categoryDescription,
        commands: [],
      });
    }
    const cat = result.get(row.categoryId)!;
    cat.commands.push({
      name: row.name,
      description: row.description,
      usage: row.usage,
      tier: row.tier,
      style: row.style,
      aliases: row.aliases,
      ...(row.developerOnly ? { developerOnly: true } : {}),
    });
  }

  for (const cat of db) {
    let target = result.get(cat.id);
    if (!target) {
      target = {
        id: cat.id,
        title: cat.title,
        description: cat.description,
        commands: [],
      };
      result.set(cat.id, target);
    }
    for (const cmd of cat.commands) {
      if (canonicalNames.has(cmd.name)) continue;
      if (!target.commands.some((c) => c.name === cmd.name)) {
        target.commands.push({
          ...cmd,
          developerOnly: cmd.developerOnly === true ? true : undefined,
        });
      }
    }
  }

  const sorted = [...result.values()].sort((a, b) =>
    a.id.localeCompare(b.id),
  );
  for (const c of sorted) {
    c.commands.sort((a, b) => a.name.localeCompare(b.name));
  }
  return sorted;
}

/** Full list from built-in catalog when the bot has not POSTed a snapshot yet (or DB unreachable). */
function fallbackCategories(): CommandCategory[] {
  return mergeCanonicalCatalog([]);
}

/** Server-only: latest categories from the bot sync, merged with canonical rows. */
export async function getCommandCategories(): Promise<CommandCategory[]> {
  try {
    const row = await db.botCommandSnapshot.findUnique({
      where: { id: COMMAND_SNAPSHOT_ID },
    });
    if (!row) return fallbackCategories();
    return parsePayload(row.payload);
  } catch {
    return fallbackCategories();
  }
}

export async function getCommandCatalogMeta(): Promise<{
  categories: CommandCategory[];
  updatedAt: Date | null;
  /** True when no snapshot row exists yet — list still shows merged canonical catalog. */
  catalogSyncPending: boolean;
}> {
  try {
    const row = await db.botCommandSnapshot.findUnique({
      where: { id: COMMAND_SNAPSHOT_ID },
    });
    if (!row) {
      return {
        categories: fallbackCategories(),
        updatedAt: null,
        catalogSyncPending: true,
      };
    }
    return {
      categories: parsePayload(row.payload),
      updatedAt: row.updatedAt,
      catalogSyncPending: false,
    };
  } catch {
    return {
      categories: fallbackCategories(),
      updatedAt: null,
      catalogSyncPending: true,
    };
  }
}
