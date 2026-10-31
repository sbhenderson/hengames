# pyramids-rules Specification

## Purpose
Specifies the as-built Pyramids solo game engine in packages/game-engine/src/pyramids: the deal, exposure, legal plays, streak scoring, game end and hidden information.

## Requirements

### Requirement: Deal and layout
A single 52-card deck without jokers SHALL be shuffled and dealt into a pyramid of rowCount rows (default 7, 28 cards) where row r has r+1 cards; the next card SHALL become the target and the rest SHALL form the draw pile. Setup SHALL require exactly 1 player and a rowPoints table matching rowCount.

#### Scenario: Default deal
- **WHEN** a game starts with default rules
- **THEN** there SHALL be 28 pyramid cards, 1 target card and 23 draw-pile cards

#### Scenario: Multiple players rejected
- **WHEN** 2 players are supplied
- **THEN** setup SHALL throw an invalid-rules error

### Requirement: Exposure
A pyramid card SHALL be exposed when it has not been removed and either sits in the base row or both cards covering it have been removed.

#### Scenario: Initial exposure
- **WHEN** a game is dealt
- **THEN** only the 7 base-row cards SHALL be exposed

#### Scenario: Half uncovered
- **WHEN** only one of the two covering cards has been removed
- **THEN** the card SHALL remain covered

### Requirement: Legal plays
During play, an exposed card SHALL be playable when its rank is exactly one above or below the target's, with aces adjacent to both twos and kings. The played card SHALL become the new target. Unknown, removed and covered cards SHALL all be rejected with the same message so the response does not reveal hidden cards.

#### Scenario: Ace wraps
- **WHEN** the target is an ace
- **THEN** an exposed king or two SHALL be playable

#### Scenario: No king-two wrap
- **WHEN** the target is a king
- **THEN** an exposed two SHALL be rejected

### Requirement: Drawing a new target
During play, the player SHALL be able to draw at any time; the top draw-pile card SHALL become the target, the streak SHALL reset to 0, and earned points SHALL be kept. Drawing from an empty pile SHALL be rejected.

#### Scenario: Draw resets the streak
- **WHEN** a player with a 3-card streak draws
- **THEN** the streak SHALL be 0 and game points SHALL be unchanged

### Requirement: Scoring
Each play SHALL earn rowPoints[row] plus (streak − 1) × streakBonusStep, where streak counts the current play. Default rowPoints SHALL be [502, 27, 17, 12, 7, 4, 3] from apex to base, streakBonusStep 2, and clearBonus 500.

#### Scenario: Streak bonus
- **WHEN** three base-row cards are played consecutively under default rules
- **THEN** they SHALL score 3, 5 and 7 points

### Requirement: Game end
The game SHALL end when every pyramid card is removed, adding clearBonus, or when the draw pile is empty and no exposed card is playable. After the game ends, plays and draws SHALL be rejected.

#### Scenario: Pyramid cleared
- **WHEN** the last pyramid card is played
- **THEN** the phase SHALL be game-over and clearBonus SHALL be added

#### Scenario: Stuck
- **WHEN** the draw pile is empty and no exposed card is playable
- **THEN** the phase SHALL be game-over with no bonus

### Requirement: Collecting points
Points SHALL be collectable only once the game is over, and only once per game.

#### Scenario: Collect too early
- **WHEN** the player collects during play
- **THEN** the action SHALL be rejected

#### Scenario: Collect twice
- **WHEN** the player collects a second time
- **THEN** the action SHALL be rejected

### Requirement: Hidden information
During play, covered pyramid cards SHALL be sent face-down without card data; at game over all remaining cards SHALL be revealed. The view SHALL include which cards are playable and whether drawing and collecting are allowed.

#### Scenario: Covered card hidden
- **WHEN** the view is built during play
- **THEN** no covered slot SHALL include its card's rank or suit
