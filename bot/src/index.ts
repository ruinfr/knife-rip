import {
  Client,
  Events,
  GatewayIntentBits,
  Partials,
} from "discord.js";
import { handleVoiceMasterInteraction } from "./lib/voicemaster/interaction-handler";
import { tryExpandGluedVoicemaster } from "./lib/voicemaster/parse-invoke";
import { handleVoiceMasterVoiceState } from "./lib/voicemaster/voice-handler";
import { reconcileOrphanTemps } from "./lib/voicemaster/service";
import { getKnifeRipPrivilegeSyncEnv } from "../../lib/discord-guild-role-sync";
import {
  buildCommandMap,
  syncRegistryToSite,
  warnOnDuplicateCommandTriggers,
} from "./commands";
import { PREFIX, getDiscordToken } from "./config";
import {
  handleAfkAuthorReturn,
  handleAfkMentionReplies,
} from "./lib/afk/message-flow";
import { allowPrefixCommand } from "./lib/command-cooldown";
import { actionableErrorEmbed } from "./lib/embeds";
import { handleEconomyInteraction } from "./lib/economy/interaction-handler";
import { loadEconomyGuildEnvConfig } from "./lib/economy/economy-guild-config";
import { recordEconomyMessageActivity } from "./lib/economy/milestones";
import { handlePollInteraction } from "./lib/poll/interaction-handler";
import {
  reconcileKnifeRipSuspectRoles,
  syncKnifeRipRolesForDiscordUser,
} from "./lib/privilege-role-sync";
import { isGuildAccessBlocked } from "./lib/guild-access";
import { recordGuildCommandAudit } from "./lib/guild-command-audit";
import { isGuildPrefixCommandAllowed } from "./lib/guild-command-rules";
import { getGuildCommandPrefix } from "./lib/guild-prefix";
import { registerSnipeListeners } from "./lib/snipe/events";
import { acquireSingleInstanceLock } from "./lib/single-instance";
import { recordGuildTextMessageForLeaderboard } from "./lib/guild-leaderboards/text-increment";
import { handleGuildVoiceLeaderboardState } from "./lib/guild-leaderboards/voice-track";

acquireSingleInstanceLock();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.Reaction],
});

registerSnipeListeners(client);

const commands = buildCommandMap();
warnOnDuplicateCommandTriggers();

const PRIVILEGE_RECONCILE_MS = 20 * 60 * 1000;

client.once(Events.ClientReady, async (c) => {
  console.log(`Knife ready as ${c.user.tag} — prefix "${PREFIX}"`);
  try {
    await loadEconomyGuildEnvConfig();
    console.log("Economy guild env (tracking + shop) loaded.");
  } catch (e) {
    console.warn("Economy guild env load failed:", e);
  }
  const rip = getKnifeRipPrivilegeSyncEnv();
  if (rip) {
    console.log(
      `Privilege Discord sync: guild ${rip.guildId} (reconcile every ${PRIVILEGE_RECONCILE_MS / 60000} min)`,
    );
  } else {
    console.log(
      "Privilege Discord sync: off — set KNIFE_RIP_GUILD_ID (Pro/Owner/Dev role IDs default to knife.rip hub)",
    );
  }
  try {
    let lastErr: unknown;
    let synced = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await syncRegistryToSite();
        console.log("Command catalog synced to site.");
        synced = true;
        break;
      } catch (e) {
        lastErr = e;
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
    }
    if (!synced && lastErr) throw lastErr;
  } catch (err) {
    console.warn("Command catalog sync failed:", err);
  }

  try {
    await reconcileOrphanTemps(c);
  } catch (e) {
    console.warn("VoiceMaster orphan reconcile failed:", e);
  }

  setInterval(() => {
    reconcileKnifeRipSuspectRoles(c).catch((err) =>
      console.warn("Privilege role reconcile failed:", err),
    );
  }, PRIVILEGE_RECONCILE_MS);
  reconcileKnifeRipSuspectRoles(c).catch((err) =>
    console.warn("Privilege role reconcile failed:", err),
  );
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (
    interaction.guildId &&
    (await isGuildAccessBlocked(interaction.guildId))
  ) {
    return;
  }
  try {
    await handleEconomyInteraction(interaction);
  } catch (err) {
    console.warn("Economy interaction:", err);
  }
  try {
    await handlePollInteraction(interaction);
  } catch (err) {
    console.warn("Poll interaction:", err);
  }
  try {
    await handleVoiceMasterInteraction(interaction);
  } catch (err) {
    console.warn("VoiceMaster interaction:", err);
  }
});

client.on(Events.VoiceStateUpdate, (oldS, newS) => {
  void (async () => {
    const gid = newS.guild?.id ?? oldS.guild?.id;
    if (gid && (await isGuildAccessBlocked(gid))) return;
    handleGuildVoiceLeaderboardState(oldS, newS);
    await handleVoiceMasterVoiceState(client, oldS, newS);
  })();
});

client.on(Events.GuildMemberAdd, (member) => {
  void (async () => {
    if (await isGuildAccessBlocked(member.guild.id)) return;
    const env = getKnifeRipPrivilegeSyncEnv();
    if (env && member.guild.id === env.guildId) {
      void syncKnifeRipRolesForDiscordUser(member.id);
    }
  })();
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  if (
    message.guildId &&
    (await isGuildAccessBlocked(message.guildId))
  ) {
    return;
  }

  recordGuildTextMessageForLeaderboard(message);
  recordEconomyMessageActivity(message);

  await handleAfkAuthorReturn(message);
  await handleAfkMentionReplies(message);

  const content = message.content;
  const effectivePrefix = await getGuildCommandPrefix(message.guildId);
  if (!content.startsWith(effectivePrefix)) return;

  const without = content.slice(effectivePrefix.length).trim();
  if (!without) return;

  const glued = tryExpandGluedVoicemaster(without);
  const [name, ...argParts] = glued
    ? ["voicemaster", ...glued]
    : without.split(/\s+/);
  const commandName = name.toLowerCase();
  const command = commands.get(commandName);
  if (!command) return;

  if (!(await allowPrefixCommand(message))) return;

  const canonicalKey = command.name.toLowerCase();
  if (
    message.guild &&
    !(await isGuildPrefixCommandAllowed(message, canonicalKey))
  ) {
    await message
      .reply({
        embeds: [
          actionableErrorEmbed({
            title: "Command blocked",
            body: "That command is turned off here (server **command** rules). Ask staff if this is a mistake.",
            linkPermissionsDoc: false,
          }),
        ],
      })
      .catch(() => {});
    return;
  }

  try {
    await command.run({
      message,
      args: argParts,
    });
    if (message.guild) {
      recordGuildCommandAudit({
        guildId: message.guild.id,
        actorUserId: message.author.id,
        commandKey: canonicalKey,
        success: true,
      });
    }
  } catch (err) {
    console.error(`Command ${commandName}:`, err);
    if (message.guild) {
      recordGuildCommandAudit({
        guildId: message.guild.id,
        actorUserId: message.author.id,
        commandKey: canonicalKey,
        success: false,
      });
    }
    const description =
      "The command hit an error on our side. Try again in a moment — nothing was saved from your message.";
    const ch = message.channel;
    if (ch.isTextBased()) {
      await ch
        .send({
          embeds: [
            actionableErrorEmbed({
              title: "Command error",
              body: description,
              linkPermissionsDoc: false,
            }),
          ],
        })
        .catch(() => {});
    }
  }
});

const token = getDiscordToken();
client.login(token).catch((e: unknown) => {
  console.error("Failed to log in:", e);
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("disallowed intents")) {
    console.error(
      "\nKnife needs **Message Content** + **Server Members** (Privileged Gateway Intents), and **Guild Message Reactions** for `.rsnipe`.\n" +
        "Discord Developer Portal → your app → Bot → enable intents, save, retry.\n",
    );
  }
  process.exit(1);
});
