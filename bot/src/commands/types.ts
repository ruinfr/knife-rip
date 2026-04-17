import type { Message } from "discord.js";

export type CommandContext = {
  message: Message;
  args: string[];
};

/** Metadata sent to the site (omit to keep a command off the public list). */
export type ArivixCommandSite = {
  categoryId: string;
  categoryTitle: string;
  categoryDescription: string;
  usage?: string;
  tier?: "free" | "pro";
  /** Default: prefix (`.`). */
  style?: "prefix" | "slash";
  /** Listed on /commands with a Developer tag (bot owner–only commands). */
  developerOnly?: boolean;
};

export type ArivixCommand = {
  /** Trigger without prefix, e.g. `ping` for `.ping` */
  name: string;
  /** Extra triggers, e.g. `h` for `.h` → same handler as `help`. */
  aliases?: string[];
  description: string;
  /** If set, included in the catalog POSTed to the site. */
  site?: ArivixCommandSite;
  run(ctx: CommandContext): Promise<void>;
};
