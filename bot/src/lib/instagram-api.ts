/**
 * Instagram profile: tries Instagram’s public **web_profile_info** first (no extra RapidAPI
 * subscription). Falls back to RapidAPI if direct fails and **RAPIDAPI_KEY** is set.
 *
 * RapidAPI: TikTok and Instagram are **separate subscriptions**. “API doesn’t exists” means
 * the key isn’t subscribed to the app matching **RAPIDAPI_INSTAGRAM_HOST**, or the host/path is wrong.
 *
 * Override: `RAPIDAPI_INSTAGRAM_HOST`, `RAPIDAPI_INSTAGRAM_PATH` (see that API’s code snippets).
 * Set `INSTAGRAM_RAPIDAPI_ONLY=1` to skip direct requests.
 */

export type InstagramProfileResult =
  | { ok: true; data: InstagramProfile }
  | { ok: false; error: string };

export type InstagramProfile = {
  username: string;
  fullName: string;
  biography: string;
  followers: number | null;
  following: number | null;
  posts: number | null;
  profilePicUrl: string | null;
  isPrivate: boolean;
  isVerified: boolean;
  externalUrl: string | null;
};

function asRecord(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

/** Resolve common wrapper shapes to the inner user object. */
function unwrapUserPayload(root: unknown): Record<string, unknown> | null {
  const r = asRecord(root);
  if (!r) return null;

  if (typeof r.username === "string" || typeof r.full_name === "string") {
    return r;
  }

  const data = asRecord(r.data);
  if (data) {
    const user = asRecord(data.user);
    if (user) return user;
    const u2 = asRecord(data.username);
    if (u2) return u2;
  }

  const userRoot = asRecord(r.user);
  if (userRoot) return userRoot;

  const result = asRecord(r.result);
  if (result) {
    const u = asRecord(result.user);
    if (u) return u;
  }

  return null;
}

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function edgeCount(v: unknown): number | null {
  const o = asRecord(v);
  if (!o) return null;
  return num(o.count);
}

function extractFromUser(u: Record<string, unknown>): InstagramProfile | null {
  const username = typeof u.username === "string" ? u.username.trim() : "";
  if (!username) return null;

  const fullName =
    (typeof u.full_name === "string" && u.full_name.trim()) ||
    (typeof u.fullName === "string" && u.fullName.trim()) ||
    username;

  const biography =
    (typeof u.biography === "string" && u.biography) ||
    (typeof u.bio === "string" && u.bio) ||
    "";

  const followers: number | null =
    edgeCount(u.edge_followed_by) ??
    num(u.follower_count) ??
    num(u.followers) ??
    num(u.edge_followed_by_count);

  const following: number | null =
    edgeCount(u.edge_follow) ??
    num(u.following_count) ??
    num(u.following) ??
    num(u.edge_follow_count);

  const posts: number | null =
    edgeCount(u.edge_owner_to_timeline_media) ??
    num(u.media_count) ??
    num(u.posts);

  const pic =
    (typeof u.profile_pic_url_hd === "string" && u.profile_pic_url_hd) ||
    (typeof u.profile_pic_url === "string" && u.profile_pic_url) ||
    (typeof u.profilePicUrl === "string" && u.profilePicUrl) ||
    null;

  const externalUrl =
    (typeof u.external_url === "string" && u.external_url.trim()) ||
    (typeof u.externalUrl === "string" && u.externalUrl.trim()) ||
    null;

  return {
    username,
    fullName,
    biography: biography.trim(),
    followers,
    following,
    posts,
    profilePicUrl: pic,
    isPrivate: Boolean(u.is_private ?? u.isPrivate),
    isVerified: Boolean(u.is_verified ?? u.isVerified),
    externalUrl,
  };
}

export function normalizeInstagramUsername(raw: string): string {
  return raw.trim().replace(/^@+/, "").replace(/\s+/g, "").trim();
}

/** Instagram usernames: letters, numbers, periods, underscores; max 30. */
export function isPlausibleInstagramUsername(s: string): boolean {
  if (s.length < 1 || s.length > 30) return false;
  return /^[a-zA-Z0-9._]+$/.test(s);
}

const IG_WEB_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

/** Instagram web anonymous app id (used by instagram.com). */
const X_IG_APP_ID = "936619743392459";

function rapidApiSubscriptionHint(): string {
  return (
    "On [RapidAPI](https://rapidapi.com), open **Subscriptions** and add an **Instagram** API (TikTok alone is not enough). Copy that app’s **X-RapidAPI-Host** into **RAPIDAPI_INSTAGRAM_HOST** and use its profile endpoint path in **RAPIDAPI_INSTAGRAM_PATH** if it differs from `/account-info`."
  );
}

function humanizeRapidApiBodyMessage(
  res: Response,
  json: unknown,
  statusLine: string,
): string {
  const rec = asRecord(json);
  const raw =
    rec && typeof rec.message === "string"
      ? rec.message
      : rec && typeof rec.error === "string"
        ? rec.error
        : "";
  const msg = raw.trim();
  const lower = msg.toLowerCase();

  if (
    lower.includes("doesn't exist") ||
    lower.includes("does not exist") ||
    lower.includes("api doesn't") ||
    lower.includes("not subscribed")
  ) {
    return (
      "**RapidAPI:** " +
      (msg || statusLine) +
      "\n\n" +
      rapidApiSubscriptionHint()
    );
  }

  if (res.status === 401 || res.status === 403) {
    return (
      "**RapidAPI** rejected the request — check **RAPIDAPI_KEY** and that you’re subscribed to the Instagram app matching **RAPIDAPI_INSTAGRAM_HOST**.\n\n" +
      rapidApiSubscriptionHint()
    );
  }

  return msg || statusLine;
}

/**
 * @returns Result, or `null` to try RapidAPI (rate limit / blocked / unexpected body).
 */
async function fetchInstagramDirect(
  username: string,
): Promise<InstagramProfileResult | null> {
  if (process.env.INSTAGRAM_RAPIDAPI_ONLY?.trim() === "1") {
    return null;
  }

  const url = new URL(
    "https://www.instagram.com/api/v1/users/web_profile_info/",
  );
  url.searchParams.set("username", username);

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      headers: {
        "User-Agent": IG_WEB_UA,
        Accept: "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "X-IG-App-ID": X_IG_APP_ID,
        "X-Requested-With": "XMLHttpRequest",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
      },
    });
  } catch {
    return null;
  }

  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text) as unknown;
  } catch {
    if (res.status === 404) {
      return { ok: false, error: "User not found." };
    }
    return null;
  }

  if (res.status === 429 || res.status === 403) {
    return null;
  }

  if (!res.ok) {
    return null;
  }

  const rec = asRecord(json);
  if (rec && rec.status === "fail") {
    const m = typeof rec.message === "string" ? rec.message : "";
    if (m.toLowerCase().includes("not found")) {
      return { ok: false, error: "User not found." };
    }
    return null;
  }

  const user = unwrapUserPayload(json);
  if (!user) {
    return { ok: false, error: "User not found." };
  }

  const profile = extractFromUser(user);
  if (!profile) {
    return { ok: false, error: "User not found." };
  }

  return { ok: true, data: profile };
}

async function fetchInstagramRapidApi(
  username: string,
  rapidApiKey: string,
  host: string,
  path: string,
): Promise<InstagramProfileResult> {
  const pathSeg = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`https://${host}${pathSeg}`);
  url.searchParams.set("username", username);

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      headers: {
        "x-rapidapi-key": rapidApiKey,
        "x-rapidapi-host": host,
      },
    });
  } catch {
    return { ok: false, error: "Network error while contacting RapidAPI." };
  }

  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text) as unknown;
  } catch {
    return {
      ok: false,
      error: res.ok
        ? "Unexpected response from RapidAPI."
        : `RapidAPI error (${res.status}).`,
    };
  }

  if (!res.ok) {
    return {
      ok: false,
      error: humanizeRapidApiBodyMessage(
        res,
        json,
        `Request failed (${res.status}).`,
      ),
    };
  }

  const rec = asRecord(json);
  const topMsg = typeof rec?.message === "string" ? rec.message.trim() : "";
  if (
    topMsg &&
    (topMsg.toLowerCase().includes("doesn't exist") ||
      topMsg.toLowerCase().includes("does not exist"))
  ) {
    return {
      ok: false,
      error: humanizeRapidApiBodyMessage(res, json, topMsg),
    };
  }

  const user = unwrapUserPayload(json);
  if (!user) {
    const msg =
      topMsg || (typeof rec?.error === "string" ? rec.error : "User not found.");
    return { ok: false, error: msg };
  }

  const profile = extractFromUser(user);
  if (!profile) {
    return { ok: false, error: "User not found or profile format changed." };
  }

  return { ok: true, data: profile };
}

export async function fetchInstagramProfile(
  username: string,
  options: {
    rapidApiKey?: string;
    rapidApiHost: string;
    rapidApiPath: string;
  },
): Promise<InstagramProfileResult> {
  const direct = await fetchInstagramDirect(username);
  if (direct !== null) {
    return direct;
  }

  const key = options.rapidApiKey?.trim();
  if (!key) {
    return {
      ok: false,
      error:
        "Couldn’t load this profile from Instagram directly (often **rate limits** on cloud IPs). Set **RAPIDAPI_KEY** and subscribe to an **Instagram** API on RapidAPI (separate from TikTok).\n\n" +
        rapidApiSubscriptionHint(),
    };
  }

  return fetchInstagramRapidApi(
    username,
    key,
    options.rapidApiHost,
    options.rapidApiPath,
  );
}
