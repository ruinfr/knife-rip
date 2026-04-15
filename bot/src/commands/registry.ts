import { COMMAND_CATALOG_VERSION } from "../config";
import { postCommandRegistry } from "../lib/site-client";
import { afkCommand } from "./general/afk";
import { avatarCommand } from "./general/avatar";
import { bannerCommand } from "./general/banner";
import { billingCommand } from "./general/billing";
import { birthdayCommand } from "./general/birthday";
import { boostersCommand } from "./general/boosters";
import { botsCommand } from "./general/bots-list";
import { botinfoCommand } from "./general/botinfo";
import { subscribeCommand } from "./general/btc-tx-subscribe";
import { channelinfoCommand } from "./general/channelinfo";
import { compressCommand } from "./general/compress";
import { baltopCommand } from "./economy/baltop";
import { bankCommand } from "./economy/bank";
import { begCommand } from "./economy/beg";
import { bountyCommand } from "./economy/bounty";
import { businessCommand } from "./economy/business";
import { cashCommand } from "./economy/cash";
import { crimeCommand } from "./economy/crime";
import { dailyCommand } from "./economy/daily";
import { depositCommand } from "./economy/deposit";
import { duelCommand } from "./economy/duel";
import { fishCommand } from "./economy/fish";
import { gambleCommand } from "./economy/gamble";
import { gcashCommand } from "./economy/gcash";
import { luckydropCommand } from "./economy/luckydrop";
import { messagedropCommand } from "./economy/messagedrop";
import { mineCommand } from "./economy/mine";
import { petCommand } from "./economy/pet";
import { petsCommand } from "./economy/pets";
import { rebirthCommand } from "./economy/rebirth";
import { robCommand } from "./economy/rob";
import { withdrawCommand } from "./economy/withdraw";
import { workCommand } from "./economy/work";
import { creditsCommand } from "./general/credits";
import { cryptoCommand } from "./general/crypto-price";
import { transactionCommand } from "./general/crypto-transaction";
import { dashboardCommand } from "./general/dashboard";
import { defineCommand } from "./general/define-cmd";
import { gasCommand } from "./general/gas";
import { donateCommand } from "./general/donate";
import { eightBallCommand } from "./general/eightball";
import { emojiCommand } from "./general/emoji";
import { emotesCommand } from "./general/emotes-list";
import { guildbannerCommand, guildiconCommand, splashCommand } from "./general/guild-assets";
import { helpCommand } from "./general/help";
import { hexCommand } from "./general/hex";
import { highlightCommand } from "./general/highlight";
import { inviteCommand } from "./general/invite";
import { inviteinfoCommand } from "./general/inviteinfo";
import { invertCommand } from "./general/invert";
import { arivixCommand } from "./general/arivix";
import { lbCommand, vlbCommand } from "./general/leaderboards";
import { membercountCommand } from "./general/membercount";
import { membersCommand } from "./general/members-in-role";
import { nicknameCommand } from "./general/nickname";
import { newsCommand } from "./general/news";
import { osuCommand } from "./general/osu";
import { pingCommand } from "./general/ping";
import { pollCommand } from "./general/poll";
import { premiumCommand } from "./general/premium";
import { prefixCommand } from "./general/prefix";
import { remindCommand, remindersCommand } from "./general/remind";
import { robloxCommand } from "./general/roblox";
import { roleinfoCommand } from "./general/roleinfo";
import { rolesCommand } from "./general/roles-list";
import { rotateCommand } from "./general/rotate";
import { screenshotCommand } from "./general/screenshot";
import { seenCommand } from "./general/seen";
import { serveravatarCommand } from "./general/serveravatar";
import { serverbannerCommand } from "./general/serverbanner";
import { serverinfoCommand } from "./general/serverinfo";
import { statusCommand } from "./general/status";
import { stickerCommand } from "./general/sticker-manage";
import {
  clearsnipeCommand,
  esnipeCommand,
  reactionhistoryCommand,
  rsnipeCommand,
  snipeCommand,
} from "./general/snipe";
import { telegramCommand } from "./general/telegram";
import { tiktokCommand } from "./general/tiktok";
import { timezoneCommand } from "./general/timezone-cmd";
import { ttsCommand } from "./general/tts";
import { urbandictionaryCommand } from "./general/urbandictionary";
import { uptimeCommand } from "./general/uptime";
import { userinfoCommand } from "./general/userinfo";
import { vanityCommand } from "./general/vanity";
import { voicemasterCommand } from "./general/voicemaster";
import { weatherCommand } from "./general/weather";
import { webhookCommand } from "./utility/webhook";
import { accessCommand } from "./moderation/access";
import { auditCommand } from "./moderation/audit";
import { banCommand } from "./moderation/ban";
import {
  banpurgeCommand,
  banrecentCommand,
  hardbanCommand,
  hardbanlistCommand,
  softbanCommand,
  tempbanCommand,
  unbanCommand,
  unbanallcancelCommand,
  unbanallCommand,
} from "./moderation/ban-extras";
import { commandConfigCommand } from "./moderation/command-config";
import { createembedCommand } from "./moderation/createembed";
import { handoutCommand } from "./moderation/handout";
import {
  caselogCommand,
  historyCommand,
  historyViewCommand,
} from "./moderation/history";
import { jailCommand, jaillistCommand, unjailCommand } from "./moderation/jail";
import { jailsetupCommand } from "./moderation/jailsetup";
import { kickCommand } from "./moderation/kick";
import { lockdownCommand, unlockallCommand } from "./moderation/lockdown";
import { lockCommand, unlockCommand } from "./moderation/lock";
import {
  moderationhistoryCommand,
  modstatsCommand,
  punishmenthistoryCommand,
} from "./moderation/mod-activity";
import {
  clearinvitesCommand,
  dragCommand,
  forcenicknameCommand,
  hideCommand,
  moveallCommand,
  newmembersCommand,
  permissionsCommand,
  recentbanCommand,
  setupCommand,
  stripstaffCommand,
  stickyroleCommand,
  topicCommand,
  unhideCommand,
} from "./moderation/mod-extras";
import { setupmuteCommand, rmuteCommand, runmuteCommand } from "./moderation/mute-role";
import { notesCommand } from "./moderation/notes";
import { proofCommand } from "./moderation/proof";
import { reasonCommand } from "./moderation/reason-cmd";
import { restrictcommandCommand } from "./moderation/restrict-command";
import { roleCommand, temproleCommand, temprolelistCommand } from "./moderation/role-tools";
import { threadCommand } from "./moderation/thread-cmd";
import { purgeCommand } from "./moderation/purge";
import { slowmodeCommand } from "./moderation/slowmode";
import { sayCommand } from "./moderation/say";
import {
  timeoutCommand,
  timeoutlistCommand,
  untimeoutCommand,
} from "./moderation/timeout";
import { warnCommand, warningsCommand } from "./moderation/warn";
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
  banpurgeCommand,
  banrecentCommand,
  baltopCommand,
  birthdayCommand,
  boostersCommand,
  botsCommand,
  cashCommand,
  caselogCommand,
  channelinfoCommand,
  clearinvitesCommand,
  clearsnipeCommand,
  compressCommand,
  commandConfigCommand,
  createembedCommand,
  creditsCommand,
  cryptoCommand,
  dailyCommand,
  dashboardCommand,
  defineCommand,
  donateCommand,
  dragCommand,
  emojiCommand,
  emotesCommand,
  gambleCommand,
  gasCommand,
  gcashCommand,
  guildbannerCommand,
  guildiconCommand,
  handoutCommand,
  hardbanCommand,
  hardbanlistCommand,
  hexCommand,
  hideCommand,
  highlightCommand,
  helpCommand,
  historyCommand,
  historyViewCommand,
  inviteCommand,
  inviteinfoCommand,
  invertCommand,
  jailCommand,
  jaillistCommand,
  jailsetupCommand,
  kickCommand,
  lockdownCommand,
  arivixCommand,
  lbCommand,
  lockCommand,
  luckydropCommand,
  messagedropCommand,
  moderationhistoryCommand,
  modstatsCommand,
  moveallCommand,
  newmembersCommand,
  nicknameCommand,
  notesCommand,
  newsCommand,
  osuCommand,
  pingCommand,
  permissionsCommand,
  pollCommand,
  proofCommand,
  punishmenthistoryCommand,
  premiumCommand,
  prefixCommand,
  reasonCommand,
  reactionhistoryCommand,
  recentbanCommand,
  rebirthCommand,
  remindCommand,
  remindersCommand,
  restrictcommandCommand,
  purgeCommand,
  rmuteCommand,
  roleCommand,
  runmuteCommand,
  robloxCommand,
  roleinfoCommand,
  rolesCommand,
  rotateCommand,
  rsnipeCommand,
  sayCommand,
  screenshotCommand,
  seenCommand,
  serveravatarCommand,
  serverbannerCommand,
  serverinfoCommand,
  setupCommand,
  setupmuteCommand,
  snipeCommand,
  softbanCommand,
  stickyroleCommand,
  stripstaffCommand,
  splashCommand,
  esnipeCommand,
  stickerCommand,
  slowmodeCommand,
  statusCommand,
  subscribeCommand,
  tempbanCommand,
  temproleCommand,
  temprolelistCommand,
  threadCommand,
  timeoutCommand,
  timeoutlistCommand,
  tiktokCommand,
  topicCommand,
  transactionCommand,
  unbanCommand,
  unbanallCommand,
  unbanallcancelCommand,
  unhideCommand,
  unjailCommand,
  unlockallCommand,
  ttsCommand,
  untimeoutCommand,
  urbandictionaryCommand,
  unlockCommand,
  uptimeCommand,
  userinfoCommand,
  vanityCommand,
  weatherCommand,
  vlbCommand,
  warnCommand,
  warningsCommand,
  forcenicknameCommand,
  voicemasterCommand,
  webhookCommand,
  bankCommand,
  begCommand,
  bountyCommand,
  businessCommand,
  crimeCommand,
  depositCommand,
  duelCommand,
  fishCommand,
  mineCommand,
  petCommand,
  petsCommand,
  robCommand,
  withdrawCommand,
  workCommand,
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
