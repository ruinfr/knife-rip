/** Same reel symbols as Discord hub slots (`games.ts`) — safe for client bundles. */
export const WEB_SLOT_SYMBOLS = ["🍒", "🍋", "🍇", "⭐", "💎", "7️⃣"] as const;

export type WebSlotSymbol = (typeof WEB_SLOT_SYMBOLS)[number];
