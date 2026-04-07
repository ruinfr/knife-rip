/**
 * Compares bot command `name` values (registry array) to canonical catalog names.
 * Run: node scripts/check-catalog-coverage.mjs
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const regPath = resolve(root, "bot/src/commands/registry.ts");
const canonPath = resolve(root, "lib/command-catalog-canonical.ts");

const reg = readFileSync(regPath, "utf8");
const canon = readFileSync(canonPath, "utf8");

const registryNames = [...reg.matchAll(/^\s{2}([a-zA-Z][a-zA-Z0-9]*Command),$/gm)].map(
  (m) => m[1],
);

const handoutNoSite = !readFileSync(
  resolve(root, "bot/src/commands/moderation/handout.ts"),
  "utf8",
).includes("site: {");

const canonNames = [
  ...canon.matchAll(/^\s+name:\s*"([^"]+)"/gm),
].map((m) => m[1]);

const canonSet = new Set(canonNames);

// Known commands without public site metadata (intentionally omitted from /commands)
const noSiteCommands = new Set(handoutNoSite ? ["handout"] : []);

const nameByExport = {
  accessCommand: "access",
  auditCommand: "audit",
  afkCommand: "afk",
  avatarCommand: "avatar",
  bannerCommand: "banner",
  billingCommand: "billing",
  botinfoCommand: "botinfo",
  eightBallCommand: "8ball",
  banCommand: "ban",
  cashCommand: "cash",
  commandConfigCommand: "command",
  creditsCommand: "credits",
  dashboardCommand: "dashboard",
  emojiCommand: "emoji",
  gambleCommand: "gamble",
  gcashCommand: "gcash",
  helpCommand: "help",
  inviteCommand: "invite",
  kickCommand: "kick",
  knifeCommand: "knife",
  lbCommand: "lb",
  lockCommand: "lock",
  luckydropCommand: "luckydrop",
  nicknameCommand: "nickname",
  newsCommand: "news",
  pingCommand: "ping",
  pollCommand: "poll",
  premiumCommand: "premium",
  prefixCommand: "prefix",
  remindCommand: "remind",
  purgeCommand: "purge",
  robloxCommand: "roblox",
  roleinfoCommand: "roleinfo",
  rsnipeCommand: "rsnipe",
  sayCommand: "say",
  serverinfoCommand: "serverinfo",
  snipeCommand: "snipe",
  statusCommand: "status",
  esnipeCommand: "esnipe",
  slowmodeCommand: "slowmode",
  timeoutCommand: "timeout",
  tiktokCommand: "tiktok",
  ttsCommand: "tts",
  untimeoutCommand: "untimeout",
  unlockCommand: "unlock",
  uptimeCommand: "uptime",
  userinfoCommand: "userinfo",
  vlbCommand: "vlb",
  voicemasterCommand: "voicemaster",
  handoutCommand: "handout",
};

const botSiteNames = new Set();
for (const exp of registryNames) {
  const cmd = nameByExport[exp];
  if (!cmd) {
    console.error("Unknown export in registry:", exp);
    process.exit(1);
  }
  if (noSiteCommands.has(cmd)) continue;
  botSiteNames.add(cmd);
}

const missingCanon = [...botSiteNames].filter((n) => !canonSet.has(n)).sort();
const extraCanon = [...canonSet].filter((n) => !botSiteNames.has(n)).sort();

console.log("Bot commands with site:", botSiteNames.size);
console.log("Canonical rows:", canonSet.size);
if (missingCanon.length) {
  console.error("In bot registry (with site) but missing from canonical:", missingCanon);
  process.exit(1);
}
if (extraCanon.length) {
  console.warn("In canonical but not in bot site list (may be intentional):", extraCanon);
}
console.log("OK — canonical covers every public bot command.");
