# Proposal

## Why

Hand and Foot currently supports only draw, meld and discard. It also has two holes that stop real games:
- The discard pile can never be picked up, and 3s are ordinary cards.
- An empty draw pile stalls the game.
- Discarding your last hand card leaves you with an empty hand instead of moving you into your foot, and going out is only possible by melding.

See `docs/baseline-gaps.md`.

## What Changes

- **Discard-pile pickup.** This is a new `pickup` action that replaces drawing at the start of a turn. The player shows two natural cards matching the top discard. The two cards and the top discard (plus any optional extra cards of that rank, or wilds) are melded at once, and the next 6 cards of the pile (7 in total) go into the player's active pile.
- **Red 3s.** A red 3 is laid down face-up for the team as soon as it reaches a player, and a replacement is drawn. It scores +100 at round end. Any red 3 still in an unplayed foot scores −500.
- **Black 3s.** A black 3 can never be melded. It blocks pickup while on top of the discard pile, and it scores −5 when left in hand.
- **Draw-pile exhaustion.** When a turn would start with fewer cards in the draw pile than the draw count, the round ends at once and is scored as it stands.
- **Discarding into the foot.** Discarding your last hand card moves you into your foot. Discarding your last foot card goes out if your team has the required books.
- **Meld floor without books.** A meld from the foot must leave at least 2 cards unless the team holds the required books. This prevents a stuck turn where the only card left cannot be discarded.
- **Table UI.** The table gains a "Pick up pile" control and shows each team's red 3s.
- **BREAKING:** Saved or in-flight game states have no red-3 fields. This is acceptable because all state is in memory and is lost on restart anyway.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `hand-and-foot-rules`: adds pickup, red-3 and black-3 rules, draw-pile exhaustion, discarding into the foot and going out by discard, the foot meld floor, the scoring changes, and red 3s in the player view.
- `hand-and-foot-table-ui`: adds the pickup control and the red-3 display.

## Impact

- **Engine:** `packages/game-engine/src/hand-and-foot/{types,actions,setup,scoring,views}.ts` and their tests.
- **Server:** the `gameAction` zod input in `apps/server/src/routers/appRouter.ts` gains `pickup`. The rooms and WebSocket code need no other change.
- **Web:** `apps/web/src/components/GameTable.tsx`, `game-table/{HandTray,TableSurface}.tsx`, `gameTableHelpers.ts` and the dev preview fixture.
- **Data:** no migration is needed, because state is in memory only.
- **Out of scope:** asking your partner before going out, starting the next round, and a going-out bonus.
