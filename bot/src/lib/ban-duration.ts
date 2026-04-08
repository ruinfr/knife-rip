/** Tempban scheduling — longer cap than communication disable. */
export const MAX_SCHEDULED_BAN_MS = 366 * 24 * 60 * 60 * 1000;

export function parseScheduledBanMs(raw: string): number | null {
  const t = raw.trim().toLowerCase();
  const m = /^(\d+)\s*([smhdw])?$/i.exec(t);
  if (!m) return null;
  const n = parseInt(m[1]!, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  const unit = (m[2] ?? "m").toLowerCase();
  let ms: number;
  switch (unit) {
    case "s":
      ms = n * 1000;
      break;
    case "m":
      ms = n * 60 * 1000;
      break;
    case "h":
      ms = n * 60 * 60 * 1000;
      break;
    case "d":
      ms = n * 24 * 60 * 60 * 1000;
      break;
    case "w":
      ms = n * 7 * 24 * 60 * 60 * 1000;
      break;
    default:
      return null;
  }
  return Math.min(ms, MAX_SCHEDULED_BAN_MS);
}
