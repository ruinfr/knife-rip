/**
 * Command list types and DB-backed catalog.
 *
 * The Discord bot POSTs metadata to /api/internal/commands on startup; this
 * module reads the latest snapshot for the Commands page (server-rendered only).
 */

import { db } from "@/lib/db";

export const COMMAND_CATALOG_VERSION = 1 as const;
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
  if (!raw || typeof raw !== "object") return [];
  const categories = (raw as { categories?: unknown }).categories;
  if (!Array.isArray(categories)) return [];
  return normalizeCatalog(categories as CommandCategory[]);
}

/**
 * Patch commands when the DB snapshot predates bot metadata changes (until the
 * next successful catalog sync).
 */
function normalizeCatalog(categories: CommandCategory[]): CommandCategory[] {
  return categories.map((cat) => ({
    ...cat,
    commands: cat.commands.map((cmd) => {
      if (cmd.name !== "say") return cmd;
      return {
        ...cmd,
        tier: "pro",
        description:
          "Post as the bot in a channel (Knife Pro + Administrator)",
      };
    }),
  }));
}

/** Server-only: latest categories from the bot sync (empty if never synced). */
export async function getCommandCategories(): Promise<CommandCategory[]> {
  try {
    const row = await db.botCommandSnapshot.findUnique({
      where: { id: COMMAND_SNAPSHOT_ID },
    });
    if (!row) return [];
    return parsePayload(row.payload);
  } catch {
    return [];
  }
}

export async function getCommandCatalogMeta(): Promise<{
  categories: CommandCategory[];
  updatedAt: Date | null;
}> {
  try {
    const row = await db.botCommandSnapshot.findUnique({
      where: { id: COMMAND_SNAPSHOT_ID },
    });
    if (!row) return { categories: [], updatedAt: null };
    return {
      categories: parsePayload(row.payload),
      updatedAt: row.updatedAt,
    };
  } catch {
    return { categories: [], updatedAt: null };
  }
}
