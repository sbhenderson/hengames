# game-rooms Specification

## Purpose
Specifies the as-built multiplayer room lifecycle in apps/server/src/rooms for Hand and Foot: creation, codes, deck options, seats and teams, readiness, starting, host controls, discovery and inactivity cleanup.

## Requirements

### Requirement: Room creation
createRoom SHALL create a Hand and Foot room in status waiting with the creator as host, seated as a spectator, and SHALL return the creator's participant token.

#### Scenario: Host starts as spectator
- **WHEN** a room is created
- **THEN** the host SHALL be listed as a spectator and no seat SHALL be occupied

### Requirement: Room codes
Each room SHALL have a unique 6-character code from an alphabet excluding I, O, 0 and 1, and code lookup SHALL be case-insensitive.

#### Scenario: Case-insensitive join
- **WHEN** a player joins with the lowercase code
- **THEN** they SHALL join the room

### Requirement: Deck count option
The host SHALL be able to choose a deck count, defaulting to 6, as an integer from 2 to 8; the started game SHALL use that count.

#### Scenario: Out of range
- **WHEN** a room is created with deckCount 9
- **THEN** creation SHALL be rejected

#### Scenario: Configured count used
- **WHEN** a room with 4 decks starts
- **THEN** the game SHALL be dealt from 4 decks

### Requirement: Seats and teams
A room SHALL have four seats — north and south on the red team, east and west on the blue team. While waiting, a participant SHALL be able to take an open seat; taking an occupied seat SHALL be rejected, and moving seats SHALL clear the participant's ready state.

#### Scenario: Occupied seat
- **WHEN** a player picks a seat already taken
- **THEN** it SHALL be rejected

#### Scenario: Moving clears ready
- **WHEN** a ready player moves to another seat
- **THEN** they SHALL be not ready

### Requirement: Ready and start
Seated participants SHALL be able to mark themselves ready while waiting. Only the host SHALL be able to start, and only when all four seats are occupied and ready; starting SHALL deal a new game in seat order north, east, south, west and set the status to playing.

#### Scenario: Not all ready
- **WHEN** the host starts with an unready seated player
- **THEN** start SHALL be rejected

#### Scenario: Non-host start
- **WHEN** a non-host tries to start
- **THEN** start SHALL be rejected

### Requirement: Game actions
During play only seated participants SHALL be able to submit game actions, and the room SHALL become finished when the game reaches game-over.

#### Scenario: Spectator action
- **WHEN** a spectator submits a draw
- **THEN** it SHALL be rejected

### Requirement: Spectators and host controls
Joining SHALL add a participant as a spectator. While waiting, the host SHALL be able to reset all seats to spectators and to remove any other participant.

#### Scenario: Reset lobby
- **WHEN** the host resets the lobby
- **THEN** every seated participant SHALL become a spectator

### Requirement: Room discovery
listRooms SHALL return every room with its code, game, status, seated player count, spectator count and creation time.

#### Scenario: Listing
- **WHEN** two rooms exist
- **THEN** both SHALL be listed

### Requirement: Display names in events
Game event text shown to clients SHALL replace participant ids with display names.

#### Scenario: Named announcement
- **WHEN** a player draws
- **THEN** the event text SHALL contain their display name and not their id

### Requirement: Inactivity cleanup
A room with no state-changing activity for 5 minutes and no open WebSocket client SHALL be removed by a sweep that runs every 60 seconds.

#### Scenario: Idle room closed
- **WHEN** a room has had no activity for 5 minutes and nobody is connected
- **THEN** the next sweep SHALL remove it
