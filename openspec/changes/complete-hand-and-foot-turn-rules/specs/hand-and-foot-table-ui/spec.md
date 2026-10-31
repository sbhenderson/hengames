## ADDED Requirements

### Requirement: Discard pile pickup control
The hand tray SHALL offer a Pick up pile button that is enabled only on the viewer's turn during must-draw when the top discard can be picked up and the selected cards include at least two naturals of its rank and otherwise only that rank or wilds; activating it SHALL send a pickup with the selected cards. When the viewer selects cards for pickup, the turn prompt SHALL read `Your turn: draw 2 or pick up the pile`.

#### Scenario: Pickup enabled
- **WHEN** it is the viewer's must-draw step, the top discard is a 9, and two 9s are selected
- **THEN** Pick up pile SHALL be enabled

#### Scenario: Pickup disabled on a black 3
- **WHEN** the top discard is a black 3
- **THEN** Pick up pile SHALL be disabled

### Requirement: Red 3 display
The table surface SHALL show each team's laid red 3s next to that team's melds, with a count.

#### Scenario: Red 3 shown
- **WHEN** the blue team has laid two red 3s
- **THEN** the blue team's area SHALL show both cards and the count 2

## MODIFIED Requirements

### Requirement: Turn prompts
The turn prompt SHALL read `Your turn: draw 2` (or `Your turn: draw 2 or pick up the pile` when the top discard can be picked up), `Your turn: meld if you can, then discard 1` or `Your turn: select cards to meld` on the player's own turn, and `Waiting for {name} to draw`, `to discard` or `to meld` otherwise.

#### Scenario: Own turn, must draw
- **WHEN** it is the viewer's turn, they must draw, and the top discard cannot be picked up
- **THEN** the prompt SHALL read Your turn: draw 2

#### Scenario: Own turn, pile available
- **WHEN** it is the viewer's turn, they must draw, and the top discard can be picked up
- **THEN** the prompt SHALL read Your turn: draw 2 or pick up the pile

#### Scenario: Waiting
- **WHEN** another player must discard
- **THEN** the prompt SHALL read Waiting for {name} to discard

### Requirement: Hand tray actions
The hand tray SHALL show the viewer's active pile and card count with Draw 2, Pick up pile, Create meld, one Add to {rank} per eligible own-team meld, Discard and Clear buttons, each enabled only when the action is valid for the current selection and turn step. Create meld and Add to {rank} SHALL be disabled while the selection contains a 3.

#### Scenario: Discard enabled
- **WHEN** it is the viewer's turn, step must-discard, and one card is selected
- **THEN** Discard SHALL be enabled

#### Scenario: Create meld disabled
- **WHEN** only two cards are selected
- **THEN** Create meld SHALL be disabled

#### Scenario: 3s cannot be melded
- **WHEN** the selection contains a black 3
- **THEN** Create meld SHALL be disabled
