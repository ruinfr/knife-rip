import { describeDuration } from "../../lib/moderation-duration";
import {
  MAX_PENDING_PER_USER,
  MAX_REMIND_DELAY_MS,
  MIN_SCHEDULE_GAP_MS,
  cancelAllReminders,
  cancelReminder,
  countPending,
  listPending,
  markScheduled,
  parseRemindDelay,
  scheduleGapOk,
  scheduleReminder,
  userCanUseRemind,
} from "../../lib/remind/service";
import { errorEmbed, minimalEmbed } from "../../lib/embeds";
import type { KnifeCommand } from "../types";

const MAX_TEXT = 350;

/** Skip noisy probe DM after we’ve confirmed once this process */
const dmReachable = new Set<string>();

export const remindCommand: KnifeCommand = {
  name: "remind",
  aliases: ["reminder", "remindme"],
  description:
    "Knife Pro — schedule a personal reminder (DM); rate-limited; max 7 days ahead",
  site: {
    categoryId: "pro",
    categoryTitle: "Pro",
    categoryDescription: "Knife Pro billing and perks.",
    usage:
      ".remind 15m text · .remind list · .remind cancel [id|all]",
    tier: "pro",
    style: "prefix",
  },
  async run({ message, args }) {
    const access = await userCanUseRemind(message.author.id);
    if (!access.ok) {
      await message.reply({
        embeds: [errorEmbed(access.reason ?? "Knife Pro required.")],
      });
      return;
    }

    const sub = args[0]?.toLowerCase();

    if (sub === "list") {
      const pending = listPending(message.author.id);
      if (pending.length === 0) {
        await message.reply({
          embeds: [
            minimalEmbed({
              title: "Reminders",
              description: "You have **no** pending reminders.",
            }),
          ],
        });
        return;
      }
      const lines = pending.map((r) => {
        const left = Math.max(0, r.firesAt - Date.now());
        return `\`${r.id}\` · **${describeDuration(left)}** — ${r.text.slice(0, 80)}${r.text.length > 80 ? "…" : ""}`;
      });
      await message.reply({
        embeds: [
          minimalEmbed({
            title: "Pending reminders",
            description: lines.join("\n").slice(0, 3900),
          }),
        ],
      });
      return;
    }

    if (sub === "cancel" || sub === "remove") {
      const rawCancel = args[1]?.trim();
      const idOrAll = rawCancel?.toLowerCase();
      if (!idOrAll || idOrAll === "all") {
        const n = cancelAllReminders(message.author.id);
        await message.reply({
          embeds: [
            minimalEmbed({
              title: "Reminders",
              description:
                n === 0
                  ? "Nothing to cancel."
                  : `Cancelled **${n}** reminder(s).`,
            }),
          ],
        });
        return;
      }
      const ok = cancelReminder(message.author.id, idOrAll);
      await message.reply({
        embeds: [
          minimalEmbed({
            title: "Reminders",
            description: ok
              ? `Cancelled \`${idOrAll}\`.`
              : `No reminder \`${idOrAll}\` — use **.remind list**.`,
          }),
        ],
      });
      return;
    }

    const durRaw = args[0]?.trim();
    const text = args
      .slice(1)
      .join(" ")
      .trim()
      .slice(0, MAX_TEXT);

    if (!durRaw || !text) {
      await message.reply({
        embeds: [
          errorEmbed(
            "**Usage:** `.remind` `15m` `your note…` — units **s m h d w**, bare number = minutes.\n" +
              `Max **${describeDuration(MAX_REMIND_DELAY_MS)}** ahead · min **30s** · up to **${MAX_PENDING_PER_USER}** pending · **.remind list** / **.remind cancel**`,
          ),
        ],
      });
      return;
    }

    const delay = parseRemindDelay(durRaw);
    if (delay == null) {
      await message.reply({
        embeds: [
          errorEmbed(
            "Invalid time — use e.g. `90`, `5m`, `2h` (minimum **30s**, max **7 days**).",
          ),
        ],
      });
      return;
    }

    if (countPending(message.author.id) >= MAX_PENDING_PER_USER) {
      await message.reply({
        embeds: [
          errorEmbed(
            `You already have **${MAX_PENDING_PER_USER}** pending reminders — **.remind cancel all** or wait for one to fire.`,
          ),
        ],
      });
      return;
    }

    if (!scheduleGapOk(message.author.id)) {
      await message.reply({
        embeds: [
          errorEmbed(
            `Slow down — wait **${Math.ceil(MIN_SCHEDULE_GAP_MS / 1000)}s** between scheduling new reminders.`,
          ),
        ],
      });
      return;
    }

    if (!dmReachable.has(message.author.id)) {
      try {
        await message.author.send({
          content:
            "🔔 **Knife reminders** will arrive here. You can delete this message.",
        });
        dmReachable.add(message.author.id);
      } catch {
        await message.reply({
          embeds: [
            errorEmbed(
              "I can’t DM you — enable **Allow direct messages** from this server (Privacy → Direct Messages) or open a DM with the bot, then try again.",
            ),
          ],
        });
        return;
      }
    }

    const entry = scheduleReminder(message.client, message.author.id, delay, text);
    markScheduled(message.author.id);

    await message.reply({
      embeds: [
        minimalEmbed({
          title: "Reminder set",
          description:
            `**In ${describeDuration(delay)}** you’ll get a DM:\n${text}\n\n` +
            `**ID:** \`${entry.id}\` · **.remind cancel ${entry.id}** to abort`,
        }),
      ],
    });
  },
};

export const remindersCommand: KnifeCommand = {
  ...remindCommand,
  name: "reminders",
  aliases: undefined,
  description:
    "Same as **.remind** — Pro — list / cancel (or **remove**) / schedule",
  site: remindCommand.site
    ? { ...remindCommand.site, usage: ".reminders (same as .remind)" }
    : undefined,
};
