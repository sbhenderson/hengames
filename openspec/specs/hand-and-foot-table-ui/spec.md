# hand-and-foot-table-ui Specification

## Purpose
Specifies the as-built mobile-first Hand and Foot game table in apps/web/src/components/game-table: HUD, table surface, player strip and hand tray.

## Requirements

### Requirement: Status HUD
A sticky HUD SHALL show the room code, a Your turn or Waiting pill, the round number, a turn prompt announced to assistive technology, both team scores, the sound toggle, the notifications menu, and a compact row with the player's avatar, team and active pile.

#### Scenario: HUD content
- **WHEN** the table renders during play
- **THEN** the round, turn prompt and both team scores SHALL be visible

### Requirement: Turn prompts
The turn prompt SHALL read `Your turn: draw 2`, `Your turn: meld if you can, then discard 1` or `Your turn: select cards to meld` on the player's own turn, and `Waiting for {name} to draw`, `to discard` or `to meld` otherwise.

#### Scenario: Own turn, must draw
- **WHEN** it is the viewer's turn and they must draw
- **THEN** the prompt SHALL read Your turn: draw 2

#### Scenario: Waiting
- **WHEN** another player must discard
- **THEN** the prompt SHALL read Waiting for {name} to discard

### Requirement: Notifications menu
A bell menu SHALL show the notification count and list notifications newest-first with times, or No notifications yet. when empty.

#### Scenario: Empty
- **WHEN** no events have occurred
- **THEN** the menu SHALL show No notifications yet.

### Requirement: Table surface
The table SHALL show the draw pile with its count, the top discard and discard count, the latest event, and each team's melds, labelling books as Clean book or Dirty book and building melds as Clean or Dirty.

#### Scenario: Dirty building meld
- **WHEN** a team has a 3-card meld containing a 2
- **THEN** it SHALL be labelled Dirty

### Requirement: Player strip
A player strip SHALL show every player with avatar, name (marked you for the viewer), team, and hand/foot card counts, marking the current player; on narrow screens it SHALL scroll horizontally.

#### Scenario: Current player
- **WHEN** it is p2's turn
- **THEN** p2's chip SHALL be marked as the current player

### Requirement: Hand tray actions
The hand tray SHALL show the viewer's active pile and card count with Draw 2, Create meld, one Add to {rank} per eligible own-team meld, Discard and Clear buttons, each enabled only when the action is valid for the current selection and turn step.

#### Scenario: Discard enabled
- **WHEN** it is the viewer's turn, step must-discard, and one card is selected
- **THEN** Discard SHALL be enabled

#### Scenario: Create meld disabled
- **WHEN** only two cards are selected
- **THEN** Create meld SHALL be disabled

### Requirement: Selection and ordering
Tapping a card SHALL toggle its selection; dragging SHALL reorder the hand locally; selected cards SHALL offer move-left/move-right controls; tapping the only selected card during must-discard on the viewer's turn SHALL discard it. Local order SHALL keep existing cards in place, append new cards and drop removed ones.

#### Scenario: New cards appended
- **WHEN** the viewer draws two cards after reordering
- **THEN** the existing order SHALL be kept and the new cards appended

### Requirement: Meld hints
Cards SHALL be subtly marked as wild-helper (2s and jokers), existing-meld (rank matches an own-team meld) or possible-meld (three or more naturals of a rank in hand), in that precedence.

#### Scenario: Existing meld hint
- **WHEN** the viewer holds a K and their team has a K meld
- **THEN** the K SHALL be marked existing-meld

### Requirement: Card display
Cards SHALL show rank and suit glyph with hearts and diamonds in red, and jokers SHALL render with the Hen mark.

#### Scenario: Joker
- **WHEN** a joker is shown
- **THEN** it SHALL render the Hen mark and be named Joker for assistive technology

### Requirement: Responsive layout
The table SHALL be mobile-first with the hand tray stuck to the bottom of the viewport without hiding table content; at 760px and wider team melds SHALL use two columns, and at 980px and wider the table SHALL use a two-column layout.

#### Scenario: Phone
- **WHEN** the table is viewed at 402×860 and scrolled to the bottom
- **THEN** both teams' melds SHALL be visible above the hand tray
