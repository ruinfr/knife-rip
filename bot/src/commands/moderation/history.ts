import { EmbedBuilder, PermissionFlagsBits } from "discord.js";
import {
  deleteAllCasesForTarget,
  deleteCase,
  findCaseByGuildNum,
  listCasesForTarget,
  listRecentCases,
  sendModLogEmbed,
  updateCaseReason,
} from "../../lib/mod-case/service";
import {
  errorEmbed,
  minimalEmbed,
  missingPermissionEmbed,
} from "../../lib/embeds";
import { resolveModerationMember } from "../../lib/moderation-target";
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

async function requireAdmin(message: import("discord.js").Message) {
  const g = message.guild;
  if (!g)
    return errorEmbed("Use this in a server channel.", { title: "Servers only" });
  const mem =
    message.member ??
    (await g.members.fetch(message.author.id).catch(() => null));
  if (!mem?.permissions.has(PermissionFlagsBits.Administrator)) {
    return missingPermissionEmbed("you", "Administrator");
  }
  return null;
}

async function historyRun(ctx: {
  message: import("discord.js").Message;
  args: string[];
  invokedName: string;
}) {
  const { message, args } = ctx;
  const deny = await requireManageMessages(message);
  if (deny) {
    await message.reply({ embeds: [deny] });
    return;
  }

  const guild = message.guild!;
  const head = args[0]?.toLowerCase();

  if (head === "view") {
    const n = parseInt(args[1] ?? "", 10);
    if (!Number.isFinite(n)) {
      await message.reply({
        embeds: [errorEmbed("Usage: **.history view** `<case #>`")],
      });
      return;
    }
    const c = await findCaseByGuildNum(guild.id, n);
    if (!c) {
      await message.reply({ embeds: [errorEmbed(`No case **#${n}** in this server.`)] });
      return;
    }
    const proofLines =
      c.proofs.length === 0
        ? "_None_"
        : c.proofs
            .map(
              (p, i) =>
                `${i + 1}. ${p.url ? `[link](${p.url})` : "—"} ${p.note ? `— ${p.note}` : ""}`,
            )
            .join("\n");
    await message.reply({
      embeds: [
        minimalEmbed({
          title: `Case #${c.caseNum}`,
          description:
            `**Kind:** ${c.kind}\n**Target:** <@${c.targetUserId}> (${c.targetUserId})\n**Staff:** <@${c.actorUserId}>\n**When:** <t:${Math.floor(c.createdAt.getTime() / 1000)}:F>\n**Reason:** ${c.reason ?? "—"}\n\n**Proofs:**\n${proofLines}`.slice(
              0,
              3900,
            ),
        }),
      ],
    });
    return;
  }

  if (head === "reason") {
    const n = parseInt(args[1] ?? "", 10);
    const newReason = args.slice(2).join(" ").trim();
    if (!Number.isFinite(n) || !newReason) {
      await message.reply({
        embeds: [
          errorEmbed("Usage: **.history reason** `<case #>` `<new reason>`"),
        ],
      });
      return;
    }
    const ok = await updateCaseReason(guild.id, n, newReason);
    await message.reply({
      embeds: [
        minimalEmbed({
          title: ok ? "Updated" : "Not found",
          description: ok
            ? `Case **#${n}** reason updated.`
            : `Case **#${n}** not found.`,
        }),
      ],
    });
    if (ok) {
      await sendModLogEmbed(
        message.client,
        guild.id,
        new EmbedBuilder()
          .setTitle("Case reason edited")
          .setDescription(
            `**Case** #${n} — by ${message.author.tag}\n**New:** ${newReason.slice(0, 500)}`,
          ),
      );
    }
    return;
  }

  if (head === "remove") {
    const sub = args[1]?.toLowerCase();
    if (sub === "all") {
      const adm = await requireAdmin(message);
      if (adm) {
        await message.reply({ embeds: [adm] });
        return;
      }
      const resolved = await resolveModerationMember(message, args.slice(2));
      if (!resolved.ok) {
        await message.reply({ embeds: [resolved.embed] });
        return;
      }
      const n = await deleteAllCasesForTarget(guild.id, resolved.member.id);
      await message.reply({
        embeds: [
          minimalEmbed({
            title: "Cases removed",
            description: `Deleted **${n}** case(s) for **${resolved.member.user.tag}**.`,
          }),
        ],
      });
      return;
    }
    const n = parseInt(args[1] ?? "", 10);
    if (!Number.isFinite(n)) {
      await message.reply({
        embeds: [errorEmbed("Usage: **.history remove** `<case #>` · **remove all** `@user`")],
      });
      return;
    }
    const ok = await deleteCase(guild.id, n);
    await message.reply({
      embeds: [
        minimalEmbed({
          title: ok ? "Removed" : "Not found",
          description: ok
            ? `Case **#${n}** removed.`
            : `Case **#${n}** not found.`,
        }),
      ],
    });
    return;
  }

  if (head === "removeall") {
    const adm = await requireAdmin(message);
    if (adm) {
      await message.reply({ embeds: [adm] });
      return;
    }
    const resolved = await resolveModerationMember(message, args.slice(1));
    if (!resolved.ok) {
      await message.reply({ embeds: [resolved.embed] });
      return;
    }
    const n = await deleteAllCasesForTarget(guild.id, resolved.member.id);
    await message.reply({
      embeds: [
        minimalEmbed({
          title: "Cases removed",
          description: `Deleted **${n}** case(s) for **${resolved.member.user.tag}**.`,
        }),
      ],
    });
    return;
  }

  const resolvedMember = await resolveModerationMember(message, args);
  if (resolvedMember.ok) {
    const rows = await listCasesForTarget(guild.id, resolvedMember.member.id, 20);
    if (rows.length === 0) {
      await message.reply({
        embeds: [
          minimalEmbed({
            title: "History",
            description: `_No cases for **${resolvedMember.member.user.tag}**._`,
          }),
        ],
      });
      return;
    }
    const lines = rows.map(
      (r) =>
        `**#${r.caseNum}** · ${r.kind} — ${(r.reason ?? "—").slice(0, 60)}`,
    );
    await message.reply({
      embeds: [
        minimalEmbed({
          title: `Cases — ${resolvedMember.member.user.tag}`,
          description: lines.join("\n").slice(0, 3900),
        }),
      ],
    });
    return;
  }

  const recent = await listRecentCases(guild.id, 15);
  if (recent.length === 0) {
    await message.reply({
      embeds: [minimalEmbed({ title: "History", description: "_No cases yet._" })],
    });
    return;
  }
  const lines = recent.map(
    (r) =>
      `**#${r.caseNum}** · ${r.kind} · <@${r.targetUserId}> — ${(r.reason ?? "—").slice(0, 40)}`,
  );
  await message.reply({
    embeds: [
      minimalEmbed({
        title: "Recent cases",
        description: lines.join("\n").slice(0, 3900),
      }),
    ],
  });
}

export const historyCommand: KnifeCommand = {
  name: "history",
  aliases: ["modlog", "casehistory"],
  description:
    "Mod case history — list, **view**, **reason**, **remove** — **Manage Messages**; **removeall** = Administrator",
  site: {
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
    usage:
      ".history · .history @user · .history view 5 · .history reason 5 text · .history remove 5 · .history removeall @user",
    tier: "free",
    style: "prefix",
  },
  async run(ctx) {
    await historyRun({ ...ctx, invokedName: "history" });
  },
};

export const caselogCommand: KnifeCommand = {
  name: "caselog",
  aliases: ["case", "cases"],
  description: "Same as **.history** — view and manage case logs",
  site: {
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
    usage: ".caselog (same as .history)",
    tier: "free",
    style: "prefix",
  },
  async run(ctx) {
    await historyRun({ ...ctx, invokedName: "caselog" });
  },
};

export const historyViewCommand: KnifeCommand = {
  name: "historyview",
  aliases: ["caseview"],
  description: "Shorthand: **.history view** `<#>` — **Manage Messages**",
  site: {
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
    usage: ".historyview 12",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    await historyRun({
      message,
      args: ["view", ...args],
      invokedName: "historyview",
    });
  },
};
