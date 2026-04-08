import { EmbedBuilder, type Message } from "discord.js";
import {
  applyKnifeEmbedPlaceholders,
  parseKnifeEmbedScript,
  splitKnifeEmbedScript,
} from "../../../lib/embed-script";
import { buildPlaceholderContextFromMessage } from "./placeholder-context";

export { buildPlaceholderContextFromMessage };

export type ResolvedChannelPayload =
  | {
      ok: true;
      content?: string;
      embeds?: EmbedBuilder[];
      warnings: string[];
    }
  | { ok: false; error: string };

const MAX_CONTENT = 2000;

export function resolveChannelMessagePayload(
  message: Message,
  rawText: string,
): ResolvedChannelPayload {
  const t = rawText.trim();
  if (!t) return { ok: false, error: "Message is empty." };

  const ctx = buildPlaceholderContextFromMessage(message);
  const expanded = applyKnifeEmbedPlaceholders(t, ctx);
  const { content, embedSegment } = splitKnifeEmbedScript(expanded);

  if (!embedSegment) {
    const c =
      expanded.length > MAX_CONTENT
        ? expanded.slice(0, MAX_CONTENT)
        : expanded;
    return { ok: true, content: c, warnings: [] };
  }

  const parsed = parseKnifeEmbedScript(embedSegment);
  if (parsed.error) {
    return { ok: false, error: parsed.error };
  }

  const body =
    content.length > MAX_CONTENT ? content.slice(0, MAX_CONTENT) : content;

  try {
    const embed = new EmbedBuilder(parsed.embed as never);
    return {
      ok: true,
      content: body || undefined,
      embeds: [embed],
      warnings: parsed.warnings,
    };
  } catch {
    return { ok: false, error: "Could not build embed from script." };
  }
}
