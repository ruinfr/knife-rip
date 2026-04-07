import { COMMAND_CATALOG_VERSION } from "../config";
import { postCommandRegistry } from "../lib/site-client";
import { afkCommand } from "./general/afk";
import { avatarCommand } from "./general/avatar";
import { bannerCommand } from "./general/banner";
import { billingCommand } from "./general/billing";
import { botinfoCommand } from "./general/botinfo";
import { cashCommand } from "./economy/cash";
import { gambleCommand } from "./economy/gamble";
import { gcashCommand } from "./economy/gcash";
import { luckydropCommand } from "./economy/luckydrop";
import { creditsCommand } from "./general/credits";
import { dashboardCommand } from "./general/dashboard";
import { eightBallCommand } from "./general/eightball";
import { emojiCommand } from "./general/emoji";
import { helpCommand } from "./general/help";
import { inviteCommand } from "./general/invite";
import { knifeCommand } from "./general/knife";
import { lbCommand, vlbCommand } from "./general/leaderboards";
import { nicknameCommand } from "./general/nickname";
import { newsCommand } from "./general/news";
import { pingCommand } from "./general/ping";
import { pollCommand } from "./general/poll";
import { premiumCommand } from "./general/premium";
import { prefixCommand } from "./general/prefix";
import { remindCommand } from "./general/remind";
import { robloxCommand } from "./general/roblox";
import { roleinfoCommand } from "./general/roleinfo";
import { serverinfoCommand } from "./general/serverinfo";
import { statusCommand } from "./general/status";
import { esnipeCommand, rsnipeCommand, snipeCommand } from "./general/snipe";
import { tiktokCommand } from "./general/tiktok";
import { ttsCommand } from "./general/tts";
import { uptimeCommand } from "./general/uptime";
import { userinfoCommand } from "./general/userinfo";
import { voicemasterCommand } from "./general/voicemaster";
import { accessCommand } from "./moderation/access";
import { auditCommand } from "./moderation/audit";
import { banCommand } from "./moderation/ban";
import { commandConfigCommand } from "./moderation/command-config";
import { handoutCommand } from "./moderation/handout";
import { kickCommand } from "./moderation/kick";
import { lockCommand, unlockCommand } from "./moderation/lock";
import { purgeCommand } from "./moderation/purge";
import { slowmodeCommand } from "./moderation/slowmode";
import { sayCommand } from "./moderation/say";
import { timeoutCommand, untimeoutCommand } from "./moderation/timeout";
import type { CommandCategoryShape } from "./site-payload";
import type { KnifeCommand } from "./types";

/**
 * All commands — keep this list alphabetical by `name` for quick scanning.
 * Add new modules under ./general, ./moderation, etc., then import here.
 */
export const commandDefinitions: KnifeCommand[] = [
  accessCommand,
  auditCommand,
  afkCommand,
  avatarCommand,
  bannerCommand,
  billingCommand,
  botinfoCommand,
  eightBallCommand,
  banCommand,
  cashCommand,
  commandConfigCommand,
  creditsCommand,
  dashboardCommand,
  emojiCommand,
  gambleCommand,
  gcashCommand,
  handoutCommand,
  helpCommand,
  inviteCommand,
  kickCommand,
  knifeCommand,
  lbCommand,
  lockCommand,
  luckydropCommand,
  nicknameCommand,
  newsCommand,
  pingCommand,
  pollCommand,
  premiumCommand,
  prefixCommand,
  remindCommand,
  purgeCommand,
  robloxCommand,
  roleinfoCommand,
  rsnipeCommand,
  sayCommand,
  serverinfoCommand,
  snipeCommand,
  statusCommand,
  esnipeCommand,
  slowmodeCommand,
  timeoutCommand,
  tiktokCommand,
  ttsCommand,
  untimeoutCommand,
  unlockCommand,
  uptimeCommand,
  userinfoCommand,
  vlbCommand,
  voicemasterCommand,
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

/** Primary `KnifeCommand.name` for an invocation token (name or alias), lowercase. */
export function resolveCanonicalCommandName(
  invoked: string,
  map: Map<string, KnifeCommand>,
): string | null {
  const cmd = map.get(invoked.toLowerCase());
  return cmd ? cmd.name.toLowerCase() : null;
}

/**
 * Warn if two commands share the same trigger (name or alias); later defs win in `buildCommandMap`.
 */
export function warnOnDuplicateCommandTriggers(
  list: KnifeCommand[] = commandDefinitions,
): void {
  const claimedBy = new Map<string, string>();
  const sorted = [...list].sort((a, b) => a.name.localeCompare(b.name));
  for (const cmd of sorted) {
    const keys = [
      cmd.name,
      ...(cmd.aliases?.map((a) => a.toLowerCase()) ?? []),
    ];
    for (const raw of keys) {
      const k = raw.toLowerCase();
      const prev = claimedBy.get(k);
      if (prev && prev !== cmd.name) {
        console.warn(
          `[commands] Duplicate trigger "${k}" — "${prev}" and "${cmd.name}" (map keeps "${cmd.name}"). Remove or rename an alias.`,
        );
      }
      claimedBy.set(k, cmd.name);
    }
  }
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
      ...(s.developerOnly ? { developerOnly: true } : {}),
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
