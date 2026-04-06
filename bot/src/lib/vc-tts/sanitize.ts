const MAX = 2000;

/** Strip Discord markup / URLs so TTS reads clean text. */
export function sanitizeTextForTts(raw: string): string {
  const t = raw
    .replace(/<@[!&]?\d+>/g, " someone ")
    .replace(/<#[!&]?\d+>/g, " channel ")
    .replace(/<a?:\w+:\d+>/g, " ")
    .replace(/https?:\/\/\S+/gi, " link ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  return t.slice(0, MAX);
}
