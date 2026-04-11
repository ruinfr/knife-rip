import { EmbedBuilder } from "discord.js";
import { ecoM } from "../../lib/economy/custom-emojis";
import { isGuildTextEconomyChannel } from "../../lib/economy/guild-economy-context";
import {
  buildRebirthEmbed,
  buildRebirthRows,
  loadRebirthMenuCtx,
} from "../../lib/economy/rebirth-flow";
import { formatCash } from "../../lib/economy/money";
import {
  REBIRTH_COOLDOWN_MS,
  rebirthCashRequirement,
  rebirthMsgsRequirement,
} from "../../lib/economy/rebirth-mult";
import { getBotPrisma } from "../../lib/db-prisma";
import { errorEmbed, minimalEmbed } from "../../lib/embeds";
import type { KnifeCommand } from "../types";

export const rebirthCommand: KnifeCommand = {
  name: "rebirth",
  aliases: ["rb", "prestige"],
  description:
    "Knife Cash rebirth menu — soft reset for permanent bonuses, **`.rebirth stats`**, **`.rebirth top`**",
  site: {
    categoryId: "gambling",
    categoryTitle: "Gambling & economy",
    categoryDescription:
      "Global Knife Cash — .gamble hub, shop, daily, work/crime/beg, bank & businesses, gathering (.mine / .fish), pets, pay, and guild .rob / .duel / .bounty. Virtual currency for fun.",
    usage: ".rebirth · .rb · .prestige · .rebirth stats · .rebirth top",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    if (!isGuildTextEconomyChannel(message)) {
      await message.reply({
        embeds: [
          errorEmbed(
            "Run **`.rebirth`** in a **server text channel** (not DMs).",
          ),
        ],
      });
      return;
    }

    const uid = message.author.id;
    const sub = args[0]?.toLowerCase();

    if (sub === "stats") {
      const ctx = await loadRebirthMenuCtx(uid);
      const nextN = ctx.rebirthCount + 1;
      const needCash = rebirthCashRequirement(nextN);
      const needMsgs = rebirthMsgsRequirement(nextN);
      const cdOk =
        !ctx.lastRebirthAt ||
        Date.now() - ctx.lastRebirthAt.getTime() >= REBIRTH_COOLDOWN_MS;
      const cdLeft =
        ctx.lastRebirthAt && !cdOk
          ? REBIRTH_COOLDOWN_MS -
            (Date.now() - ctx.lastRebirthAt.getTime())
          : 0;
      const ready =
        ctx.cash >= needCash &&
        ctx.lifetimeMessages >= needMsgs &&
        cdOk;

      await message.reply({
        embeds: [
          minimalEmbed({
            title: `${ecoM.cash} Rebirth stats`,
            description:
              `**Completed rebirths:** **${ctx.rebirthCount}**\n` +
              `**Rebirth gems:** **${formatCash(ctx.gems)}**\n` +
              `**Wallet:** **${formatCash(ctx.cash)}** · **Lifetime msgs:** **${ctx.lifetimeMessages.toLocaleString()}**\n\n` +
              `**Next rebirth (#${nextN})**\n` +
              `• **${formatCash(needCash)}** cash\n` +
              `• **${needMsgs.toLocaleString()}** lifetime messages\n` +
              `• Cooldown: **${cdOk ? "ready" : `<t:${Math.floor((Date.now() + cdLeft) / 1000)}:R>`}**\n\n` +
              `${ready ? "✅ You meet requirements — open **`.rebirth`** and confirm on the last panel." : "🔒 Not ready yet — keep grinding or wait out the cooldown."}\n\n` +
              `_Full guide: **\`.rebirth\`** (paginated menu)._`,
          }),
        ],
      });
      return;
    }

    if (sub === "top") {
      const prisma = getBotPrisma();
      const top = await prisma.economyUser.findMany({
        where: { rebirthCount: { gt: 0 } },
        orderBy: [{ rebirthCount: "desc" }, { discordUserId: "asc" }],
        take: 10,
        select: { discordUserId: true, rebirthCount: true },
      });
      const lines = await Promise.all(
        top.map(async (r, i) => {
          const user = await message.client.users
            .fetch(r.discordUserId)
            .catch(() => null);
          const tag = user?.username ?? r.discordUserId;
          return `**${i + 1}.** ${tag} — **${r.rebirthCount}** rebirths`;
        }),
      );
      await message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x9b59b6)
            .setTitle("♻️ Top rebirths")
            .setDescription(
              lines.length > 0
                ? lines.join("\n")
                : "No rebirths yet — **`.rebirth`** when you are ready.",
            ),
        ],
      });
      return;
    }

    const ctx = await loadRebirthMenuCtx(uid);
    const page = 0;
    await message.reply({
      embeds: [buildRebirthEmbed(page, ctx)],
      components: buildRebirthRows(page, ctx),
    });
  },
};
