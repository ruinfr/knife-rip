import { getGuildCommandPrefix } from "../../lib/guild-prefix";
import { errorEmbed, minimalEmbed } from "../../lib/embeds";
import { userCanUseArivixProFeatures } from "../../lib/pro-entitlement";
import { runVanityDropForUser, runVanitySearchForUser } from "../../lib/vanity/user-actions";
import type { ArivixCommand } from "../types";

async function firstTokenAfterPrefix(message: {
  content: string;
  guildId: string | null;
}): Promise<string> {
  const prefix = await getGuildCommandPrefix(message.guildId);
  const rest = message.content.trimStart();
  if (!rest.toLowerCase().startsWith(prefix.toLowerCase())) return "";
  const after = rest.slice(prefix.length).trim();
  return after.split(/\s+/)[0]?.toLowerCase() ?? "";
}

export const vanityCommand: ArivixCommand = {
  name: "vanity",
  aliases: ["vanities"],
  description:
    "Arivix Pro — look up a discord.gg slug or browse recently released dictionary codes (from background scans)",
  site: {
    categoryId: "pro",
    categoryTitle: "Pro",
    categoryDescription: "Arivix Pro billing and perks.",
    usage: ".vanity search <code> · .vanity drop · .vanities",
    tier: "pro",
    style: "prefix",
  },
  async run({ message, args }) {
    const access = await userCanUseArivixProFeatures(message.author.id, {
      commandLabel: ".vanity",
    });
    if (!access.ok) {
      await message.reply({
        embeds: [errorEmbed(access.reason ?? "Arivix Pro required.")],
      });
      return;
    }

    const head = await firstTokenAfterPrefix(message);
    const sub = args[0]?.toLowerCase();

    const wantDrop =
      head === "vanities" ||
      sub === "drop" ||
      sub === "list" ||
      sub === "recent";

    if (wantDrop) {
      await message.reply(await runVanityDropForUser(message.author));
      return;
    }

    if (sub === "search") {
      const joined = args.slice(1).join(" ").trim();
      if (!joined) {
        await message.reply({
          embeds: [
            errorEmbed(
              "Usage: **.vanity search** `code` or `https://discord.gg/…`",
            ),
          ],
        });
        return;
      }
      const result = await runVanitySearchForUser(
        message.client,
        message.author,
        joined,
      );
      if (!result.ok) {
        await message.reply({ embeds: [errorEmbed(result.message)] });
        return;
      }
      await message.reply({ embeds: result.embeds });
      return;
    }

    await message.reply({
      embeds: [
        minimalEmbed({
          title: "Vanity",
          description:
            "**Arivix Pro** — track dictionary slugs against Discord invites.\n\n" +
            "• **.vanity search** `code` — one slug lookup\n" +
            "• **.vanity drop** — recent releases (paginate with buttons)\n" +
            "• **.vanities** — same as **drop** (recent list)\n\n" +
            "_Background scans need **`VANITY_SCANNER_ENABLED=1`** in the bot environment._",
        }),
      ],
    });
  },
};
