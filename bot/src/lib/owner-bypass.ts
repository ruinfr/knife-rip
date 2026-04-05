/**
 * Full bot bypass: no command cooldown, permission checks like `.say` admin/Pro.
 * Keep in sync with site `lib/premium.ts` → `PREMIUM_BYPASS_DISCORD_IDS`.
 */
const COMMAND_OWNER_BYPASS_DISCORD_IDS = new Set<string>([
  "1462526622648373312",
]);

export function isCommandOwnerBypass(userId: string): boolean {
  return COMMAND_OWNER_BYPASS_DISCORD_IDS.has(userId);
}
