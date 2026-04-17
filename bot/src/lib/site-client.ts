import { getBotInternalSecret, getSiteApiBase } from "../config";

function isUnreachableSiteError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  if (/fetch failed/i.test(err.message)) return true;
  const c = err.cause;
  if (c instanceof Error) {
    if (/ECONNREFUSED|ENOTFOUND|ETIMEDOUT|ECONNRESET/i.test(c.message))
      return true;
  }
  if (
    c &&
    typeof c === "object" &&
    "code" in c &&
    typeof (c as { code: unknown }).code === "string"
  ) {
    const code = (c as { code: string }).code;
    if (
      code === "ECONNREFUSED" ||
      code === "ENOTFOUND" ||
      code === "ETIMEDOUT"
    ) {
      return true;
    }
  }
  const cause = err.cause;
  if (typeof AggregateError !== "undefined" && cause instanceof AggregateError) {
    if (
      cause.errors?.some(
        (x) =>
          x &&
          typeof x === "object" &&
          "code" in x &&
          (x as NodeJS.ErrnoException).code === "ECONNREFUSED",
      )
    ) {
      return true;
    }
  }
  return false;
}

function siteUnreachableMessage(): string {
  const base = getSiteApiBase();
  return (
    `The bot could not reach **${base}** (connection failed — often **localhost** with no site running).\n\n` +
    `**Fix:** In the bot’s \`.env\` set **SITE_API_BASE_URL** to your **live** site (e.g. \`https://arivix.org\`) — same URL as production. ` +
    `**BOT_INTERNAL_SECRET** must match the site. **.handout** calls the Next.js API; it won’t work until the site is reachable.`
  );
}

/** Wraps fetch so ECONNREFUSED / “fetch failed” becomes a clear setup hint. */
async function siteFetch(
  url: string | URL,
  init?: RequestInit,
): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (e) {
    if (isUnreachableSiteError(e)) {
      throw new Error(siteUnreachableMessage());
    }
    throw e;
  }
}

export type EntitlementResponse = {
  premium: boolean;
  owner: boolean;
  developer: boolean;
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

  const res = await siteFetch(url, {
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
    developer: Boolean(data.developer),
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

/** Mirrors site `ArivixRipDiscordRoleSyncReport` — handout response after DB write. */
export type HandoutRoleSync = {
  state: "disabled" | "applied" | "no_change" | "not_member" | "error";
  detail?: string;
};

export type HandoutApiResult = {
  ok: boolean;
  action: "add" | "remove";
  removed?: boolean;
  removedFromDatabase?: boolean;
  revokedBootstrapOwner?: boolean;
  bootstrapRevoke?: "revoked" | "already_revoked" | "not_static" | null;
  roleSync?: HandoutRoleSync;
};

export async function postHandoutToSite(body: {
  actorDiscordId: string;
  targetDiscordId: string;
  kind: "OWNER" | "PREMIUM";
  action: "add" | "remove";
}): Promise<HandoutApiResult> {
  const secret = getBotInternalSecret();
  if (!secret) {
    throw new Error("BOT_INTERNAL_SECRET is not set");
  }

  const base = getSiteApiBase();
  const url = new URL("/api/internal/handout", `${base}/`);
  const res = await siteFetch(url, {
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

  return (await res.json()) as HandoutApiResult;
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
  const res = await siteFetch(url, {
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

export async function postStatusSnapshot(payload: object): Promise<void> {
  const secret = getBotInternalSecret();
  if (!secret) return;

  const base = getSiteApiBase();
  const url = new URL("/api/internal/status", `${base}/`);
  const res = await siteFetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify(payload),
  });

  if (res.status === 503) {
    throw new Error("Status API unavailable (BOT_INTERNAL_SECRET missing on site)");
  }
  if (res.status === 401) {
    throw new Error("Status API rejected token");
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Status snapshot sync failed ${res.status}: ${text.slice(0, 200)}`);
  }
}
