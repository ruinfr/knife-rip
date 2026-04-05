import {
  Client,
  Events,
  GatewayIntentBits,
  Partials,
} from "discord.js";
import { buildCommandMap, syncRegistryToSite } from "./commands";
import { PREFIX, getDiscordToken } from "./config";
import {
  clearAfkOnAuthorMessage,
  notifyAfkMentions,
} from "./lib/afk";
import { allowPrefixCommand } from "./lib/command-cooldown";
import { errorEmbed } from "./lib/embeds";
import { acquireSingleInstanceLock } from "./lib/single-instance";

acquireSingleInstanceLock();

const commands = buildCommandMap();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

client.once(Events.ClientReady, async (c) => {
  console.log(`Knife ready as ${c.user.tag} — prefix "${PREFIX}"`);
  try {
    await syncRegistryToSite();
    console.log("Command catalog synced to site.");
  } catch (err) {
    console.warn("Command catalog sync failed:", err);
  }
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  clearAfkOnAuthorMessage(message);
  await notifyAfkMentions(message);

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
      "\nKnife needs Message Content Intent for prefix commands.\n" +
        "Discord Developer Portal → your app → Bot → Privileged Gateway Intents →\n" +
        "enable “Message Content Intent”, save, then run the bot again.\n",
    );
  }
  process.exit(1);
});
