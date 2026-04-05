/**
 * TikTok profile lookup via RapidAPI — Tikfly “TikTok API”
 * (https://rapidapi.com/tikfly/api/tiktok-api23 — subscribe, then set RAPIDAPI_KEY).
 */
const RAPIDAPI_HOST = "tiktok-api23.p.rapidapi.com";
const USER_INFO_PATH = "/api/user/info";

export type TikTokProfileResult =
  | { ok: true; data: TikTokProfile }
  | { ok: false; error: string };

export type TikTokProfile = {
  uniqueId: string;
  nickname: string;
  signature: string;
  verified: boolean;
  privateAccount: boolean;
  avatarUrl: string | null;
  followerCount: number;
  followingCount: number;
  videoCount: number;
  heartCount: number;
  diggCount: number;
};

type StatsBlock = {
  followerCount?: number;
  followingCount?: number;
  videoCount?: number;
  heartCount?: number;
  heart?: number;
  diggCount?: number;
};

type StatsV2Block = {
  followerCount?: string;
  followingCount?: string;
  videoCount?: string;
  heartCount?: string;
  heart?: string;
  diggCount?: string;
};

type ApiUserInfoResponse = {
  userInfo?: {
    user?: {
      uniqueId?: string;
      nickname?: string;
      signature?: string;
      verified?: boolean;
      privateAccount?: boolean;
      secret?: boolean;
      avatarLarger?: string;
    };
    stats?: StatsBlock;
    statsV2?: StatsV2Block;
  };
  statusCode?: number;
  message?: string;
};

function parseStatNumber(
  stats: StatsBlock | undefined,
  statsV2: StatsV2Block | undefined,
  key: keyof StatsBlock,
): number {
  const v2Raw = statsV2?.[key as keyof StatsV2Block];
  if (v2Raw !== undefined && v2Raw !== "") {
    const n = Number(v2Raw);
    if (Number.isFinite(n)) return n;
  }
  const n = stats?.[key];
  if (typeof n === "number" && Number.isFinite(n)) return n;
  if (key === "heartCount") {
    const h = stats?.heart;
    if (typeof h === "number" && Number.isFinite(h)) return h;
    const h2 = statsV2?.heart;
    if (h2 !== undefined && h2 !== "") {
      const parsed = Number(h2);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return 0;
}

function mapResponse(json: ApiUserInfoResponse): TikTokProfileResult {
  const code = json.statusCode;
  if (code === 10221 || !json.userInfo?.user) {
    return { ok: false, error: "User not found." };
  }
  if (code !== undefined && code !== 0) {
    return {
      ok: false,
      error: json.message?.trim() || "Could not load that profile.",
    };
  }

  const u = json.userInfo.user;
  const stats = json.userInfo.stats;
  const statsV2 = json.userInfo.statsV2;

  const uniqueId = u.uniqueId?.trim() || "";
  if (!uniqueId) {
    return { ok: false, error: "User not found." };
  }

  return {
    ok: true,
    data: {
      uniqueId,
      nickname: u.nickname?.trim() || uniqueId,
      signature: (u.signature ?? "").trim(),
      verified: Boolean(u.verified),
      privateAccount: Boolean(u.privateAccount ?? u.secret),
      avatarUrl: u.avatarLarger?.trim() || null,
      followerCount: parseStatNumber(stats, statsV2, "followerCount"),
      followingCount: parseStatNumber(stats, statsV2, "followingCount"),
      videoCount: parseStatNumber(stats, statsV2, "videoCount"),
      heartCount: parseStatNumber(stats, statsV2, "heartCount"),
      diggCount: parseStatNumber(stats, statsV2, "diggCount"),
    },
  };
}

/** Normalize handle: strip @ and whitespace. */
export function normalizeTikTokUsername(raw: string): string {
  return raw.trim().replace(/^@+/, "").trim();
}

/** Loose validation for TikTok unique ids. */
export function isPlausibleTikTokUsername(s: string): boolean {
  if (s.length < 2 || s.length > 32) return false;
  return /^[a-zA-Z0-9._]+$/.test(s);
}

export async function fetchTikTokProfile(
  uniqueId: string,
  rapidApiKey: string,
): Promise<TikTokProfileResult> {
  const url = new URL(`https://${RAPIDAPI_HOST}${USER_INFO_PATH}`);
  url.searchParams.set("uniqueId", uniqueId);

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      headers: {
        "x-rapidapi-key": rapidApiKey,
        "x-rapidapi-host": RAPIDAPI_HOST,
      },
    });
  } catch {
    return { ok: false, error: "Network error while contacting TikTok API." };
  }

  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text) as ApiUserInfoResponse;
  } catch {
    return {
      ok: false,
      error: res.ok
        ? "Unexpected response from TikTok API."
        : `TikTok API error (${res.status}).`,
    };
  }

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        error:
          "RapidAPI rejected the request — check **RAPIDAPI_KEY** and your subscription to the TikTok API (Tikfly) on RapidAPI.",
      };
    }
    const msg =
      typeof json === "object" &&
      json !== null &&
      "message" in json &&
      typeof (json as { message: unknown }).message === "string"
        ? (json as { message: string }).message
        : `Request failed (${res.status}).`;
    return { ok: false, error: msg };
  }

  return mapResponse(json as ApiUserInfoResponse);
}
