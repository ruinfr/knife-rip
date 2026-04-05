import { COMMAND_CATALOG_VERSION } from "../config";
import { postCommandRegistry } from "../lib/site-client";
import { afkCommand } from "./general/afk";
import { avatarCommand } from "./general/avatar";
import { bannerCommand } from "./general/banner";
import { coinflipCommand } from "./general/coinflip";
import { emojiCommand } from "./general/emoji";
import { helpCommand } from "./general/help";
import { knifeCommand } from "./general/knife";
import { pingCommand } from "./general/ping";
import { premiumCommand } from "./general/premium";
import { roleinfoCommand } from "./general/roleinfo";
import { serverinfoCommand } from "./general/serverinfo";
import { uptimeCommand } from "./general/uptime";
import { userinfoCommand } from "./general/userinfo";
import { sayCommand } from "./moderation/say";
import type { CommandCategoryShape } from "./site-payload";
import type { KnifeCommand } from "./types";

/**
 * All commands — keep this list alphabetical by `name` for quick scanning.
 * Add new modules under ./general, ./moderation, etc., then import here.
 */
export const commandDefinitions: KnifeCommand[] = [
  afkCommand,
  avatarCommand,
  bannerCommand,
  coinflipCommand,
  emojiCommand,
  helpCommand,
  knifeCommand,
  pingCommand,
  premiumCommand,
  roleinfoCommand,
  sayCommand,
  serverinfoCommand,
  uptimeCommand,
  userinfoCommand,
].sort((a, b) => a.name.localeCompare(b.name));

export function buildCommandMap(
  list: KnifeCommand[] = commandDefinitions,
): Map<string, KnifeCommand> {
  const map = new Map<string, KnifeCommand>();
  for (const cmd of list) {
    const keys = [
      cmd.name.toLowerCase(),
      ...(cmd.aliases?.map((a) => a.toLowerCase()) ?? []),
    ];
    for (const key of keys) {
      map.set(key, cmd);
    }
  }
  return map;
}

function buildSiteCategories(
  list: KnifeCommand[],
): CommandCategoryShape[] {
  const byCat = new Map<string, CommandCategoryShape>();

  for (const cmd of list) {
    if (!cmd.site) continue;
    const s = cmd.site;
    let cat = byCat.get(s.categoryId);
    if (!cat) {
      cat = {
        id: s.categoryId,
        title: s.categoryTitle,
        description: s.categoryDescription,
        commands: [],
      };
      byCat.set(s.categoryId, cat);
    }
    cat.commands.push({
      name: cmd.name,
      description: cmd.description,
      usage: s.usage ?? `.${cmd.name}`,
      tier: s.tier ?? "free",
      style: s.style ?? "prefix",
      aliases:
        cmd.aliases && cmd.aliases.length > 0
          ? cmd.aliases.map((a) => a.toLowerCase())
          : undefined,
    });
  }

  const categories = [...byCat.values()].sort((a, b) =>
    a.id.localeCompare(b.id),
  );
  for (const c of categories) {
    c.commands.sort((a, b) => a.name.localeCompare(b.name));
  }
  return categories;
}

export function buildCommandCatalogPayload(list: KnifeCommand[]) {
  return {
    version: COMMAND_CATALOG_VERSION,
    categories: buildSiteCategories(list),
  };
}

export async function syncRegistryToSite(
  list: KnifeCommand[] = commandDefinitions,
): Promise<void> {
  const payload = buildCommandCatalogPayload(list);
  await postCommandRegistry(payload);
}
