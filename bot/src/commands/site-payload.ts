/** Mirrors site `CommandCategory` / `BotCommand` for the internal POST body. */

export type SiteBotCommand = {
  name: string;
  description: string;
  usage?: string;
  tier?: "free" | "pro";
  style?: "prefix" | "slash";
  /** Without leading dot; same handler as `name`. */
  aliases?: string[];
  developerOnly?: boolean;
};

export type CommandCategoryShape = {
  id: string;
  title: string;
  description: string;
  commands: SiteBotCommand[];
};
