import type { Message } from "discord.js";
import { minimalEmbed } from "./embeds";
import { isCommandOwnerBypass } from "./owner-bypass";

const COOLDOWN_MS = 5000;

const lastCommandAt = new Map<string, number>();
/** Throttle countdown replies so spam doesn’t start multiple timers. */
const lastNoticeAt = new Map<string, number>();

/** Seconds left from wall-clock end time (two decimals). */
function formatSecondsLeft(msLeft: number): string {
  const s = Math.max(0, msLeft) / 1000;
  return s.toFixed(2);
}

async function runCooldownCountdown(
  message: Message,
  blockedUntil: number,
): Promise<void> {
  const ms0 = blockedUntil - Date.now();
  const sent = await message
    .reply({
      embeds: [
        minimalEmbed({
          title: "Cooldown",
          description: `**${formatSecondsLeft(ms0)}s** left until you can use commands again.`,
        }),
      ],
    })
    .catch(() => null);

  if (!sent) return;

  const tick = async (): Promise<boolean> => {
    const msLeft = blockedUntil - Date.now();
    if (msLeft <= 0) {
      await sent
        .edit({
          embeds: [
            minimalEmbed({
              title: "Ready",
              description: "You can use commands again.",
            }),
          ],
        })
        .catch(() => {});
      setTimeout(() => void sent.delete().catch(() => {}), 2000);
      return false;
    }

    await sent
      .edit({
        embeds: [
          minimalEmbed({
            title: "Cooldown",
            description: `**${formatSecondsLeft(msLeft)}s** left until you can use commands again.`,
          }),
        ],
      })
      .catch(() => {});
    return true;
  };

  const interval = setInterval(() => {
    void (async () => {
      const cont = await tick();
      if (!cont) {
        clearInterval(interval);
      }
    })();
  }, 1000);
}

/**
 * Per-user cooldown between prefix commands. Returns false if blocked.
 * On block, at most one live countdown per cooldown window (edits every second).
 */
export async function allowPrefixCommand(message: Message): Promise<boolean> {
  const uid = message.author.id;
  if (await isCommandOwnerBypass(uid)) return true;

  const now = Date.now();
  const prev = lastCommandAt.get(uid);

  if (prev !== undefined && now - prev < COOLDOWN_MS) {
    const sinceNotice = now - (lastNoticeAt.get(uid) ?? 0);
    if (sinceNotice >= COOLDOWN_MS) {
      lastNoticeAt.set(uid, now);
      const blockedUntil = prev + COOLDOWN_MS;
      void runCooldownCountdown(message, blockedUntil);
    }
    return false;
  }

  lastCommandAt.set(uid, now);
  return true;
}
