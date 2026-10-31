# Design

## Context

The engine is a pure reducer: `applyHandAndFootAction` clones the state and then dispatches on `draw`, `meld` or `discard`. Cards in a turn always come from and go to the player's *active pile* (hand or foot). The server passes actions straight through after zod validation, and clients receive per-viewer views over the WebSocket. All state is in memory.

## Goals / Non-Goals

**Goals:** deterministic, fully tested engine rules; minimal server change; a UI that makes pickup usable on mobile.

**Non-Goals:**
- asking your partner before going out;
- starting round 2 or later;
- a going-out bonus;
- reshuffling the discard pile.

## Decisions

1. **Pickup is a separate action.** The shape is `{ type: "pickup", cardIds }`. `cardIds` are cards from the active pile that are melded together with the top discard; at least 2 must be naturals of the top card's rank. Pickup is legal only in `must-draw`, and it replaces drawing.
   - Alternative considered: overloading `draw` with a source flag. Rejected, because pickup needs card ids and has different validation.
2. **Pickup melds into a new meld, or merges into the team's existing meld of that rank.** The engine does not stop a team from having two melds of the same rank today, but merging keeps the table readable and matches how the game is played at the table. The opening minimum applies only when the team has no meld yet, and counts the whole pickup meld.
3. **The top card plus the next 6 (7 in total, or fewer if the pile is short).** The top card goes into the meld; the rest go into the active pile. After pickup the step becomes `must-discard`, exactly like after a draw.
4. **Red 3s are stored per team.** They live in `state.redThrees: Record<team, Card[]>` and are not stored as melds. That way they never count as books, never take part in meld-rank logic, and score separately. A single `settleRedThrees(player)` helper runs whenever cards enter a player's active pile. That happens:
   - at the deal (hand only);
   - after a draw;
   - after a pickup;
   - on entering the foot, whether by meld or by discard.

   The helper loops, because a replacement card can itself be a red 3. If the draw pile cannot supply a replacement, the player simply gets no replacement; exhaustion is then handled at the next turn start.
5. **Feet are not settled until they are picked up.** That is why a red 3 can still sit in an unplayed foot at round end, which is the −500 case.
6. **3s are never meldable.** Black 3s are blocked in `classifyMeld` and in the add-to-meld check. Red 3s never stay in a pile, so they need no separate check. Pickup is blocked when the top discard is any 3 or a wild. A red 3 can be on top only when it is the first card flipped at the deal, and blocking it is harmless.
7. **Exhaustion is checked when the turn passes.** After a discard passes the turn, if `drawPile.length < drawCount`, the round is scored and the phase ends. Checking here, rather than when a draw is attempted, means no turn ever starts that cannot be played. Trade-off: the next player loses a pickup they might have made, which is acceptable for a rare end-of-deck case.
8. **Going out is checked in one place.** Discarding the last foot card calls the same book check as melding. The meld floor (a foot meld must leave at least 2 cards without the books) prevents the stuck turn where 1 card remains and discarding it is illegal.

## Risks / Trade-offs

- [Pickup UX on small screens: selecting two cards that match a card outside the hand] → Enable "Pick up pile" only when the selection is valid, and give a hint in the turn prompt.
- [Red-3 replacement draws shrink the stock and can trigger exhaustion earlier] → This is expected; it is covered by a test.
- [The scoring change affects existing tests' expected totals] → Update the fixtures explicitly, and keep the old examples that have no 3s unchanged.

## Migration Plan

Deploy as normal. In-flight games are lost on restart (in-memory state). Rollback means redeploying the previous image.
