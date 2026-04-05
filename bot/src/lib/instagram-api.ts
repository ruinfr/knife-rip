/**
 * Instagram public-ish profile via RapidAPI (scraped data; not Meta’s official Graph API).
 *
 * Default: **instagram130** on RapidAPI (`/account-info?username=`).
 * Same **RAPIDAPI_KEY** as `.tiktok` — subscribe to that Instagram API on RapidAPI.
 *
 * Override host/path if you use another RapidAPI Instagram product:
 * `RAPIDAPI_INSTAGRAM_HOST`, `RAPIDAPI_INSTAGRAM_PATH`.
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

  let followers: number | null =
    edgeCount(u.edge_followed_by) ??
    num(u.follower_count) ??
    num(u.followers) ??
    num(u.edge_followed_by_count);

  let following: number | null =
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

export async function fetchInstagramProfile(
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
    return { ok: false, error: "Network error while contacting Instagram API." };
  }

  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text) as unknown;
  } catch {
    return {
      ok: false,
      error: res.ok
        ? "Unexpected response from Instagram API."
        : `Instagram API error (${res.status}).`,
    };
  }

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        error:
          "RapidAPI rejected the request — check **RAPIDAPI_KEY** and subscribe to the Instagram API matching **RAPIDAPI_INSTAGRAM_HOST** (default: instagram130 on RapidAPI).",
      };
    }
    const rec = asRecord(json);
    const msg =
      rec && typeof rec.message === "string"
        ? rec.message
        : `Request failed (${res.status}).`;
    return { ok: false, error: msg };
  }

  const user = unwrapUserPayload(json);
  if (!user) {
    const rec = asRecord(json);
    const msg =
      rec && typeof rec.message === "string" ? rec.message : "User not found.";
    return { ok: false, error: msg };
  }

  const profile = extractFromUser(user);
  if (!profile) {
    return { ok: false, error: "User not found or profile format changed." };
  }

  return { ok: true, data: profile };
}
