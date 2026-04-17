import { existsSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import { resolve } from "path";

const LOCK_NAME = ".arivix-bot.lock";

/** `bot/` directory — lock path does not depend on `process.cwd()` (restarts & PM2 cwd-safe). */
const BOT_PACKAGE_ROOT = resolve(__dirname, "..", "..");

/**
 * Exit if another local process already holds the lock (same machine).
 * Prevents duplicate replies when two terminals run the bot with the same token.
 */
export function acquireSingleInstanceLock(): void {
  if (
    process.env.ARIVIX_BOT_DISABLE_SINGLE_INSTANCE_LOCK === "1" ||
    process.env.KNIFE_BOT_DISABLE_SINGLE_INSTANCE_LOCK === "1"
  ) {
    return;
  }

  const lockPath = resolve(BOT_PACKAGE_ROOT, LOCK_NAME);

  if (existsSync(lockPath)) {
    try {
      const raw = readFileSync(lockPath, "utf8").trim();
      const pid = Number(raw);
      if (Number.isFinite(pid) && pid > 0) {
        try {
          process.kill(pid, 0);
          console.error(
            `Arivix bot is already running (PID ${pid}). Stop the other terminal or process, then try again.\n` +
              `Lock file: ${lockPath}`,
          );
          process.exit(1);
        } catch {
          /* stale lock — process gone */
        }
      }
    } catch {
      /* ignore read errors */
    }
    try {
      unlinkSync(lockPath);
    } catch {
      /* ignore */
    }
  }

  writeFileSync(lockPath, String(process.pid), "utf8");

  const release = () => {
    try {
      unlinkSync(lockPath);
    } catch {
      /* ignore */
    }
  };

  process.on("exit", release);
  process.on("SIGINT", () => {
    release();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    release();
    process.exit(0);
  });
}
