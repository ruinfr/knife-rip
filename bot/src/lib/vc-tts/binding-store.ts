/** guildId → text channel id where VC TTS listens (in-memory; cleared on restart). */
const bindings = new Map<string, string>();

export function setTtsBindChannel(
  guildId: string,
  textChannelId: string | null,
): void {
  if (textChannelId == null) bindings.delete(guildId);
  else bindings.set(guildId, textChannelId);
}

export function getTtsBindChannel(guildId: string): string | undefined {
  return bindings.get(guildId);
}
