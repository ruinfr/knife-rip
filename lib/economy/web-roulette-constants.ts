/**
 * American roulette — pocket labels, colors, and physical wheel order (clockwise).
 * Safe for client bundles (no Node / crypto).
 */

/** Standard American wheel reds on 1–36. */
export const ROULETTE_RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

/** Clockwise pocket labels starting at 0 (matches common casino layout). */
export const AMERICAN_WHEEL_CLOCKWISE: readonly string[] = [
  "0",
  "28",
  "9",
  "26",
  "30",
  "11",
  "7",
  "20",
  "32",
  "17",
  "5",
  "22",
  "34",
  "15",
  "3",
  "24",
  "36",
  "13",
  "1",
  "00",
  "27",
  "10",
  "25",
  "29",
  "12",
  "8",
  "19",
  "31",
  "18",
  "6",
  "21",
  "33",
  "16",
  "4",
  "23",
  "35",
  "14",
  "2",
] as const;

export type RoulettePocketColor = "green" | "red" | "black";

/** Pocket label from uniform spin index 0..37 (38 pockets). */
export function americanRoulettePocketLabel(idx: number): string {
  if (idx === 0) return "0";
  if (idx === 1) return "00";
  return String(idx - 1);
}

export function roulettePocketColor(pocketLabel: string): RoulettePocketColor {
  if (pocketLabel === "0" || pocketLabel === "00") return "green";
  const n = parseInt(pocketLabel, 10);
  if (!Number.isFinite(n) || n < 1 || n > 36) return "black";
  return ROULETTE_RED_NUMBERS.has(n) ? "red" : "black";
}

/** Index 0..37 in `AMERICAN_WHEEL_CLOCKWISE` for a spin index. */
export function wheelSlotIndexForSpinIndex(spinIdx: number): number {
  const label = americanRoulettePocketLabel(spinIdx);
  const i = AMERICAN_WHEEL_CLOCKWISE.indexOf(label);
  return i >= 0 ? i : 0;
}

export type RoulettePick = "red" | "black" | "green";

export function isRoulettePick(s: unknown): s is RoulettePick {
  return s === "red" || s === "black" || s === "green";
}
