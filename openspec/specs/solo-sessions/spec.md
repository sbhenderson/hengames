# solo-sessions Specification

## Purpose
Specifies the as-built server-side solo game sessions in apps/server/src/solo used by Pyramids: starting, acting on, collecting and expiring a session owned by one profile.

## Requirements

### Requirement: Starting a session
startSoloGame SHALL accept only solo games, SHALL ensure the caller's profile exists, and SHALL create a new session with a random seed owned by that profile token.

#### Scenario: Multiplayer rejected
- **WHEN** startSoloGame is called for hand-and-foot
- **THEN** it SHALL be rejected

#### Scenario: Profile created on demand
- **WHEN** startSoloGame is called with an unknown token
- **THEN** a profile SHALL be created and the session SHALL start

### Requirement: Session ownership
A session SHALL be accessible only with the token that started it.

#### Scenario: Another player's session
- **WHEN** a different token reads or acts on a session
- **THEN** it SHALL be rejected as belonging to another player

### Requirement: Playing
soloAction SHALL accept play and draw actions and return the updated session; collect SHALL NOT be accepted through soloAction.

#### Scenario: Collect via action rejected
- **WHEN** a collect action is sent through soloAction
- **THEN** it SHALL be rejected

### Requirement: Banking points
collectSoloPoints SHALL bank a finished game's score into the owner's profile statistics exactly once, and SHALL return the session, the points awarded and the updated stats.

#### Scenario: Collect banks score
- **WHEN** a finished game worth 185 points is collected
- **THEN** 185 SHALL be added to the profile's totalScore

### Requirement: Session status and running total
Each session snapshot SHALL report a status of playing, game-over or collected, and a highScore equal to the owner's banked running total.

#### Scenario: Second game
- **WHEN** a player collects two games
- **THEN** highScore SHALL equal the sum of both banked scores

### Requirement: Idle expiry
Sessions idle for one hour SHALL be removed by a periodic sweep, after which access SHALL fail with a message asking the player to start a new game.

#### Scenario: Expired session
- **WHEN** a session has been idle for more than an hour and the sweep runs
- **THEN** reading it SHALL fail
