import { EmbedBuilder } from "discord.js";
import { getTelegramBotToken } from "../../config";
import { errorEmbed } from "../../lib/embeds";
import type { ArivixCommand } from "../types";

type TgOk<T> = { ok: true; result: T } | { ok: false; description?: string };

type TgChat = {
  id: number;
  type: string;
  title?: string;
  username?: string;
  description?: string;
};

export const telegramCommand: ArivixCommand = {
  name: "telegram",
  aliases: ["tg"],
  description: "Fetch basic public chat info via Telegram Bot API (optional token)",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Lookups.",
    usage: ".telegram @username_or_chat_id",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const token = getTelegramBotToken();
    if (!token) {
      await message.reply({
        embeds: [
          errorEmbed(
            "Telegram lookup is not configured (`TELEGRAM_BOT_TOKEN`) on this bot instance.",
          ),
        ],
      });
      return;
    }

    let handle = args.join(" ").trim().replace(/^@/, "");
    if (!handle) {
      await message.reply({
        embeds: [
          errorEmbed(
            "Usage: **.telegram** `username` or numeric **chat id** (bot must be allowed to see the chat).",
          ),
        ],
      });
      return;
    }

    const idParam = /^-?\d+$/.test(handle) ? handle : `@${handle}`;
    const url = `https://api.telegram.org/bot${token}/getChat?chat_id=${encodeURIComponent(idParam)}`;

    let res: Response;
    try {
      res = await fetch(url);
    } catch {
      await message.reply({
        embeds: [errorEmbed("Could not reach Telegram.")],
      });
      return;
    }

    const body = (await res.json()) as TgOk<TgChat>;
    if (!body.ok) {
      await message.reply({
        embeds: [
          errorEmbed(
            body.description ??
              "Telegram did not return chat info (private chat or bot not a member).",
          ),
        ],
      });
      return;
    }

    const c = body.result;
    const embed = new EmbedBuilder()
      .setColor(0x2aabee)
      .setTitle(c.title ?? c.username ?? `Chat ${c.id}`)
      .addFields(
        { name: "ID", value: `\`${c.id}\``, inline: true },
        { name: "Type", value: c.type, inline: true },
      );

    if (c.username)
      embed.addFields({
        name: "Username",
        value: `@${c.username}`,
        inline: true,
      });
    if (c.description) {
      embed.setDescription(c.description.slice(0, 500));
    }

    await message.reply({ embeds: [embed] });
  },
};
