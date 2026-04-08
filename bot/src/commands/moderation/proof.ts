import { EmbedBuilder, PermissionFlagsBits } from "discord.js";
import {
  addProof,
  deleteProofByIndex,
  findCaseByGuildNum,
  setProofExplanation,
} from "../../lib/mod-case/service";
import { errorEmbed, minimalEmbed, missingPermissionEmbed } from "../../lib/embeds";
import type { KnifeCommand } from "../types";

async function requireManageMessages(message: import("discord.js").Message) {
  const g = message.guild;
  if (!g)
    return errorEmbed("Use this in a server channel.", { title: "Servers only" });
  const mem =
    message.member ??
    (await g.members.fetch(message.author.id).catch(() => null));
  if (!mem?.permissions.has(PermissionFlagsBits.ManageMessages)) {
    return missingPermissionEmbed("you", "Manage Messages");
  }
  return null;
}

export const proofCommand: KnifeCommand = {
  name: "proof",
  aliases: ["evidence", "caseproof"],
  description: "Attach proof to a mod case — **Manage Messages**",
  site: {
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
    usage:
      ".proof add `<#>` `<url>` [note] · list · view · set · remove `<#>` `<index>`",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const deny = await requireManageMessages(message);
    if (deny) {
      await message.reply({ embeds: [deny] });
      return;
    }

    const guild = message.guild!;
    const sub = args[0]?.toLowerCase() ?? "list";

    if (sub === "list") {
      const n = parseInt(args[1] ?? "", 10);
      if (!Number.isFinite(n)) {
        await message.reply({
          embeds: [errorEmbed("Usage: **.proof list** `<case #>`")],
        });
        return;
      }
      const c = await findCaseByGuildNum(guild.id, n);
      if (!c) {
        await message.reply({ embeds: [errorEmbed("Case not found.")] });
        return;
      }
      const lines =
        c.proofs.length === 0
          ? "_No proofs._"
          : c.proofs
              .map(
                (p, i) =>
                  `**${i + 1}.** ${p.url ?? "—"} ${p.note ? `— ${p.note}` : ""}`,
              )
              .join("\n");
      await message.reply({
        embeds: [
          minimalEmbed({
            title: `Proofs — case #${n}`,
            description: lines.slice(0, 3900),
          }),
        ],
      });
      return;
    }

    if (sub === "view") {
      const n = parseInt(args[1] ?? "", 10);
      if (!Number.isFinite(n)) {
        await message.reply({
          embeds: [errorEmbed("Usage: **.proof view** `<case #>` (= list)")],
        });
        return;
      }
      const c = await findCaseByGuildNum(guild.id, n);
      if (!c) {
        await message.reply({ embeds: [errorEmbed("Case not found.")] });
        return;
      }
      const lines = c.proofs.map(
        (p, i) =>
          `**${i + 1}.** ${p.url ?? "—"} ${p.note ? `\n_${p.note}_` : ""}`,
      );
      await message.reply({
        embeds: [
          minimalEmbed({
            title: `Proofs — case #${n}`,
            description: (lines.join("\n\n") || "_None_").slice(0, 3900),
          }),
        ],
      });
      return;
    }

    if (sub === "add") {
      const n = parseInt(args[1] ?? "", 10);
      const url = args[2]?.trim();
      const noteRest = args.slice(3).join(" ").trim();
      if (!Number.isFinite(n) || !url) {
        await message.reply({
          embeds: [
            errorEmbed("Usage: **.proof add** `<case #>` `<url>` [note]"),
          ],
        });
        return;
      }
      const c = await findCaseByGuildNum(guild.id, n);
      if (!c) {
        await message.reply({ embeds: [errorEmbed("Case not found.")] });
        return;
      }
      await addProof({
        modCaseId: c.id,
        url,
        note: noteRest || undefined,
      });
      await message.reply({
        embeds: [
          minimalEmbed({
            title: "Proof added",
            description: `Case **#${n}** — attachment saved.`,
          }),
        ],
      });
      return;
    }

    if (sub === "set") {
      const n = parseInt(args[1] ?? "", 10);
      const expl = args.slice(2).join(" ").trim();
      if (!Number.isFinite(n) || !expl) {
        await message.reply({
          embeds: [
            errorEmbed("Usage: **.proof set** `<case #>` `<explanation>`"),
          ],
        });
        return;
      }
      const c = await findCaseByGuildNum(guild.id, n);
      if (!c) {
        await message.reply({ embeds: [errorEmbed("Case not found.")] });
        return;
      }
      const ok = await setProofExplanation(c.id, expl);
      await message.reply({
        embeds: [
          minimalEmbed({
            title: ok ? "Updated" : "No proofs",
            description: ok
              ? `Set note on first proof for case **#${n}**.`
              : "Add a proof first.",
          }),
        ],
      });
      return;
    }

    if (sub === "remove") {
      const n = parseInt(args[1] ?? "", 10);
      const idx = parseInt(args[2] ?? "", 10) - 1;
      if (!Number.isFinite(n) || !Number.isFinite(idx) || idx < 0) {
        await message.reply({
          embeds: [
            errorEmbed("Usage: **.proof remove** `<case #>` `<index 1-based>`"),
          ],
        });
        return;
      }
      const c = await findCaseByGuildNum(guild.id, n);
      if (!c) {
        await message.reply({ embeds: [errorEmbed("Case not found.")] });
        return;
      }
      const ok = await deleteProofByIndex(c.id, idx);
      await message.reply({
        embeds: [
          minimalEmbed({
            title: ok ? "Removed" : "Invalid index",
            description: ok
              ? `Removed proof **${idx + 1}** from case **#${n}**.`
              : "That proof index does not exist.",
          }),
        ],
      });
      return;
    }

    await message.reply({
      embeds: [
        errorEmbed(
          "Subcommands: **add**, **list**, **view**, **set**, **remove** — see **.proof** on `/commands`",
        ),
      ],
    });
  },
};
