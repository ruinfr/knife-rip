/**
 * ltccat server custom emojis — use in embeds as strings, in buttons as { id, name }.
 * Bot must share the guild where these emojis are uploaded.
 */
const M = {
  cash: "<:cash:1491209244291235840>",
  shop: "<:shop:1491209125500030986>",
  dice: "<:dice:1491208948098007222>",
  coinflip: "<:coinflip:1491208947359678544>",
  coinflippvp: "<:coinflippvp:1491208946554507315>",
  slots: "<:slots:1491208945480630392>",
  blackjack: "<:blackjack:1491208944746762420>",
  mines: "<:mines:1491208943815491624>",
  icoutlineplus: "<:icoutlineplus:1491169577240101075>",
  icroundminus: "<:icroundminus:1491169569866387546>",
  gridiconslock: "<:gridiconslock:1491168088929079608>",
  siunlockfill: "<:siunlockfill:1491168087548887141>",
  tablerinfosquarefilled: "<:tablerinfosquarefilled:1491168085414252696>",
  mdighostoff: "<:mdighostoff:1491168080825548820>",
  mdighost: "<:mdighost:1491168079999140000>",
  materialsymbolscheckbox: "<:materialsymbolscheckbox:1491168078694842399>",
  mdirenamebox: "<:mdirenamebox:1491168077751259176>",
  lucidearrowleft: "<:lucidearrowleft:1491168047057076336>",
  lucidearrowright: "<:lucidearrowright:1491168045236752597>",
  luckydrop: "<:luckydrop:1491210627589476402>",
  Cancel: "<:Cancel:1491210483422859365>",
  Confirm: "<:Confirm:1491210482302980296>",
  Reroll: "<:Reroll:1491210481439084584>",
  msgs: "<:msgs:1491210057986343003>",
  rich: "<:rich:1491210056941834251>",
  customrole: "<:customrole:1491210055457177651>",
  picperms: "<:picperms:1491210054454738974>",
  booster: "<:booster:1491210053724672070>",
  knifepremium: "<:knifepremium:1491210052814770288>",
  toplb: "<:toplb:1491209450508259458>",
  pay: "<:pay:1491209367242936572>",
  stats: "<:stats:1491209262846836756>",
  /** Playing cards (blackjack) — ranks 1–9 are tablerplaycard1…9 */
  tablerplaycard1: "<:tablerplaycard1:1491215609445355590>",
  tablerplaycard2: "<:tablerplaycard2:1491215608656826499>",
  tablerplaycard3: "<:tablerplaycard3:1491215607897526282>",
  tablerplaycard4: "<:tablerplaycard4:1491215605846511707>",
  tablerplaycard5: "<:tablerplaycard5:1491215604240224341>",
  tablerplaycard6: "<:tablerplaycard6:1491215602008723557>",
  tablerplaycard7: "<:tablerplaycard7:1491215599614038016>",
  tablerplaycard8: "<:tablerplaycard8:1491215596178641127>",
  tablerplaycard9: "<:tablerplaycard9:1491215595348164851>",
  tablerplaycarda: "<:tablerplaycarda:1491215593712386058>",
  tablerplaycardj: "<:tablerplaycardj:1491215592341110844>",
  tablerplaycardq: "<:tablerplaycardq:1491215582186701051>",
  tablerplaycardk: "<:tablerplaycardk:1491215583323361300>",
  emojionev1bomb: "<:emojionev1bomb:1491215389214904373>",
  emojionev1gemstone: "<:emojionev1gemstone:1491215388350873740>",
  topgambler: "<:topgambler:1491217374333108375>",
  tax: "<:tax:1491217082023415948>",
  games: "<:games:1491216919972548608>",
  winLossInStatsMenu: "<:WinLossInStatsMenu:1491218198807187526>",
  netInStatsMenu: "<:NetInStatsMenu:1491218198169911316>",
  rankInStatsMenu: "<:RankInStatsMenu:1491218197225934878>",
  streakInStatsMenu: "<:streakInStatsMenu:1491218195820974262>",
} as const;

export const ecoM = M;

type Btn = { id: string; name: string };

function b(id: string, name: string): Btn {
  return { id, name };
}

/** `ButtonBuilder#setEmoji` / select option emojis */
export const ecoBtn = {
  cash: b("1491209244291235840", "cash"),
  shop: b("1491209125500030986", "shop"),
  dice: b("1491208948098007222", "dice"),
  coinflip: b("1491208947359678544", "coinflip"),
  coinflippvp: b("1491208946554507315", "coinflippvp"),
  slots: b("1491208945480630392", "slots"),
  blackjack: b("1491208944746762420", "blackjack"),
  mines: b("1491208943815491624", "mines"),
  lucidearrowleft: b("1491168047057076336", "lucidearrowleft"),
  lucidearrowright: b("1491168045236752597", "lucidearrowright"),
  stats: b("1491209262846836756", "stats"),
  toplb: b("1491209450508259458", "toplb"),
  pay: b("1491209367242936572", "pay"),
  msgs: b("1491210057986343003", "msgs"),
  Confirm: b("1491210482302980296", "Confirm"),
  Reroll: b("1491210481439084584", "Reroll"),
  Cancel: b("1491210483422859365", "Cancel"),
  luckydrop: b("1491210627589476402", "luckydrop"),
  knifepremium: b("1491210052814770288", "knifepremium"),
  booster: b("1491210053724672070", "booster"),
  tablerinfosquarefilled: b("1491168085414252696", "tablerinfosquarefilled"),
  emojionev1bomb: b("1491215389214904373", "emojionev1bomb"),
  emojionev1gemstone: b("1491215388350873740", "emojionev1gemstone"),
  icoutlineplus: b("1491169577240101075", "icoutlineplus"),
  materialsymbolscheckbox: b("1491168078694842399", "materialsymbolscheckbox"),
  topgambler: b("1491217374333108375", "topgambler"),
  tax: b("1491217082023415948", "tax"),
  games: b("1491216919972548608", "games"),
  WinLossInStatsMenu: b("1491218198807187526", "WinLossInStatsMenu"),
  NetInStatsMenu: b("1491218198169911316", "NetInStatsMenu"),
  RankInStatsMenu: b("1491218197225934878", "RankInStatsMenu"),
  streakInStatsMenu: b("1491218195820974262", "streakInStatsMenu"),
} as const;

const HUB_PAGE_TITLE: readonly string[] = [
  `${M.shop} Shop`,
  `${M.games} Games`,
  `${M.stats} Stats`,
  `${M.pay} Pay`,
];

export function economyHubPageTitle(page: number): string {
  const p = Math.max(0, Math.min(HUB_PAGE_TITLE.length - 1, page));
  return `${HUB_PAGE_TITLE[p]!} · Knife Cash`;
}
