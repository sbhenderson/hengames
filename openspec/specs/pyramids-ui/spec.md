# pyramids-ui Specification

## Purpose
Specifies the as-built Pyramids game screen in apps/web/src/components/pyramids: the board, status headline, streak display, collect and replay flow, and high-score table.

## Requirements

### Requirement: Board
The Pyramids screen SHALL render the pyramid, the target card, and the draw pile, letting the player play exposed playable cards and draw.

#### Scenario: Play a card
- **WHEN** the player taps a playable exposed card
- **THEN** it SHALL be played onto the target

### Requirement: Status headline
A headline SHALL read, in priority order: Ready when you are. before a game; Points collected. Play again? after collecting; Pyramid cleared! or No legal moves left. at game over; Nothing to play — draw a new target card. when stuck; otherwise Play a card one higher or one lower than the {rank}.

#### Scenario: Stuck
- **WHEN** no exposed card is playable
- **THEN** the headline SHALL say to draw a new target card

### Requirement: Streak display
The streak label SHALL read No streak yet, or `{n} in a row · +{bonus} bonus next`.

#### Scenario: Active streak
- **WHEN** the player has 2 plays in a row with step 2
- **THEN** the label SHALL read 2 in a row · +4 bonus next

### Requirement: Collect and replay
At game over the player SHALL be able to collect points, and SHALL be offered Play again only after collecting.

#### Scenario: After collecting
- **WHEN** the player collects
- **THEN** Play again SHALL be offered

### Requirement: High-score table
The shared top-10 high-score table SHALL be shown before a game and at game over, and hidden during play.

#### Scenario: During play
- **WHEN** a game is in progress
- **THEN** the high-score table SHALL be hidden
