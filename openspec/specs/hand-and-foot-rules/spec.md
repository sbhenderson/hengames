# hand-and-foot-rules Specification

## Purpose
Specifies the as-built Hand and Foot rules engine in packages/game-engine/src/hand-and-foot: setup, turn structure, melding, books, going out, scoring and per-player hidden information.

## Requirements

### Requirement: Default rules
The default rules SHALL be: deckCount 6, cardsPerHand 11, cardsPerFoot 11, drawCount 2, openingMeldMinimums [50, 90, 120, 150], cleanBookSize 7, goingOutRequiresCleanBook true, goingOutRequiresDirtyBook true, gameEndScore 8500, playerCount 4, and card points 3–7 = 5, 8–K = 10, A = 20, 2 = 20, JOKER = 50.

#### Scenario: Defaults
- **WHEN** defaultRules is read
- **THEN** deckCount SHALL be 6 and the JOKER card value SHALL be 50

### Requirement: Deck composition
Each deck SHALL contain 52 standard cards plus 2 jokers, and the game SHALL use deckCount such decks.

#### Scenario: Six decks
- **WHEN** six decks are built
- **THEN** there SHALL be 324 cards

### Requirement: Setup and deal
Setup SHALL require exactly 4 players, deal each player 11 hand cards and 11 foot cards, assign teams by seat order (1st and 3rd red, 2nd and 4th blue), flip one card to the discard pile, and start in phase playing, round 1, first player's turn, step must-draw.

#### Scenario: Standard deal
- **WHEN** 4 players start with default rules
- **THEN** each player SHALL hold 11 hand and 11 foot cards, the discard pile SHALL hold 1 card, and turnStep SHALL be must-draw

#### Scenario: Wrong player count
- **WHEN** 3 players are supplied
- **THEN** setup SHALL throw an invalid-rules GameRuleError

#### Scenario: Team assignment
- **WHEN** players are [p1, p2, p3, p4]
- **THEN** p1 and p3 SHALL be red and p2 and p4 SHALL be blue

### Requirement: Turn gating
Actions SHALL be accepted only while phase is playing and only from the current player; others SHALL be rejected with not-your-turn, and unknown players with invalid-player.

#### Scenario: Acting out of turn
- **WHEN** p2 draws on p1's turn
- **THEN** the action SHALL be rejected with not-your-turn

### Requirement: Drawing
During must-draw the current player SHALL draw exactly drawCount (2) cards from the draw pile into their active pile, after which the step SHALL be must-discard. Drawing SHALL be rejected outside must-draw and when fewer than 2 cards remain.

#### Scenario: Draw two
- **WHEN** p1 draws at the start of their turn
- **THEN** p1's hand SHALL go from 11 to 13 cards and turnStep SHALL be must-discard

### Requirement: Discarding
After drawing, the current player SHALL discard exactly one card from their active pile onto the discard pile; play SHALL then pass to the next seat (wrapping) with step must-draw. Discarding SHALL be rejected during must-draw.

#### Scenario: Discard passes the turn
- **WHEN** p1 discards after drawing
- **THEN** currentPlayerIndex SHALL be 1 and turnStep SHALL be must-draw

### Requirement: Creating melds
After drawing, a player SHALL be able to create a meld of at least 3 cards with at least 2 naturals of a single rank and no more wild cards (2s and jokers) than naturals. A team's first meld SHALL meet the opening minimum for the round, counting only the cards in that meld. Rejected cards SHALL be returned to the player.

#### Scenario: Opening minimum not met
- **WHEN** a team's first meld in round 1 is three 4s worth 15 points
- **THEN** the meld SHALL be rejected because it is below 50

#### Scenario: Opening minimum met
- **WHEN** a team's first meld in round 1 is five Ks worth 50 points
- **THEN** the meld SHALL be accepted

#### Scenario: Too many wilds
- **WHEN** a meld has more wild cards than naturals
- **THEN** the meld SHALL be rejected and the cards SHALL remain in the player's pile

### Requirement: Adding to melds
A player SHALL be able to add cards to their own team's existing meld when every added card is the meld's rank or wild and the result keeps at least 2 naturals and no more wilds than naturals. Adding zero cards, adding to the other team's meld, or adding to a missing meld SHALL be rejected.

#### Scenario: Excess wilds rejected
- **WHEN** four wilds are added to a meld of three 8s
- **THEN** the action SHALL be rejected and the four wilds SHALL remain in the player's hand

#### Scenario: Other team's meld
- **WHEN** a player targets a meld owned by the other team
- **THEN** the action SHALL be rejected

### Requirement: Books
A meld with at least 7 cards SHALL be a book; it SHALL be clean when it contains no wild cards and dirty otherwise.

#### Scenario: Clean book
- **WHEN** seven natural 8s are melded
- **THEN** the meld SHALL be a clean book

### Requirement: Entering the foot
When a meld empties a player's hand while they are playing from the hand, the player SHALL switch to playing from their foot.

#### Scenario: Hand emptied by melding
- **WHEN** a meld uses the last card in a player's hand
- **THEN** the player's activePile SHALL become foot

### Requirement: Going out
A meld that would empty the active foot SHALL be rejected unless the player's team already has at least one clean book and one dirty book. When a player empties their foot with both books held, the round SHALL end.

#### Scenario: Going out without books
- **WHEN** a player tries to meld their last foot cards and their team has no books
- **THEN** the meld SHALL be rejected

#### Scenario: Going out with books
- **WHEN** the team holds a clean and a dirty book and the player melds their last foot cards
- **THEN** the round SHALL end

### Requirement: Round scoring
At round end each team SHALL score the card points of its melds plus 500 per clean book and 300 per dirty book, minus the card points of cards left in its players' hands and feet. Scores SHALL be appended to roundScores and added to teamScores, and the phase SHALL become game-over when either team reaches 8500, otherwise round-over.

#### Scenario: Clean book bonus
- **WHEN** a team's only meld is a clean book of seven Ks and its players hold no cards
- **THEN** the team SHALL score 570 for the round

### Requirement: Hidden information
A player's view SHALL include their own hand, and their own foot only once they are playing from it. Other players SHALL be shown only as card counts, with foot counts only once that player is in their foot. A spectator view SHALL show counts only. Views SHALL be defensive copies.

#### Scenario: Opponent hand hidden
- **WHEN** p1 views the game at the start
- **THEN** p2's hand SHALL be absent and p2's hand count SHALL be 11

### Requirement: Event sequence
Every announced game event SHALL set lastEvent and increment lastEventSeq by exactly 1.

#### Scenario: Draw then discard
- **WHEN** p1 draws and then discards
- **THEN** lastEventSeq SHALL be 1 after the draw and 2 after the discard
