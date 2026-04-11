/**
 * Canonical public catalog — merged on top of the DB snapshot from the bot.
 * Keeps /commands accurate when sync is stale or missing rows. Update when
 * you add or change `site` metadata in `bot/src/commands/`.
 *
 * Include every `aliases` entry here so Shortcuts match Discord (canonical wins over DB for these names).
 */
export type CanonicalCommandSiteRow = {
  name: string;
  description: string;
  usage?: string;
  tier: "free" | "pro";
  style: "prefix" | "slash";
  aliases?: string[];
  /** Bot owner only — Developer tag on /commands. */
  developerOnly?: boolean;
  categoryId: string;
  categoryTitle: string;
  categoryDescription: string;
};

const CANONICAL_UNSORTED: CanonicalCommandSiteRow[] = [
  {
    name: "access",
    description:
      "Bot owner only — allow or deny Knife in a server by guild id (stored in DB)",
    usage: ".access yes <guildId> · .access no <guildId>",
    tier: "free",
    style: "prefix",
    developerOnly: true,
    categoryId: "core",
    categoryTitle: "Core",
    categoryDescription: "Essential prefix commands.",
  },
  {
    name: "audit",
    description:
      "Manage Server — recent prefix command runs (who, command, time, ok/fail); no message text or args",
    usage: ".audit · .auditlog · .cmdlog [limit]",
    tier: "free",
    style: "prefix",
    aliases: ["auditlog", "cmdlog"],
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
  },
  {
    name: "8ball",
    description: "Ask the Magic 8-Ball a question (or get a random answer)",
    usage: ".8ball · .eightball · .magic8ball [question]",
    tier: "free",
    style: "prefix",
    aliases: ["eightball", "magic8ball"],
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Quick tools and light fun.",
  },
  {
    name: "afk",
    description:
      "Set AFK with an optional reason (default “AFK”); auto-reply + welcome back when you return",
    usage: ".afk [reason] · .afk clear",
    tier: "free",
    style: "prefix",
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Quick tools and light fun.",
  },
  {
    name: "avatar",
    description: "Show a user’s avatar (mention, ID, or yourself)",
    usage: ".avatar [@user | user ID]",
    tier: "free",
    style: "prefix",
    aliases: ["av"],
    categoryId: "core",
    categoryTitle: "Core",
    categoryDescription: "Essential prefix commands.",
  },
  {
    name: "banner",
    description:
      "Show a user or server banner image (mention, ID, or yourself; use “server” for guild)",
    usage: ".banner [@user | user ID] · .banner server",
    tier: "free",
    style: "prefix",
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Quick tools and light fun.",
  },
  {
    name: "ban",
    description:
      "Ban a user by mention or ID; optional 0–7 days of message delete (first arg after user)",
    usage: ".ban @user [0-7] [reason] · .b userId 1 spam",
    tier: "free",
    style: "prefix",
    aliases: ["b"],
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
  },
  {
    name: "billing",
    description:
      "Your Pro status and a short link to manage subscription on the site (DM when possible)",
    usage: ".billing",
    tier: "free",
    style: "prefix",
    categoryId: "pro",
    categoryTitle: "Pro",
    categoryDescription: "Knife Pro billing and perks.",
  },
  {
    name: "botinfo",
    description:
      "Bot version, support server, website, and legal links (privacy & terms)",
    usage: ".botinfo · .bi",
    tier: "free",
    style: "prefix",
    aliases: ["bi"],
    categoryId: "core",
    categoryTitle: "Core",
    categoryDescription: "Essential prefix commands.",
  },
  {
    name: "baltop",
    description:
      "Global top Knife Cash — richest by wallet + bank total (top 15); shows wallet, bank, and total per row",
    usage: ".baltop · .cashtop · .richest · .topcash · .moneylb",
    tier: "free",
    style: "prefix",
    aliases: ["cashtop", "richest", "leaderboardcash", "topcash", "moneylb"],
    categoryId: "gambling",
    categoryTitle: "Gambling & economy",
    categoryDescription:
      "Global Knife Cash — .gamble hub, shop, daily, work/crime/beg, bank & businesses, gathering (.mine / .fish), pets, pay, and guild .rob / .duel / .bounty. Virtual currency for fun.",
  },
  {
    name: "cash",
    description:
      "Show your global Knife Cash balance (or another user’s); shows payout multiplier when boost, Pro, or an equipped pet applies (capped)",
    usage: ".cash · .bal · .balance · .wallet [@user | ID]",
    tier: "free",
    style: "prefix",
    aliases: ["bal", "balance", "wallet"],
    categoryId: "gambling",
    categoryTitle: "Gambling & economy",
    categoryDescription:
      "Global Knife Cash — .gamble hub, shop, daily, work/crime/beg, bank & businesses, gathering (.mine / .fish), pets, pay, and guild .rob / .duel / .bounty. Virtual currency for fun.",
  },
  {
    name: "gamble",
    description:
      "Knife Cash — private in-channel disclaimer, then hub: shop, games (coinflip, dice, slots, blackjack, mines), stats, pay",
    usage: ".gamble · .economy · .eco · .bet · .casino",
    tier: "free",
    style: "prefix",
    aliases: ["economy", "eco", "bet", "casino"],
    categoryId: "gambling",
    categoryTitle: "Gambling & economy",
    categoryDescription:
      "Global Knife Cash — .gamble hub, shop, daily, work/crime/beg, bank & businesses, gathering (.mine / .fish), pets, pay, and guild .rob / .duel / .bounty. Virtual currency for fun.",
  },
  {
    name: "gcash",
    aliases: ["ecoadmin", "cashadmin", "givecash", "setcash"],
    description:
      "Bot owner only — add, remove, or set a user’s global Knife Cash (logged)",
    usage: ".gcash add @user <amount> · .givecash · remove · set",
    tier: "free",
    style: "prefix",
    developerOnly: true,
    categoryId: "gambling",
    categoryTitle: "Gambling & economy",
    categoryDescription:
      "Global Knife Cash — .gamble hub, shop, daily, work/crime/beg, bank & businesses, gathering (.mine / .fish), pets, pay, and guild .rob / .duel / .bounty. Virtual currency for fun.",
  },
  {
    name: "luckydrop",
    aliases: ["cashdrop", "randdrop", "ownerdrop"],
    description:
      "Bot owner only — pick a random member for a cash drop (confirm, reroll, cancel)",
    usage: ".luckydrop <amount> · .cashdrop · .ownerdrop",
    tier: "free",
    style: "prefix",
    developerOnly: true,
    categoryId: "gambling",
    categoryTitle: "Gambling & economy",
    categoryDescription:
      "Global Knife Cash — .gamble hub, shop, daily, work/crime/beg, bank & businesses, gathering (.mine / .fish), pets, pay, and guild .rob / .duel / .bounty. Virtual currency for fun.",
  },
  {
    name: "messagedrop",
    description:
      "Bot owner only — pay everyone with at least N lifetime tracked messages a lump of Knife Cash",
    usage: ".messagedrop <min_messages> <amount> · .msgdrop · .drop",
    tier: "free",
    style: "prefix",
    developerOnly: true,
    aliases: ["msgdrop", "drop"],
    categoryId: "gambling",
    categoryTitle: "Gambling & economy",
    categoryDescription:
      "Global Knife Cash — .gamble hub, shop, daily, work/crime/beg, bank & businesses, gathering (.mine / .fish), pets, pay, and guild .rob / .duel / .bounty. Virtual currency for fun.",
  },
  {
    name: "bank",
    aliases: ["vault", "savings"],
    description:
      "View bank balance, tier cap, and lazy interest — or .bank upgrade for a higher cap",
    usage: ".bank · .vault · .bank upgrade",
    tier: "free",
    style: "prefix",
    categoryId: "gambling",
    categoryTitle: "Gambling & economy",
    categoryDescription:
      "Global Knife Cash — .gamble hub, shop, daily, work/crime/beg, bank & businesses, gathering (.mine / .fish), pets, pay, and guild .rob / .duel / .bounty. Virtual currency for fun.",
  },
  {
    name: "beg",
    aliases: ["panhandle", "sparechange"],
    description:
      "Beg for a tiny Knife Cash tip (short cooldown, often nothing)",
    usage: ".beg · .panhandle · .sparechange",
    tier: "free",
    style: "prefix",
    categoryId: "gambling",
    categoryTitle: "Gambling & economy",
    categoryDescription:
      "Global Knife Cash — .gamble hub, shop, daily, work/crime/beg, bank & businesses, gathering (.mine / .fish), pets, pay, and guild .rob / .duel / .bounty. Virtual currency for fun.",
  },
  {
    name: "bounty",
    aliases: ["hit", "contract"],
    description:
      "Post Knife Cash on someone's head — paid automatically if you successfully .rob them here (treasury holds escrow)",
    usage: ".bounty @user <amount> · .hit · .bounty list · .bounty cancel",
    tier: "free",
    style: "prefix",
    categoryId: "gambling",
    categoryTitle: "Gambling & economy",
    categoryDescription:
      "Global Knife Cash — .gamble hub, shop, daily, work/crime/beg, bank & businesses, gathering (.mine / .fish), pets, pay, and guild .rob / .duel / .bounty. Virtual currency for fun.",
  },
  {
    name: "business",
    aliases: ["biz", "franchise"],
    description:
      "Passive Knife Cash businesses — menu, tracks (marketing/automation/staff/equipment), random events, collect",
    usage: ".business · .biz · .business list · .business buy <id> · .business collect",
    tier: "free",
    style: "prefix",
    categoryId: "gambling",
    categoryTitle: "Gambling & economy",
    categoryDescription:
      "Global Knife Cash — .gamble hub, shop, daily, work/crime/beg, bank & businesses, gathering (.mine / .fish), pets, pay, and guild .rob / .duel / .bounty. Virtual currency for fun.",
  },
  {
    name: "crime",
    aliases: ["heist", "lawless"],
    description:
      "Risky Knife Cash job — negative EV; fines go to the treasury on failure",
    usage: ".crime · .heist",
    tier: "free",
    style: "prefix",
    categoryId: "gambling",
    categoryTitle: "Gambling & economy",
    categoryDescription:
      "Global Knife Cash — .gamble hub, shop, daily, work/crime/beg, bank & businesses, gathering (.mine / .fish), pets, pay, and guild .rob / .duel / .bounty. Virtual currency for fun.",
  },
  {
    name: "deposit",
    aliases: ["dep", "save"],
    description:
      "Move Knife Cash from wallet into the bank (lazy interest, tier cap)",
    usage: ".deposit <amount> · .dep · .save",
    tier: "free",
    style: "prefix",
    categoryId: "gambling",
    categoryTitle: "Gambling & economy",
    categoryDescription:
      "Global Knife Cash — .gamble hub, shop, daily, work/crime/beg, bank & businesses, gathering (.mine / .fish), pets, pay, and guild .rob / .duel / .bounty. Virtual currency for fun.",
  },
  {
    name: "duel",
    aliases: ["pvp", "challenge"],
    description:
      "Challenge someone to a Knife Cash stake duel (guild only; opponent accepts with a button)",
    usage: ".duel @user <amount> · .pvp · .challenge",
    tier: "free",
    style: "prefix",
    categoryId: "gambling",
    categoryTitle: "Gambling & economy",
    categoryDescription:
      "Global Knife Cash — .gamble hub, shop, daily, work/crime/beg, bank & businesses, gathering (.mine / .fish), pets, pay, and guild .rob / .duel / .bounty. Virtual currency for fun.",
  },
  {
    name: "fish",
    aliases: ["fishing", "catch"],
    description:
      "Knife Cash — fishing menu: rods, upgrades, and pole-specific catch minigames",
    usage: ".fish · .fishing · .catch",
    tier: "free",
    style: "prefix",
    categoryId: "gambling",
    categoryTitle: "Gambling & economy",
    categoryDescription:
      "Global Knife Cash — .gamble hub, shop, daily, work/crime/beg, bank & businesses, gathering (.mine / .fish), pets, pay, and guild .rob / .duel / .bounty. Virtual currency for fun.",
  },
  {
    name: "mine",
    aliases: ["mining", "dig"],
    description:
      "Knife Cash — mining menu: pickaxes, upgrades, and pick-specific ore minigames (not casino Mines)",
    usage: ".mine · .mining · .dig",
    tier: "free",
    style: "prefix",
    categoryId: "gambling",
    categoryTitle: "Gambling & economy",
    categoryDescription:
      "Global Knife Cash — .gamble hub, shop, daily, work/crime/beg, bank & businesses, gathering (.mine / .fish), pets, pay, and guild .rob / .duel / .bounty. Virtual currency for fun.",
  },
  {
    name: "pet",
    aliases: ["adopt", "mypet"],
    description:
      "Buy, equip, feed, name, or inspect Knife Cash pets — .pet buy, .pet equip, .pet feed, .pet name, .pet info (nickname for equipped pet; XP/happiness .gamble bonus)",
    usage:
      ".pet buy <dog|cat|rabbit> · .adopt · .pet equip <species> · .pet feed · .pet name <name|clear> · .pet info",
    tier: "free",
    style: "prefix",
    categoryId: "gambling",
    categoryTitle: "Gambling & economy",
    categoryDescription:
      "Global Knife Cash — .gamble hub, shop, daily, work/crime/beg, bank & businesses, gathering (.mine / .fish), pets, pay, and guild .rob / .duel / .bounty. Virtual currency for fun.",
  },
  {
    name: "pets",
    aliases: ["petmenu", "mypets"],
    description: "Knife Cash pets — button menu (equip / feed)",
    usage: ".pets · .petmenu · .mypets",
    tier: "free",
    style: "prefix",
    categoryId: "gambling",
    categoryTitle: "Gambling & economy",
    categoryDescription:
      "Global Knife Cash — .gamble hub, shop, daily, work/crime/beg, bank & businesses, gathering (.mine / .fish), pets, pay, and guild .rob / .duel / .bounty. Virtual currency for fun.",
  },
  {
    name: "rebirth",
    aliases: ["rb", "prestige"],
    description:
      "Rebirth menu (paginated) — soft reset for permanent coin %, gems, bank cap, gamble luck; .rebirth stats · .rebirth top",
    usage: ".rebirth · .rb · .prestige · .rebirth stats · .rebirth top",
    tier: "free",
    style: "prefix",
    categoryId: "gambling",
    categoryTitle: "Gambling & economy",
    categoryDescription:
      "Global Knife Cash — .gamble hub, shop, daily, work/crime/beg, bank & businesses, gathering (.mine / .fish), pets, pay, and guild .rob / .duel / .bounty. Virtual currency for fun.",
  },
  {
    name: "rob",
    aliases: ["steal", "mug"],
    description:
      "Try to steal Knife Cash from another member (guild only, high fail rate)",
    usage: ".rob @user · .steal · .mug",
    tier: "free",
    style: "prefix",
    categoryId: "gambling",
    categoryTitle: "Gambling & economy",
    categoryDescription:
      "Global Knife Cash — .gamble hub, shop, daily, work/crime/beg, bank & businesses, gathering (.mine / .fish), pets, pay, and guild .rob / .duel / .bounty. Virtual currency for fun.",
  },
  {
    name: "withdraw",
    aliases: ["wd", "take"],
    description:
      "Move Knife Cash from bank to wallet (applies lazy interest first)",
    usage: ".withdraw <amount> · .wd · .take",
    tier: "free",
    style: "prefix",
    categoryId: "gambling",
    categoryTitle: "Gambling & economy",
    categoryDescription:
      "Global Knife Cash — .gamble hub, shop, daily, work/crime/beg, bank & businesses, gathering (.mine / .fish), pets, pay, and guild .rob / .duel / .bounty. Virtual currency for fun.",
  },
  {
    name: "work",
    aliases: ["job", "shift", "grind"],
    description:
      "Knife Cash — jobs menu: roles, promotions, shift minigames, treasury skim on pay",
    usage: ".work · .job · .shift · .grind",
    tier: "free",
    style: "prefix",
    categoryId: "gambling",
    categoryTitle: "Gambling & economy",
    categoryDescription:
      "Global Knife Cash — .gamble hub, shop, daily, work/crime/beg, bank & businesses, gathering (.mine / .fish), pets, pay, and guild .rob / .duel / .bounty. Virtual currency for fun.",
  },
  {
    name: "handout",
    description:
      "Bot owner / developers — grant or revoke site entitlements (premium, owner) for a user",
    usage: ".handout add @user premium · remove @user owner",
    tier: "free",
    style: "prefix",
    developerOnly: true,
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
  },
  {
    name: "command",
    description:
      "Manage Server — disable or enable a command per channel or server-wide; role overrides to bypass disables or deny usage",
    usage:
      ".command / .cmd — disable|enable … · override enable|disable|remove …",
    tier: "free",
    style: "prefix",
    aliases: ["cmd"],
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
  },
  {
    name: "createembed",
    description:
      "Post an embed built from a Knife **{embed}$v** script (same rules as **.say**; use the site embed builder)",
    usage:
      ".createembed #channel {embed}$v{title: …} — /tools/embed · .ce · .postembed · .embedsend",
    tier: "pro",
    style: "prefix",
    aliases: ["ce", "embedcreate", "sendembed", "postembed", "embedsend"],
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
  },
  {
    name: "credits",
    description:
      "Team and contributors — link to the hidden credits page on the Knife site",
    usage: ".credits · .team",
    tier: "free",
    style: "prefix",
    aliases: ["team"],
    categoryId: "core",
    categoryTitle: "Core",
    categoryDescription: "Essential prefix commands.",
  },
  {
    name: "dashboard",
    description: "Open the web dashboard to manage Knife (sign in with Discord)",
    usage: ".dashboard · .dash",
    tier: "free",
    style: "prefix",
    aliases: ["dash"],
    categoryId: "core",
    categoryTitle: "Core",
    categoryDescription: "Essential prefix commands.",
  },
  {
    name: "daily",
    aliases: ["claim", "payday", "payout", "stipend"],
    description:
      "Claim 50 Knife Cash once every 24 hours (global wallet; same cooldown everywhere)",
    usage: ".daily · .claim · .payday · .payout",
    tier: "free",
    style: "prefix",
    categoryId: "gambling",
    categoryTitle: "Gambling & economy",
    categoryDescription:
      "Global Knife Cash — .gamble hub, shop, daily, work/crime/beg, bank & businesses, gathering (.mine / .fish), pets, pay, and guild .rob / .duel / .bounty. Virtual currency for fun.",
  },
  {
    name: "emoji",
    description:
      "Show a custom emoji at full size (paste <:name:id> or use numeric ID)",
    usage: ".emoji <:name:id> · .emoji 123456789012345678",
    tier: "free",
    style: "prefix",
    aliases: ["e"],
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Quick tools and light fun.",
  },
  {
    name: "esnipe",
    description: "Show the last edited message (before → after) in this channel",
    usage: ".esnipe · .es · .editsnipe",
    tier: "free",
    style: "prefix",
    aliases: ["es", "editsnipe"],
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Quick tools and light fun.",
  },
  {
    name: "help",
    description: "Link to the full command list on the Knife site",
    usage: ".help",
    tier: "free",
    style: "prefix",
    aliases: ["h"],
    categoryId: "core",
    categoryTitle: "Core",
    categoryDescription: "Essential prefix commands.",
  },
  {
    name: "invite",
    description:
      "Add Knife to your server and open the web dashboard to manage it",
    usage: ".invite · .inv",
    tier: "free",
    style: "prefix",
    aliases: ["inv"],
    categoryId: "core",
    categoryTitle: "Core",
    categoryDescription: "Essential prefix commands.",
  },
  {
    name: "kick",
    description: "Remove a member from the server (needs Kick Members)",
    usage: ".kick @user [reason] · .k @user [reason]",
    tier: "free",
    style: "prefix",
    aliases: ["k"],
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
  },
  {
    name: "knife",
    description: "About Knife — site links, prefix, and gateway latency",
    usage: ".knife",
    tier: "free",
    style: "prefix",
    categoryId: "core",
    categoryTitle: "Core",
    categoryDescription: "Essential prefix commands.",
  },
  {
    name: "lb",
    description:
      "Text leaderboard — top members by messages sent (every message while Knife is in the server)",
    usage: ".lb · .leaderboard · .textlb",
    tier: "free",
    style: "prefix",
    aliases: ["leaderboard", "textleaderboard", "textlb"],
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Quick tools and light fun.",
  },
  {
    name: "nickname",
    description:
      "Change Knife's nickname in this server (empty text clears it). Needs Manage Nicknames + bot role with Change Nickname — no owner bypass.",
    usage: ".nickname <text|empty>",
    tier: "free",
    style: "prefix",
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Quick tools and light fun.",
    aliases: ["nick"],
  },
  {
    name: "news",
    description:
      "Latest What's new line from knife.rip/changelog + link (fetches site API)",
    usage: ".news · .whatsnew · .updates",
    tier: "free",
    style: "prefix",
    aliases: ["whatsnew", "updates"],
    categoryId: "core",
    categoryTitle: "Core",
    categoryDescription: "Essential prefix commands.",
  },
  {
    name: "lock",
    description:
      "Stop @everyone from sending messages in this channel (overwrite)",
    usage: ".lock",
    tier: "free",
    style: "prefix",
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
  },
  {
    name: "ping",
    description: "Check bot and Discord gateway latency",
    usage: ".ping",
    tier: "free",
    style: "prefix",
    categoryId: "core",
    categoryTitle: "Core",
    categoryDescription: "Essential prefix commands.",
  },
  {
    name: "poll",
    description:
      "Button poll — choices separated by | — or Yes/No; end with .poll end",
    usage:
      ".poll · .vote — … | end [id] · reply + .poll/.vote end",
    tier: "free",
    style: "prefix",
    aliases: ["vote"],
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Quick tools and light fun.",
  },
  {
    name: "prefix",
    description:
      "View or set this server’s command prefix (Manage Server). `.prefix add` only allow-listed symbols; `.prefix remove` restores default `.`",
    usage: ".prefix · .setprefix — add <symbol> · remove",
    tier: "free",
    style: "prefix",
    aliases: ["setprefix"],
    categoryId: "core",
    categoryTitle: "Core",
    categoryDescription: "Essential prefix commands.",
  },
  {
    name: "purge",
    description:
      "Bulk-delete recent messages (max 100), skips pinned & messages older than 14 days",
    usage: ".purge · .prune [number] [reason]",
    tier: "free",
    style: "prefix",
    aliases: ["prune"],
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
  },
  {
    name: "premium",
    description: "Knife Pro — one-time lifetime unlock and your status",
    usage: ".premium",
    tier: "free",
    style: "prefix",
    aliases: ["pro", "prem"],
    categoryId: "pro",
    categoryTitle: "Pro",
    categoryDescription: "Knife Pro billing and perks.",
  },
  {
    name: "remind",
    description:
      "Knife Pro — schedule a personal reminder (DM); rate-limited; up to 7 days ahead",
    usage: ".remind 15m note · .remind list · .remind cancel [id|all]",
    tier: "pro",
    style: "prefix",
    aliases: ["reminder", "remindme"],
    categoryId: "pro",
    categoryTitle: "Pro",
    categoryDescription: "Knife Pro billing and perks.",
  },
  {
    name: "reminders",
    description:
      "Same behavior as **.remind** — Pro — list, cancel/remove, or schedule a DM reminder",
    usage: ".reminders (same as .remind)",
    tier: "pro",
    style: "prefix",
    categoryId: "pro",
    categoryTitle: "Pro",
    categoryDescription: "Knife Pro billing and perks.",
  },
  {
    name: "roleinfo",
    description: "Show details for a role (mention, ID, or name)",
    usage: ".roleinfo @Role · .roleinfo 123… · .roleinfo Mod Team",
    tier: "free",
    style: "prefix",
    aliases: ["ri"],
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Quick tools and light fun.",
  },
  {
    name: "roblox",
    description: "Roblox profile — lookup by username",
    usage: ".roblox username · .rblx",
    tier: "free",
    style: "prefix",
    aliases: ["rblx"],
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Quick tools and light fun.",
  },
  {
    name: "rsnipe",
    description:
      "Show the last reaction removed in this channel (emoji + who removed it)",
    usage: ".rsnipe · .rs · .reactionsnipe",
    tier: "free",
    style: "prefix",
    aliases: ["rs", "reactionsnipe"],
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Quick tools and light fun.",
  },
  {
    name: "say",
    description:
      "Post as the bot — plain text or **{embed}$v** script from **knife.rip/tools/embed** (Knife Pro + Administrator; owners skip both)",
    usage:
      ".say #channel hello · .say #channel {embed}$v… · .botsay · .botpost",
    tier: "pro",
    style: "prefix",
    aliases: ["botsay", "botpost"],
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
  },
  {
    name: "serverinfo",
    description: "Detailed server stats (sectioned layout)",
    usage: ".serverinfo · .si",
    tier: "free",
    style: "prefix",
    aliases: ["si"],
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Quick tools and light fun.",
  },
  {
    name: "snipe",
    description:
      "Show the last deleted message in this channel (if the bot saw it)",
    usage: ".snipe · .s",
    tier: "free",
    style: "prefix",
    aliases: ["s"],
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Quick tools and light fun.",
  },
  {
    name: "status",
    description: "Site status one-liner and link to the full status page",
    usage: ".status · .botstatus",
    tier: "free",
    style: "prefix",
    aliases: ["botstatus"],
    categoryId: "core",
    categoryTitle: "Core",
    categoryDescription: "Essential prefix commands.",
  },
  {
    name: "slowmode",
    description:
      "Set this channel’s slowmode (0–21600 seconds; 0 turns it off)",
    usage: ".slowmode [seconds]",
    tier: "free",
    style: "prefix",
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
  },
  {
    name: "timeout",
    description:
      "Timeout a member — duration like 10m, 2h, 1d (max 28d); optional reason after",
    usage: ".timeout · .mute · .to — @user duration [reason]",
    tier: "free",
    style: "prefix",
    aliases: ["mute", "to"],
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
  },
  {
    name: "tiktok",
    description: "TikTok profile — stats and bio for a @username",
    usage: ".tiktok username · .tt @username",
    tier: "free",
    style: "prefix",
    aliases: ["tt"],
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Quick tools and light fun.",
  },
  {
    name: "tts",
    description: "Text-to-speech — replies with your line as an MP3",
    usage: ".tts your message · .texttospeech · .text2speech",
    tier: "free",
    style: "prefix",
    aliases: ["texttospeech", "text2speech"],
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Quick tools and light fun.",
  },
  {
    name: "untimeout",
    description: "Remove a member’s active timeout",
    usage: ".untimeout · .unmute · .ut — @user [reason]",
    tier: "free",
    style: "prefix",
    aliases: ["unmute", "ut"],
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
  },
  {
    name: "unlock",
    description:
      "Clear the @everyone send lock for this channel (inherit again)",
    usage: ".unlock",
    tier: "free",
    style: "prefix",
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
  },
  {
    name: "uptime",
    description: "How long the bot process has been running",
    usage: ".uptime · .up",
    tier: "free",
    style: "prefix",
    aliases: ["up"],
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Quick tools and light fun.",
  },
  {
    name: "userinfo",
    description: "Detailed user profile (sectioned layout)",
    usage: ".userinfo [@user | ID] · .ui",
    tier: "free",
    style: "prefix",
    aliases: ["ui"],
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Quick tools and light fun.",
  },
  {
    name: "vlb",
    description:
      "Voice leaderboard — top members by time in VC (AFK excluded; while Knife is online)",
    usage: ".vlb · .vcleaderboard · .voicelb",
    tier: "free",
    style: "prefix",
    aliases: ["vcleaderboard", "voiceleaderboard", "voicelb"],
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Quick tools and light fun.",
  },
  {
    name: "voicemaster",
    description:
      "VoiceMaster — temp voice channels from a hub; paginated panel (lock, ghost, disconnect picker, info, user limit, rename) plus permit, transfer, defaults",
    usage:
      ".voicemaster setup · panel ({{mdi:lock}} lock · {{mdi:ghost-outline}} ghost · {{mdi:lan-disconnect}} disconnect · {{mdi:plus}} limit · {{mdi:pencil}} rename) · .vm join",
    tier: "free",
    style: "prefix",
    aliases: ["vm"],
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Quick tools and light fun.",
  },
  {
    name: "webhook",
    description:
      "Create, list, send, edit, delete, lock, or unlock channel webhooks (Manage Webhooks except list)",
    usage:
      ".webhook · .webhook create <name> · .webhook list · .webhook send <id|name|#> <message|JSON> · .webhook edit <messageLink> <message|JSON> · .webhook delete <id> · .webhook lock <id> · .webhook unlock <id>",
    tier: "free",
    style: "prefix",
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Quick tools and light fun.",
  },
];

export const CANONICAL_COMMAND_SITE_ROWS: CanonicalCommandSiteRow[] = [
  ...CANONICAL_UNSORTED,
].sort((a, b) => a.name.localeCompare(b.name));
