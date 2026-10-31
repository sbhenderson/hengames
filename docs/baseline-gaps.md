# Baseline gap analysis

The specs in `openspec/specs/` describe what the code does **today**. This page lists known gaps and bugs, so that fixing them is a deliberate OpenSpec change rather than drift. Each item names the spec that a change should modify.

## Rules engine (`hand-and-foot-rules`)
- **No next round.** Scoring sets the phase to `round-over`, but nothing starts round 2, so the round-indexed `openingMeldMinimums` beyond 50 are never used. A game effectively lasts one round.
- **No pickup of the discard pile.** Drawing is from the stock only, and there is no pile-pickup rule.
- **Discarding can empty the hand without entering the foot.** Only melding switches `activePile` to `foot`.
- **Draw pile exhaustion.** Drawing is rejected when fewer than 2 cards remain, and nothing reshuffles the pile or ends the round, so the game can stall.
- **No red-3 or black-3 rules**, and there is no going-out permission request to a partner.

## Server (`game-rooms`, `realtime-updates`, `server-platform`)
- **In-memory only.** Rooms, sessions, profiles and scores are lost on restart.
- **Bearer tokens.** Profile and participant tokens are bearer secrets with no auth layer.
- **Finished rooms keep their status.** A `finished` room has no rematch or return-to-lobby path.

## Web client (`web-app-shell`, `landing-and-lobby-ui`, `hand-and-foot-table-ui`)
- **Stale poll can overwrite socket state.** A 5s `getRoom` poll can replace a newer socket snapshot after a disconnect. Notifications are sequence-guarded; the room view is not.
- **Deck count is not validated client-side.** An empty input sends `0`, and the server rejects it with no clear message.
- **Lobby buttons fail silently.** They are not disabled while a request is pending, and errors are not shown.
- **Start game is always clickable** for the host. Readiness is enforced only by the server.
- **Hidden-count label reads oddly.** It uses the template `{n}{hidden>0?" cards":""}`.
- **"Game in progress." lobby text is unreachable.**
- **Hidden actions.** Double-tap-to-discard is undiscoverable, and the "Add to meld" buttons are hidden until a selection is valid.
- **Spectator hints.** Meld hints assume a team, and the unused joker `★` glyph remains in the code.
- **No keyboard drag sensor.** The ←/→ buttons partially compensate.
- **No animation.**
- **No URL routing.** A reload returns to the landing page instead of rejoining the room.

## Tests
- Not covered by tests: the registry, the deterministic shuffle, round scoring with deductions, and the WebSocket per-viewer snapshots.
