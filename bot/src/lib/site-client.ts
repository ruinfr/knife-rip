import { getBotInternalSecret, getSiteApiBase } from "../config";

export type EntitlementResponse = {
  premium: boolean;
  owner: boolean;
  discordUserId: string;
};

const entitlementCache = new Map<
  string,
  { data: EntitlementResponse; exp: number }
>();
const ENTITLEMENT_TTL_MS = 12_000;

export function invalidateEntitlementCache(discordUserId: string): void {
  entitlementCache.delete(discordUserId);
}

/**
 * Ask the site for Pro + owner flags (static lists + DB handouts + Stripe).
 * Uses GET /api/internal/entitlement — same secret as command sync.
 */
export async function fetchEntitlementFromSite(
  discordUserId: string,
  opts?: { bypassCache?: boolean },
): Promise<EntitlementResponse> {
  const secret = getBotInternalSecret();
  if (!secret) {
    throw new Error(
      "BOT_INTERNAL_SECRET is not set — add it to .env for site-linked checks",
    );
  }

  const now = Date.now();
  if (!opts?.bypassCache) {
    const hit = entitlementCache.get(discordUserId);
    if (hit && hit.exp > now) {
      return hit.data;
    }
  }

  const base = getSiteApiBase();
  const url = new URL("/api/internal/entitlement", `${base}/`);
  url.searchParams.set("discord_user_id", discordUserId);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${secret}` },
  });

  if (res.status === 503) {
    throw new Error(
      "Site entitlement API unavailable (BOT_INTERNAL_SECRET not configured on server)",
    );
  }
  if (res.status === 401) {
    throw new Error(
      "Entitlement API rejected token — check BOT_INTERNAL_SECRET matches site .env",
    );
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Entitlement API ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as EntitlementResponse;
  const normalized: EntitlementResponse = {
    premium: Boolean(data.premium),
    owner: Boolean(data.owner),
    discordUserId: data.discordUserId ?? discordUserId,
  };

  entitlementCache.set(discordUserId, {
    data: normalized,
    exp: now + ENTITLEMENT_TTL_MS,
  });

  return normalized;
}

/** @deprecated Prefer {@link fetchEntitlementFromSite} for owner checks. */
export async function fetchPremiumFromSite(
  discordUserId: string,
): Promise<boolean> {
  const { premium } = await fetchEntitlementFromSite(discordUserId);
  return premium;
}

export async function postHandoutToSite(body: {
  actorDiscordId: string;
  targetDiscordId: string;
  kind: "OWNER" | "PREMIUM";
}): Promise<void> {
  const secret = getBotInternalSecret();
  if (!secret) {
    throw new Error("BOT_INTERNAL_SECRET is not set");
  }

  const base = getSiteApiBase();
  const url = new URL("/api/internal/handout", `${base}/`);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify(body),
  });

  if (res.status === 503) {
    throw new Error("Handout API unavailable on site");
  }
  if (res.status === 401) {
    throw new Error("Handout API rejected token");
  }
  if (res.status === 403) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(j.error ?? "Forbidden — you are not a bot owner");
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Handout API ${res.status}: ${text.slice(0, 200)}`);
  }
}

/**
 * Push the public command list to the site (POST /api/internal/commands).
 * No-op if BOT_INTERNAL_SECRET is unset.
 */
export async function postCommandRegistry(payload: object): Promise<void> {
  const secret = getBotInternalSecret();
  if (!secret) {
    console.warn(
      "BOT_INTERNAL_SECRET not set — skipping command catalog sync to site",
    );
    return;
  }

  const base = getSiteApiBase();
  const url = new URL("/api/internal/commands", `${base}/`);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify(payload),
  });

  if (res.status === 503) {
    throw new Error(
      "Command registry API unavailable (BOT_INTERNAL_SECRET missing on site)",
    );
  }
  if (res.status === 401) {
    throw new Error(
      "Command registry rejected token — BOT_INTERNAL_SECRET must match site .env",
    );
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Command registry sync failed ${res.status}: ${text.slice(0, 300)}`,
    );
  }
}
