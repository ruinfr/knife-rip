# Web casino parity: Arivix bot vs Rainbet-style originals

Arivix Cash on the site shares the same Postgres wallet as Discord. This note maps **what the bot already implements** to **Rainbet “Originals”**-style products (provably fair, fast rounds, simple UI) so we can add games on the web in a sensible order.

## Rainbet Originals (reference)

Typical in-house lineup (names vary by region): **Blackjack**, **Mines**, **Dice**, **Plinko**, **Limbo**, **Keno**, **Wheel**, sometimes **Case Battles** / crash-style games. Many use **client seed + server seed + nonce** for verifiable fairness. See [Rainbet Blackjack](https://rainbet.com/casino/originals/blackjack) and their Originals lobby for UX patterns (bet strip, fairness link, history).

## Discord bot: implemented today

| Game | `EconomyGambleLog.game` / notes | Bot implementation | Web status |
|------|----------------------------------|--------------------|------------|
| Coin flip | `coinflip` (hub) / `web_coinflip` (site) | Hub in `games.ts`; web uses same rebirth house edge as hub via `web-casino-odds.ts` | **Live** on `/knife-cash` |
| Dice | `dice` (hub) / `web_dice` (site) | `runHouseGame` in `games.ts`; web mirrors rules in `web-house-settle.ts` | **Live** on `/knife-cash` |
| Slots | `slots` (hub) / `web_slots` (site) | Same symbols + payouts as hub | **Live** on `/knife-cash` |
| Roulette | `roulette` | American wheel (0, 00, 1–36), red/black/green in `games.ts` + hub in [`interaction-handler.ts`](../../bot/src/lib/economy/interaction-handler.ts) | Roadmap |
| Blackjack | `blackjack` | [`blackjack-flow.ts`](../../bot/src/lib/economy/blackjack-flow.ts) | Roadmap — highest Rainbet overlap |
| Mines | `mines` | [`mines-flow.ts`](../../bot/src/lib/economy/mines-flow.ts) | Roadmap — strong Rainbet overlap |
| PvP coinflip | `pvp_coinflip` | Challenges in DB | Usually Discord-only (opponent presence) |

Shared settlement for house games: [`applyGambleOutcomeInTx`](./gamble-outcome-tx.ts) (ledger + stats + house bank on losses). Hub games also apply **payout multiplier** (Pro/boost/pet) and **rebirth** house bias — web APIs should reuse the same helpers when parity is required.

## Suggested web build order

1. **Blackjack** — Extract or share round logic from `blackjack-flow.ts`; multi-step UI (hit/stand/double); match payouts/rules to Discord.
2. **Mines** — Grid + cashout; align with `mines-flow.ts` mine count / multipliers.
3. **Dice / slots / roulette** — Single-shot `runHouseGame` style endpoints + animations.
4. **Provably fair** (optional lift) — Commit server seed hash per user/session; publish verification snippet (Rainbet-style “Fair play”).

## URLs

Canonical: **`/knife-cash`**. Aliases (308): **`/gamble`**, **`/cash`**, **`/economy`**.

## Site cooldown

Web routes use a **minimal per-game gap** (`WEB_GAMBLE_COOLDOWN_MS` in `knife-cash-recent-wins.ts`, currently a few hundred ms) so double-clicks don’t double-settle. Discord hub keeps its own longer `GAME_COOLDOWN_MS`.
