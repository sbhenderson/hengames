# HenGames game page redesign design

## Problem

The current Hand and Foot game page exposes the room state as stacked panels: status cards, a hand grid, an actions panel, player summaries, and table books. It works as a state viewer, but it does not feel like a browser-based card game, especially on phone portrait screens. The next redesign should make the page feel like a playable game surface while keeping the server-authoritative game model intact.

## Goals

- Make phone portrait the primary experience.
- Make the current round, current turn, required action, scores, pile counts, player hand/foot counts, and team books visible without scanning unrelated panels.
- Make the player's cards feel personal and tactile through local ordering, clear selection, and compact card presentation.
- Support multi-card selection for creating melds/books and adding to existing team melds.
- Surface subtle hints for cards that can start a meld or join an existing meld/book.
- Preserve the existing server action model: draw, meld, and discard remain authoritative tRPC mutations.

## Non-goals

- Do not change Hand and Foot rules as part of the redesign.
- Do not make card order part of server state in this pass.
- Do not build a separate desktop-only board layout. Desktop should expand the same mobile-first structure.
- Do not auto-play or auto-meld cards based on hints.

## Recommended approach

Use a mobile-first game-table shell. Replace the current nested panel layout in `GameTable` with focused UI zones that behave like a game surface:

1. Sticky game HUD.
2. Shared table surface.
3. Compact player strip.
4. Anchored hand tray and contextual action bar.

This approach best fits the TODO item because it makes the page feel game-like on phones while preserving the current app architecture and server action model.

## Page structure

### Sticky game HUD

The top of the page should always answer:

- Which room am I in?
- Which round is this?
- Whose turn is it?
- Is it my turn?
- What action do I need to take now?
- What are the team scores?

The HUD should include the back-to-rooms affordance, round number, current player display name, turn step label, team scores, and a direct action prompt such as "Your turn: draw 2", "Select cards to meld, then discard", or "Waiting for peeking-penguin".

### Table surface

The central area should look and behave like the shared table. It should show:

- Draw pile count.
- Top discard card.
- Discard pile count.
- Last game event.
- Team red and team blue meld/book zones.

Team book zones should make completed books and in-progress melds easy to distinguish. Existing clean/dirty book labels should remain, but the visual treatment should use red/black badges plus text so color is not the only signal.

### Player strip

The player summary should be a compact strip of player chips rather than full cards. Each chip should show avatar, display name, team, current-turn marker, active pile, hand count, and foot count when visible. This strip can scroll horizontally on phones and expand into a roomier row/grid on larger screens.

### Hand tray

The player's hand should be the dominant interaction zone. It should sit near the bottom of the phone layout and contain compact playing-card buttons. It should support local card ordering, multi-select, visible selected state, and a contextual action bar.

Spectators or players without a visible hand should see a public-state message in the same area instead of an empty card grid.

## Interactions

### Local card ordering

Dragging cards should reorder the visible hand locally by card ID. This order is client-only and does not change game state. When room snapshots arrive, the client should merge the saved order with the latest visible card IDs:

- Existing ordered cards keep their relative order.
- New cards, such as freshly drawn cards, append after the known ordered cards.
- Missing cards, such as discarded or melded cards, are removed from the local order.

This gives the player a personal workspace without requiring new server persistence.

### Multi-select workflow

Cards should support tap/click selection. Selected cards should be visibly raised or outlined and expose state with `aria-pressed`.

After the player has drawn, selected cards should drive contextual actions:

- If the selection can plausibly start a meld, show `Create meld`.
- If the selection can plausibly join existing team melds, show `Add to <rank>` options.
- If exactly one card is selected while a discard is required, show `Discard`.

The client should guide likely-valid actions, but it should not hide server validation. Invalid actions must surface a concise error near the hand action bar.

### Fast discard

During the discard-required state, a single card tap can remain a fast discard path when no multi-select workflow is active. Once the user has selected one or more cards, the explicit action bar should take over so users do not accidentally discard while preparing a meld.

### Meld/book hints

Hints should be subtle and non-blocking:

- Cards with enough same-rank companions to form a potential meld get a soft possible-meld highlight.
- Cards matching an existing team meld/book get an edge marker that indicates they may be addable.
- Wild cards get a neutral wild-helper marker.

Hints should be derived from the current player hand and visible team melds. They are UX guidance only; the server remains authoritative.

## Component design

`GameTable.tsx` should be split into smaller focused components:

- `GameHud`: room controls, round, scores, current player, turn step, and action prompt.
- `TableSurface`: draw/discard piles, last event, and team meld/book zones.
- `PlayerStrip`: compact participant/player chips.
- `HandTray`: local card ordering, card rendering, selection state, hints, and contextual actions.
- `PlayingCardButton`: reusable card button with selected, draggable, and hint states.

Small helper modules should handle:

- Card formatting and suit display.
- Meld/book labels and classes.
- Hand order reconciliation by card ID.
- Selection analysis for potential meld creation and add-to-meld actions.
- Turn/action prompt generation.

The goal is to keep each component understandable without reading all of `GameTable`.

## Data flow

The server continues to provide `HandAndFootPlayerView` through room snapshots. The client reads:

- `round`, `currentPlayerId`, `turnStep`, `teamScores`, and `lastEvent` for the HUD.
- `drawCount`, `discardCount`, `topDiscard`, and `melds` for the table surface.
- `players` plus room participants for player chips.
- The current player's visible `hand` or `foot` for the hand tray.

Game actions continue to call the existing `gameAction` mutation:

- `{ type: "draw" }`
- `{ type: "meld", cardIds, targetMeldId? }`
- `{ type: "discard", cardId }`

Local UI state should include selected card IDs, local card order, and transient action errors. Selection should clear after successful meld or discard mutations and reconcile safely when selected cards disappear from the snapshot.

## Error handling

Mutation errors should be visible near the hand action bar or relevant action button. The UI should not silently ignore invalid moves. Client-side action availability can prevent obvious invalid actions, but rule errors from the server must still be displayed because the server is authoritative.

## Responsive behavior

Phone portrait is the baseline:

- Sticky HUD at top.
- Table surface and book zones below.
- Player strip as a compact horizontal scroller.
- Hand tray and primary action bar near the bottom for thumb reach.

Tablet and desktop should expand the same zones rather than replacing them:

- Table surface and player strip can sit beside or above the hand tray.
- Book zones can use two columns for red and blue teams.
- The hand tray remains prominent and interactive.

## Accessibility

- Cards remain buttons and expose selected state with `aria-pressed`.
- Drag ordering should not be the only way to reorder cards; keyboard or explicit move-left/move-right controls should be available when a card is focused or selected.
- Action buttons should use text labels, not only icons, emoji, color, or glow.
- Clean/dirty and team indicators should combine color with text.
- Touch targets should remain large enough for phone use.

## Testing and validation

Add or update tests around pure helper logic where practical:

- Card order reconciliation.
- Selection-to-action analysis.
- Meld/book hint classification.
- Turn/action prompt generation.

Component tests can be added if the project already has a suitable test setup for React UI. Otherwise, keep the implementation type-safe and validate with the existing repository typecheck and build commands.

## Open decisions resolved

- Scope: full game-page redesign including drag ordering, multi-select melding, and hints.
- Primary target: phone portrait first, with desktop expansion from the same structure.
- Visual direction: modern card-game table with a subtle felt-like surface, compact cards, clear HUD, and red/blue team accents.
- Approach: mobile game-table shell.
