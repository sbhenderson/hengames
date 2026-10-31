## ADDED Requirements

### Requirement: Discard pile pickup
During must-draw, instead of drawing, the current player SHALL be able to pick up the discard pile by naming cards from their active pile. The top discard and the named cards SHALL be melded immediately (added to the team's meld of that rank if one exists), the next 6 cards below the top discard (7 in total, or all if fewer remain) SHALL go into the player's active pile, and the step SHALL become must-discard.

#### Scenario: Successful pickup
- **WHEN** the top discard is a K on a pile of 10 cards and the player's team already has a meld, and the player picks up naming two Ks from their hand
- **THEN** a K meld of at least 3 cards SHALL exist for the team, the player's hand SHALL have gained 6 cards and lost 2, the discard pile SHALL hold 3 cards, and turnStep SHALL be must-discard

#### Scenario: Short pile
- **WHEN** the discard pile holds 4 cards and the player picks it up validly
- **THEN** the top card SHALL be melded and the other 3 SHALL go into the active pile, leaving the discard pile empty

### Requirement: Pickup preconditions
A pickup SHALL name at least two natural cards of the top discard's rank, and otherwise only that rank or wild cards, and the resulting meld SHALL satisfy the normal meld rules, including the opening minimum when the team has no meld yet. Pickup SHALL be rejected after drawing, when the discard pile is empty, or when the top discard is a wild card or any 3. A rejected pickup SHALL leave the state unchanged.

#### Scenario: Only one matching natural
- **WHEN** the player names one 9 and one wild card to pick up a 9
- **THEN** the pickup SHALL be rejected and the state SHALL be unchanged

#### Scenario: Black 3 blocks pickup
- **WHEN** the top discard is a black 3
- **THEN** pickup SHALL be rejected

#### Scenario: Wild on top blocks pickup
- **WHEN** the top discard is a 2 or a joker
- **THEN** pickup SHALL be rejected

#### Scenario: Pickup must meet the opening minimum
- **WHEN** a team with no meld in round 1 picks up a 4 with two 4s (15 points)
- **THEN** pickup SHALL be rejected because it is below 50

#### Scenario: Pickup after drawing
- **WHEN** the player has already drawn this turn
- **THEN** pickup SHALL be rejected

### Requirement: Red threes
A red 3 (hearts or diamonds) SHALL be laid face-up for the player's team as soon as it enters that player's active pile — when it is dealt into a hand, drawn, picked up, or in a foot the player enters — and the player SHALL receive a replacement card from the draw pile into the same pile, repeating while replacements are red 3s. When the draw pile is empty, no replacement SHALL be given. Red 3s SHALL never be melded, discarded or held.

#### Scenario: Red 3 drawn
- **WHEN** a player draws two cards, one of which is the 3 of hearts
- **THEN** the 3 of hearts SHALL be laid for the player's team and the player SHALL hold 2 new cards from that draw

#### Scenario: Red 3 dealt
- **WHEN** a player's dealt hand contains a red 3
- **THEN** at the start of play it SHALL be laid for their team and their hand SHALL still hold 11 cards

#### Scenario: Red 3 in the foot
- **WHEN** a player enters a foot containing a red 3
- **THEN** it SHALL be laid for the team and replaced in the foot

#### Scenario: Chained replacement
- **WHEN** the replacement for a red 3 is also a red 3
- **THEN** both SHALL be laid and a further replacement SHALL be drawn

### Requirement: Black threes
Black 3s (clubs or spades) SHALL NOT be melded or added to a meld, SHALL be discardable, and SHALL block pickup while on top of the discard pile.

#### Scenario: Meld with a black 3
- **WHEN** a player tries to create a meld containing the 3 of spades
- **THEN** the meld SHALL be rejected and the cards SHALL remain in the player's pile

#### Scenario: Discard a black 3
- **WHEN** a player discards the 3 of clubs
- **THEN** it SHALL become the top discard

### Requirement: Draw pile exhaustion
When a discard passes the turn and the draw pile holds fewer than drawCount cards, the round SHALL end immediately without anyone going out, and SHALL be scored as it stands.

#### Scenario: Stock runs out
- **WHEN** a player discards while the draw pile holds 1 card
- **THEN** the round SHALL be scored, and the phase SHALL be round-over or game-over

#### Scenario: Enough cards remain
- **WHEN** a player discards while the draw pile holds 2 cards
- **THEN** play SHALL continue with the next player in must-draw

## MODIFIED Requirements

### Requirement: Setup and deal
Setup SHALL require exactly 4 players, deal each player 11 hand cards and 11 foot cards, assign teams by seat order (1st and 3rd red, 2nd and 4th blue), flip one card to the discard pile, and start in phase playing, round 1, first player's turn, step must-draw. Red 3s dealt into hands SHALL be laid and replaced before play begins, and feet SHALL NOT be checked until entered. Each team SHALL start with no laid red 3s unless dealt them.

#### Scenario: Standard deal
- **WHEN** 4 players start with default rules
- **THEN** each player SHALL hold 11 hand and 11 foot cards, the discard pile SHALL hold 1 card, and turnStep SHALL be must-draw

#### Scenario: Wrong player count
- **WHEN** 3 players are supplied
- **THEN** setup SHALL throw an invalid-rules GameRuleError

#### Scenario: Team assignment
- **WHEN** players are [p1, p2, p3, p4]
- **THEN** p1 and p3 SHALL be red and p2 and p4 SHALL be blue

#### Scenario: No red 3s in starting hands
- **WHEN** play begins
- **THEN** no player's hand SHALL contain a red 3

### Requirement: Drawing
During must-draw the current player SHALL draw exactly drawCount (2) cards from the draw pile into their active pile, laying and replacing any red 3s drawn, after which the step SHALL be must-discard. Drawing SHALL be rejected outside must-draw.

#### Scenario: Draw two
- **WHEN** p1 draws at the start of their turn and neither card is a red 3
- **THEN** p1's hand SHALL go from 11 to 13 cards and turnStep SHALL be must-discard

#### Scenario: Draw twice
- **WHEN** p1 tries to draw again after drawing
- **THEN** the draw SHALL be rejected

### Requirement: Discarding
After drawing or picking up, the current player SHALL discard exactly one card from their active pile onto the discard pile; play SHALL then pass to the next seat (wrapping) with step must-draw. Discarding SHALL be rejected during must-draw. Discarding the last card of the hand SHALL move the player into their foot. Discarding the last card of the foot SHALL go out when the team has the required books, and SHALL otherwise be rejected with the card kept.

#### Scenario: Discard passes the turn
- **WHEN** p1 discards after drawing
- **THEN** currentPlayerIndex SHALL be 1 and turnStep SHALL be must-draw

#### Scenario: Discard into the foot
- **WHEN** a player discards the last card in their hand
- **THEN** the player's activePile SHALL become foot and the turn SHALL pass

#### Scenario: Go out by discarding
- **WHEN** a player whose team holds a clean and a dirty book discards their last foot card
- **THEN** the round SHALL end

#### Scenario: Cannot discard out without books
- **WHEN** a player whose team lacks a clean book tries to discard their last foot card
- **THEN** the discard SHALL be rejected and the card SHALL remain in the foot

### Requirement: Creating melds
After drawing or picking up, a player SHALL be able to create a meld of at least 3 cards with at least 2 naturals of a single rank other than 3 and no more wild cards (2s and jokers) than naturals. A team's first meld SHALL meet the opening minimum for the round, counting only the cards in that meld. Rejected cards SHALL be returned to the player.

#### Scenario: Opening minimum not met
- **WHEN** a team's first meld in round 1 is three 4s worth 15 points
- **THEN** the meld SHALL be rejected because it is below 50

#### Scenario: Opening minimum met
- **WHEN** a team's first meld in round 1 is five Ks worth 50 points
- **THEN** the meld SHALL be accepted

#### Scenario: Too many wilds
- **WHEN** a meld has more wild cards than naturals
- **THEN** the meld SHALL be rejected and the cards SHALL remain in the player's pile

#### Scenario: Meld of 3s
- **WHEN** a player melds three black 3s
- **THEN** the meld SHALL be rejected

### Requirement: Adding to melds
A player SHALL be able to add cards to their own team's existing meld when every added card is the meld's rank or wild and the result keeps at least 2 naturals and no more wilds than naturals. Adding zero cards, adding to the other team's meld, adding to a missing meld, or adding any 3 SHALL be rejected.

#### Scenario: Excess wilds rejected
- **WHEN** four wilds are added to a meld of three 8s
- **THEN** the action SHALL be rejected and the four wilds SHALL remain in the player's hand

#### Scenario: Other team's meld
- **WHEN** a player targets a meld owned by the other team
- **THEN** the action SHALL be rejected

### Requirement: Entering the foot
When a meld or a discard empties a player's hand while they are playing from the hand, the player SHALL switch to playing from their foot, and any red 3s in the foot SHALL then be laid and replaced.

#### Scenario: Hand emptied by melding
- **WHEN** a meld uses the last card in a player's hand
- **THEN** the player's activePile SHALL become foot

#### Scenario: Hand emptied by discarding
- **WHEN** a player discards the last card in their hand
- **THEN** the player's activePile SHALL become foot

### Requirement: Going out
A player SHALL go out by emptying their foot through a meld or a discard, and only when their team already has at least one clean book and one dirty book. Without those books, a meld from the foot SHALL be rejected unless it leaves at least 2 cards, so the player can still discard and keep a card. Going out SHALL end the round.

#### Scenario: Going out without books
- **WHEN** a player tries to meld their last foot cards and their team has no books
- **THEN** the meld SHALL be rejected

#### Scenario: Going out with books
- **WHEN** the team holds a clean and a dirty book and the player melds their last foot cards
- **THEN** the round SHALL end

#### Scenario: Meld floor without books
- **WHEN** a player with 4 foot cards and no books melds 3 of them
- **THEN** the meld SHALL be rejected because only 1 card would remain

### Requirement: Round scoring
At round end each team SHALL score the card points of its melds plus 500 per clean book and 300 per dirty book plus 100 per laid red 3, minus the card points of cards left in its players' hands and feet, with each red 3 still in an unplayed foot counting −500 instead of its card points. Scores SHALL be appended to roundScores and added to teamScores, and the phase SHALL become game-over when either team reaches 8500, otherwise round-over.

#### Scenario: Clean book bonus
- **WHEN** a team's only meld is a clean book of seven Ks, its players hold no cards and it has no red 3s
- **THEN** the team SHALL score 570 for the round

#### Scenario: Laid red 3s
- **WHEN** a team has laid two red 3s and has no melds and no cards left
- **THEN** the team SHALL score 200 for the round

#### Scenario: Red 3 left in a foot
- **WHEN** a team's unplayed foot holds one red 3 and no other cards remain and the team has no melds
- **THEN** the team SHALL score −500 for the round

#### Scenario: Black 3 in hand
- **WHEN** a team ends the round holding only one black 3 and has no melds
- **THEN** the team SHALL score −5 for the round

### Requirement: Hidden information
A player's view SHALL include their own hand, and their own foot only once they are playing from it. Other players SHALL be shown only as card counts, with foot counts only once that player is in their foot. A spectator view SHALL show counts only. Every view SHALL show each team's laid red 3s. Views SHALL be defensive copies.

#### Scenario: Opponent hand hidden
- **WHEN** p1 views the game at the start
- **THEN** p2's hand SHALL be absent and p2's hand count SHALL be 11

#### Scenario: Red 3s are public
- **WHEN** the red team has laid a red 3 and a blue player views the game
- **THEN** the view SHALL list that red 3 for the red team
