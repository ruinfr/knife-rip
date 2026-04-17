import { businessKeyEmoji, ecoM } from "../../lib/economy/custom-emojis";
import {
  buildBusinessMenuEmbed,
  buildBusinessMenuRows,
  loadBusinessMenuContext,
  runBusinessBuy,
  runBusinessCollect,
} from "../../lib/economy/business-flow";
import { businessSlotRowToAccrualInput, computeBusinessHourlyRate } from "../../lib/economy/business-accrual";
import {
  BUSINESS_BASE_PRICES,
  BUSINESS_DISPLAY_NAME,
  BUSINESS_KEYS,
  BUSINESS_PURCHASE_TAX_PCT,
  BUSINESS_RATE_PER_HOUR,
  parseBusinessKey,
} from "../../lib/economy/economy-tuning";
import { isGuildTextEconomyChannel } from "../../lib/economy/guild-economy-context";
import { formatCash } from "../../lib/economy/money";
import { getBotPrisma } from "../../lib/db-prisma";
import { errorEmbed, minimalEmbed } from "../../lib/embeds";
import type { ArivixCommand } from "../types";

function taxOnPurchaseBase(base: bigint): bigint {
  return (base * BigInt(BUSINESS_PURCHASE_TAX_PCT) + 99n) / 100n;
}

export const businessCommand: ArivixCommand = {
  name: "business",
  aliases: ["biz", "franchise"],
  description:
    "Passive Arivix Cash businesses — **`.business`** menu, **`.business buy`**, **`.business collect`**, **`.business list`**",
  site: {
    categoryId: "gambling",
    categoryTitle: "Gambling & economy",
    categoryDescription:
      "Global Arivix Cash — .gamble hub, shop, daily, work/crime/beg, bank & businesses, gathering (.mine / .fish), pets, pay, and guild .rob / .duel / .bounty. Virtual currency for fun.",
    usage:
      ".business · .biz · .business list · .business buy <id> · .business collect",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    if (!isGuildTextEconomyChannel(message)) {
      await message.reply({
        embeds: [
          errorEmbed(
            "Run **`.business`** in a **server text channel** (not DMs).",
          ),
        ],
      });
      return;
    }

    const uid = message.author.id;
    const prisma = getBotPrisma();
    const now = Date.now();
    const sub = args[0]?.toLowerCase();

    if (!sub || sub === "menu") {
      try {
        await prisma.economyUser.upsert({
          where: { discordUserId: uid },
          create: { discordUserId: uid },
          update: {},
        });
        const ctx = await loadBusinessMenuContext(uid);
        const embed = await buildBusinessMenuEmbed(ctx);
        await message.reply({
          content: `<@${uid}>`,
          embeds: [embed],
          components: buildBusinessMenuRows(ctx),
          allowedMentions: { users: [uid] },
        });
      } catch {
        await message.reply({
          embeds: [
            errorEmbed(
              "Business menu could not load (database or migration). Ask an admin to run **Prisma migrations** and restart the bot.",
              { title: "Can't open businesses" },
            ),
          ],
        });
      }
      return;
    }

    if (sub === "list") {
      const slots = await prisma.economyBusinessSlot.findMany({
        where: { ownerId: uid },
      });
      const lines = BUSINESS_KEYS.map((k) => {
        const slot = slots.find((s) => s.businessKey === k);
        const base = BUSINESS_BASE_PRICES[k];
        const tax = taxOnPurchaseBase(base);
        const total = base + tax;
        const rate = BUSINESS_RATE_PER_HOUR[k];
        const name = BUSINESS_DISPLAY_NAME[k];
        const em = businessKeyEmoji(k);
        return slot
          ? `${em} **${name}** — tier **${slot.tier}** · **${formatCash(computeBusinessHourlyRate(k, businessSlotRowToAccrualInput(slot)))}**/h (tracks) · collected <t:${Math.floor(slot.lastCollectedAt.getTime() / 1000)}:R>`
          : `${em} **${name}** — _not owned_ · buy **${formatCash(base)}** + **${formatCash(tax)}** tax = **${formatCash(total)}** · **${formatCash(rate)}**/h @ tier 1`;
      });
      await message.reply({
        embeds: [
          minimalEmbed({
            title: `${ecoM.lemonade} ${ecoM.arcade} ${ecoM.diner} Arivix Cash — business catalog`,
            description:
              lines.join("\n") +
              `\n\n_Buy **in order** along the track. Run **\`.business\`** for the interactive menu. Accrues up to **48h** per collect._`,
          }),
        ],
      });
      return;
    }

    if (sub === "buy") {
      const keyRaw = args[1]?.toLowerCase();
      const parsedKey = keyRaw ? parseBusinessKey(keyRaw) : null;
      if (!parsedKey) {
        await message.reply({
          embeds: [
            errorEmbed(
              `Specify a business id:\n\n${BUSINESS_KEYS.map((k) => {
                const base = BUSINESS_BASE_PRICES[k];
                const tax = taxOnPurchaseBase(base);
                return `\`${k}\` — ${businessKeyEmoji(k)} **${BUSINESS_DISPLAY_NAME[k]}** — **${formatCash(base + tax)}** total`;
              }).join("\n")}\n\n_Use **\`.business\`** to see which one you can buy next._`,
            ),
          ],
        });
        return;
      }

      try {
        const res = await runBusinessBuy(uid, now, parsedKey);

        await message.reply({
          embeds: [
            minimalEmbed({
              title: `${businessKeyEmoji(parsedKey)} ${BUSINESS_DISPLAY_NAME[parsedKey]} — purchased`,
              description:
                `You bought **${BUSINESS_DISPLAY_NAME[parsedKey]}** for **${formatCash(res.price)}** + **${formatCash(res.tax)}** tax.\n` +
                `**${formatCash(BUSINESS_RATE_PER_HOUR[parsedKey])}**/h at tier 1 · Balance: **${formatCash(res.cashAfter)}**.`,
            }),
          ],
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "";
        if (msg === "ORDER") {
          await message.reply({
            embeds: [
              errorEmbed(
                "Buy franchises **in order** — open **`.business`** for the next available site.",
              ),
            ],
          });
          return;
        }
        if (msg === "OWNED") {
          await message.reply({
            embeds: [errorEmbed("You already own that business.")],
          });
          return;
        }
        if (msg === "POOR") {
          const base = BUSINESS_BASE_PRICES[parsedKey];
          const tax = taxOnPurchaseBase(base);
          await message.reply({
            embeds: [
              errorEmbed(
                `Need **${formatCash(base + tax)}** cash (${formatCash(base)} + ${formatCash(tax)} tax) for **${BUSINESS_DISPLAY_NAME[parsedKey]}**.`,
              ),
            ],
          });
          return;
        }
        throw e;
      }
      return;
    }

    if (sub === "collect") {
      try {
        const member =
          message.member ??
          (await message.guild!.members.fetch(uid).catch(() => null));
        const { total, lines } = await runBusinessCollect(uid, now, member);

        await message.reply({
          embeds: [
            minimalEmbed({
              title: `${ecoM.diner} Business income`,
              description:
                total > 0n
                  ? `Collected **${formatCash(total)}**.\n${lines.join("\n")}`
                  : "Nothing accrued yet — wait a bit and try again.",
            }),
          ],
        });
      } catch (e) {
        throw e;
      }
      return;
    }

    await message.reply({
      embeds: [
        errorEmbed(
          "Unknown subcommand. Use **`.business`**, **`.business list`**, **`.business buy <id>`**, or **`.business collect`**.",
        ),
      ],
    });
  },
};
