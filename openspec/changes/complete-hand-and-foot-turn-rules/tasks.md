# Tasks

## 1. Engine types and setup

- [ ] 1.1 Add `pickup` to `HandAndFootAction`, add `redThrees: Record<team, Card[]>` to the state, and add `redThrees` to `HandAndFootPlayerView`. Verify that `npm run typecheck -w packages/game-engine` passes.
- [ ] 1.2 Add `isRedThree`/`isBlackThree` helpers and `settleRedThrees(state, player)`, which lays red 3s and loops on replacements, giving none when the stock is empty. Unit tests: a single red 3, chained replacements, and an empty stock.
- [ ] 1.3 Settle red 3s in dealt hands during setup (feet untouched). Test that no starting hand contains a red 3, each hand still holds 11 cards, and the fixed-seed deal is deterministic.

## 2. Engine actions

- [ ] 2.1 Draw: settle red 3s after drawing. Test a draw that includes a red 3.
- [ ] 2.2 Pickup action. Tests cover:
  - success with an existing meld and with a new meld;
  - a short pile;
  - only one matching natural;
  - a wild on top;
  - a black 3 on top;
  - the opening minimum;
  - picking up after drawing;
  - a rejected pickup leaving the state unchanged.
- [ ] 2.3 Reject 3s in create and add-meld. Tests: a meld containing a black 3; adding a 3.
- [ ] 2.4 Discard into the foot and going out by discard, including settling red 3s on entering the foot. Tests:
  - the hand is emptied by a discard and the player enters the foot;
  - discarding out with books ends the round;
  - discarding out without books is rejected and the card is kept.
- [ ] 2.5 Foot meld floor without books (must leave at least 2 cards). Test that melding 3 of 4 foot cards with no books is rejected.
- [ ] 2.6 Draw-pile exhaustion check when the turn passes. Tests: 1 card left ends the round; 2 cards left continue play.

## 3. Engine scoring and views

- [ ] 3.1 Scoring: +100 per laid red 3, −500 per red 3 left in a foot, black 3 at −5. Tests use the spec's numbers: 570, 200, −500, −5.
- [ ] 3.2 Views expose each team's red 3s publicly as copies. Test that a blue viewer sees the red team's red 3.
- [ ] 3.3 `npm test -w packages/game-engine` is green and the existing tests are still unchanged.

## 4. Server

- [ ] 4.1 Add `pickup` (`cardIds: string[]`, at least 2) to the `gameAction` zod union in `appRouter.ts`. Server test: a seated player's pickup reaches the engine and the snapshot reflects it.

## 5. Web table

- [ ] 5.1 `gameTableHelpers`:
  - add a `canPickUp(view, selection)` helper;
  - update the turn prompt for the pickup case;
  - disable meld actions while the selection contains a 3.

  Covered by helper unit tests.
- [ ] 5.2 HandTray: add the Pick up pile button wired to `runAction({ type: "pickup", cardIds })` in `GameTable.tsx`. Verify with a test or the preview that it is enabled only when the selection is valid.
- [ ] 5.3 TableSurface: show red 3s per team, with a count, and add red-3 data to the `GamePreview` fixture. Verify with a screenshot at 402×860 that the table still fits above the tray.

## 6. Verification

- [ ] 6.1 Full `npm run typecheck && npm test && npm run build` is green.
- [ ] 6.2 Manual 4-browser game on the dev server: pick up the pile, lay a red 3, enter the foot by discarding, and see the round end on an exhausted stock (use a small `deckCount`).
