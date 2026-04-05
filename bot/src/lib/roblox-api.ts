/**
 * Roblox public APIs — no key required.
 * @see https://create.roblox.com/docs/reference/cloud
 */

export type RobloxProfileResult =
  | { ok: true; data: RobloxProfile }
  | { ok: false; error: string };

export type RobloxProfile = {
  id: string;
  /** Unique account username (handle). */
  name: string;
  displayName: string;
  description: string;
  createdIso: string;
  isBanned: boolean;
  hasVerifiedBadge: boolean;
  headshotUrl: string | null;
};

type UsersApiUser = {
  description?: string;
  created?: string;
  isBanned?: boolean;
  hasVerifiedBadge?: boolean;
  id?: number;
  name?: string;
  displayName?: string;
};

async function fetchUserById(userId: string): Promise<UsersApiUser | null> {
  let res: Response;
  try {
    res = await fetch(`https://users.roblox.com/v1/users/${encodeURIComponent(userId)}`);
  } catch {
    return null;
  }
  if (res.status === 404) return null;
  if (!res.ok) {
    return null;
  }
  return (await res.json()) as UsersApiUser;
}

async function resolveUsernameToId(username: string): Promise<string | null> {
  let res: Response;
  try {
    res = await fetch("https://users.roblox.com/v1/usernames/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        usernames: [username],
        excludeBannedUsers: false,
      }),
    });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const json = (await res.json()) as {
    data?: { id?: number; name?: string }[];
  };
  const id = json.data?.[0]?.id;
  return id != null ? String(id) : null;
}

async function fetchHeadshotUrl(userId: string): Promise<string | null> {
  const url = new URL(
    "https://thumbnails.roblox.com/v1/users/avatar-headshot",
  );
  url.searchParams.set("userIds", userId);
  url.searchParams.set("size", "150x150");
  url.searchParams.set("format", "Png");
  url.searchParams.set("isCircular", "false");

  let res: Response;
  try {
    res = await fetch(url.toString());
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const json = (await res.json()) as {
    data?: { state?: string; imageUrl?: string }[];
  };
  const row = json.data?.[0];
  if (!row?.imageUrl || row.state === "Error") return null;
  return row.imageUrl;
}

function mapUser(u: UsersApiUser, headshotUrl: string | null): RobloxProfile | null {
  const id = u.id != null ? String(u.id) : "";
  const name = u.name?.trim() || "";
  if (!id || !name) return null;

  return {
    id,
    name,
    displayName: (u.displayName ?? name).trim() || name,
    description: (u.description ?? "").trim(),
    createdIso: u.created ?? "",
    isBanned: Boolean(u.isBanned),
    hasVerifiedBadge: Boolean(u.hasVerifiedBadge),
    headshotUrl,
  };
}

/**
 * Lookup by **username** only (Roblox handle). Numeric ids are rejected so input isn’t ambiguous.
 */
export async function fetchRobloxProfile(query: string): Promise<RobloxProfileResult> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { ok: false, error: "Enter a Roblox **username**." };
  }

  if (/^\d+$/.test(trimmed)) {
    return {
      ok: false,
      error:
        "Use a **username**, not a user id — e.g. `.roblox Roblox` (ids aren’t accepted here).",
    };
  }

  const userId = await resolveUsernameToId(trimmed);
  if (!userId) {
    return { ok: false, error: "No user found for that username." };
  }

  const user = await fetchUserById(userId);
  if (!user) {
    return { ok: false, error: "No user found for that username." };
  }

  const headshotUrl = await fetchHeadshotUrl(userId);
  const mapped = mapUser(user, headshotUrl);
  if (!mapped) {
    return { ok: false, error: "Could not read that profile." };
  }

  return { ok: true, data: mapped };
}
