/** In-memory only; entries expire after this TTL. */
export const SNIPE_TTL_MS = 10 * 60 * 1000;

export type DeleteSnipe = {
  kind: "delete";
  authorId: string;
  authorTag: string;
  content: string;
  attachmentCount: number;
  messageId: string;
  at: number;
};

export type EditSnipe = {
  kind: "edit";
  authorId: string;
  authorTag: string;
  before: string;
  after: string;
  messageId: string;
  at: number;
};

export type ReactionSnipe = {
  kind: "reaction";
  emojiDisplay: string;
  removerId: string;
  removerTag: string;
  messageId: string;
  messageAuthorTag: string;
  at: number;
};

export type ReactionHistoryEntry = {
  type: "add" | "remove";
  emojiDisplay: string;
  userId: string;
  userTag: string;
  at: number;
};

const MAX_REACTION_HISTORY_PER_MESSAGE = 50;

function historyKey(channelId: string, messageId: string): string {
  return `${channelId}:${messageId}`;
}

function isFresh(at: number): boolean {
  return Date.now() - at < SNIPE_TTL_MS;
}

const deleteMap = new Map<string, DeleteSnipe>();
const editMap = new Map<string, EditSnipe>();
const reactionMap = new Map<string, ReactionSnipe>();
/** Per-message reaction add/remove log (same TTL as snipes). */
const reactionHistoryMap = new Map<string, ReactionHistoryEntry[]>();

export function recordDeleteSnipe(channelId: string, data: Omit<DeleteSnipe, "kind">) {
  deleteMap.set(channelId, { kind: "delete", ...data });
}

export function recordEditSnipe(channelId: string, data: Omit<EditSnipe, "kind">) {
  editMap.set(channelId, { kind: "edit", ...data });
}

export function recordReactionSnipe(
  channelId: string,
  data: Omit<ReactionSnipe, "kind">,
) {
  reactionMap.set(channelId, { kind: "reaction", ...data });
}

export function recordReactionHistoryEvent(
  channelId: string,
  messageId: string,
  entry: ReactionHistoryEntry,
): void {
  const key = historyKey(channelId, messageId);
  const list = reactionHistoryMap.get(key) ?? [];
  const next = [...list.filter((e) => isFresh(e.at)), entry].slice(
    -MAX_REACTION_HISTORY_PER_MESSAGE,
  );
  reactionHistoryMap.set(key, next);
}

/** Fresh reaction history entries for a message (newest last). */
export function getReactionHistory(
  channelId: string,
  messageId: string,
): ReactionHistoryEntry[] {
  const key = historyKey(channelId, messageId);
  const list = reactionHistoryMap.get(key) ?? [];
  return list.filter((e) => isFresh(e.at));
}

/** Clear delete, edit, and reaction snipe buffers for this channel, and reaction history for messages in this channel. */
export function clearChannelSnipes(channelId: string): void {
  deleteMap.delete(channelId);
  editMap.delete(channelId);
  reactionMap.delete(channelId);
  const prefix = `${channelId}:`;
  for (const k of reactionHistoryMap.keys()) {
    if (k.startsWith(prefix)) {
      reactionHistoryMap.delete(k);
    }
  }
}

export function getDeleteSnipe(channelId: string): DeleteSnipe | null {
  const v = deleteMap.get(channelId);
  if (!v || !isFresh(v.at)) {
    if (v) deleteMap.delete(channelId);
    return null;
  }
  return v;
}

export function getEditSnipe(channelId: string): EditSnipe | null {
  const v = editMap.get(channelId);
  if (!v || !isFresh(v.at)) {
    if (v) editMap.delete(channelId);
    return null;
  }
  return v;
}

export function getReactionSnipe(channelId: string): ReactionSnipe | null {
  const v = reactionMap.get(channelId);
  if (!v || !isFresh(v.at)) {
    if (v) reactionMap.delete(channelId);
    return null;
  }
  return v;
}
