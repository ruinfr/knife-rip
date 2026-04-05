import { type Client, parseEmoji } from "discord.js";
import { errorEmbed, minimalEmbed } from "../../lib/embeds";
import type { KnifeCommand } from "../types";

function extractEmojiRaw(args: string[], messageContent: string): string | null {
  const joined = args.join(" ").trim();
  const fromArgs = joined.match(/<a?:\w+:\d{17,20}>/);
  if (fromArgs) return fromArgs[0];
  const idOnly = joined.match(/^\d{17,20}$/);
  if (idOnly) return idOnly[0];
  const fromMessage = messageContent.match(/<a?:\w+:\d{17,20}>/);
  if (fromMessage) return fromMessage[0];
  return null;
}

function emojiCdnUrl(id: string, animated: boolean): string {
  const ext = animated ? "gif" : "png";
  return `https://cdn.discordapp.com/emojis/${id}.${ext}?size=256`;
}

function resolveAnimatedFromCache(
  client: Client,
  id: string,
): { animated: boolean; name: string } {
  let animated = false;
  let name = "emoji";
  for (const g of client.guilds.cache.values()) {
    const e = g.emojis.cache.get(id);
    if (e) {
      name = e.name ?? name;
      animated = e.animated;
      break;
    }
  }
  return { animated, name };
}

export const emojiCommand: KnifeCommand = {
  name: "emoji",
  aliases: ["e"],
  description: "Show a custom emoji at full size (paste <:name:id> or use numeric ID)",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Quick tools and light fun.",
    usage: ".emoji <:name:id> · .emoji 123456789012345678",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const raw = extractEmojiRaw(args, message.content);
    if (!raw) {
      await message.reply({
        embeds: [
          errorEmbed(
            "Usage: **.emoji** `<:name:id>` or **.emoji** `numeric_id`\n" +
              "Tip: paste the emoji from your server’s picker.",
          ),
        ],
      });
      return;
    }

    let id: string;
    let name = "emoji";
    let animated = false;

    if (/^\d{17,20}$/.test(raw)) {
      id = raw;
      const resolved = resolveAnimatedFromCache(message.client, id);
      name = resolved.name;
      animated = resolved.animated;
    } else {
      const parsed = parseEmoji(raw);
      if (!parsed?.id) {
        await message.reply({
          embeds: [errorEmbed("Could not parse that emoji.")],
        });
        return;
      }
      id = parsed.id;
      name = parsed.name ?? name;
      animated = Boolean(parsed.animated);
    }

    const url = emojiCdnUrl(id, animated);

    await message.reply({
      embeds: [
        minimalEmbed({
          title: `:${name}:`,
          description: `**ID:** \`${id}\`\n**[Open image](${url})**`,
          imageUrl: url,
        }),
      ],
    });
  },
};
