import { dispatchVoicemaster } from "../../lib/voicemaster/dispatch";
import type { ArivixCommand } from "../types";

export const voicemasterCommand: ArivixCommand = {
  name: "voicemaster",
  aliases: ["vm"],
  description:
    "VoiceMaster — temp voice channels from a hub; panel (lock, ghost, disconnect, limits, rename) plus permit, transfer, etc.",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Quick tools and light fun.",
    usage:
      ".voicemaster setup · panel pages (🔒 lock · 👻 ghost · disconnect menu · ➕ limit · ✏ rename) · .vm join",
    tier: "free",
    style: "prefix",
  },
  async run(ctx) {
    await dispatchVoicemaster(ctx.message, ctx.args);
  },
};
