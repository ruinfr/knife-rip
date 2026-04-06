import {
  Client,
  Events,
  GatewayIntentBits,
  Partials,
} from "discord.js";
import { getKnifeRipPrivilegeSyncEnv } from "../../lib/discord-guild-role-sync";
import { buildCommandMap, syncRegistryToSite } from "./commands";
import { PREFIX, getDiscordToken } from "./config";
import {
  handleAfkAuthorReturn,
  handleAfkMentionReplies,
} from "./lib/afk/message-flow";
import { allowPrefixCommand } from "./lib/command-cooldown";
import { errorEmbed } from "./lib/embeds";
import {
  reconcileKnifeRipSuspectRoles,
  syncKnifeRipRolesForDiscordUser,
} from "./lib/privilege-role-sync";
import { acquireSingleInstanceLock } from "./lib/single-instance";
import { handleBoundChannelTtsMessage } from "./lib/vc-tts/message-handler";

acquireSingleInstanceLock();

const commands = buildCommandMap();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

const PRIVILEGE_RECONCILE_MS = 20 * 60 * 1000;

client.once(Events.ClientReady, async (c) => {
  console.log(`Knife ready as ${c.user.tag} — prefix "${PREFIX}"`);
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
    await syncRegistryToSite();
    console.log("Command catalog synced to site.");
  } catch (err) {
    console.warn("Command catalog sync failed:", err);
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

client.on(Events.GuildMemberAdd, (member) => {
  const env = getKnifeRipPrivilegeSyncEnv();
  if (env && member.guild.id === env.guildId) {
    void syncKnifeRipRolesForDiscordUser(member.id);
  }
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  await handleAfkAuthorReturn(message);
  await handleAfkMentionReplies(message);

  if (handleBoundChannelTtsMessage(message)) {
    return;
  }

  const content = message.content;
  if (!content.startsWith(PREFIX)) return;

  const without = content.slice(PREFIX.length).trim();
  if (!without) return;

  const [name, ...argParts] = without.split(/\s+/);
  const commandName = name.toLowerCase();
  const command = commands.get(commandName);
  if (!command) return;

  if (!(await allowPrefixCommand(message))) return;

  try {
    await command.run({
      message,
      args: argParts,
    });
  } catch (err) {
    console.error(`Command ${commandName}:`, err);
    const description =
      "Something went wrong running that command. Try again in a moment.";
    const ch = message.channel;
    if (ch.isTextBased()) {
      await ch
        .send({ embeds: [errorEmbed(description)] })
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
      "\nKnife needs privileged intents: **Message Content** (prefix commands) and\n" +
        "**Server Members** (knife.rip Pro/owner role sync on join).\n" +
        "Discord Developer Portal → your app → Bot → Privileged Gateway Intents → enable both, save, retry.\n",
    );
  }
  process.exit(1);
});
