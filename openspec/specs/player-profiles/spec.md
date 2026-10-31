# player-profiles Specification

## Purpose
Specifies the as-built durable player profile service in apps/server/src/profiles: token-based identity, generated names and avatars, editing, per-game statistics and the shared high-score table.

## Requirements

### Requirement: Token-based identity
ensureProfile SHALL return the existing profile for a known token, and SHALL otherwise create a new profile, adopting the client-supplied token when one is given so a returning browser keeps its identity after a server restart.

#### Scenario: Known token
- **WHEN** ensureProfile is called twice with the same token
- **THEN** both calls SHALL return the same profile id

#### Scenario: Unrecognised token adopted
- **WHEN** ensureProfile is called with a token the server has never seen
- **THEN** a new profile SHALL be created that uses that token

### Requirement: Generated names
When no display name is supplied, the server SHALL generate an adjective-animal name from fixed lists (adjectives brave, clever, cozy, curious, dapper, lucky, peeking, snappy; animals badger, fox, otter, penguin, raven, turtle, walrus, wombat).

#### Scenario: Default name
- **WHEN** a profile is created without a name
- **THEN** its name SHALL match the adjective-animal pattern, such as brave-walrus

### Requirement: Avatars
Each profile SHALL have an avatar of an emoji and a #RRGGBB hex colour, defaulting to one of 16 library choices. A supplied avatar SHALL be rejected if the emoji is empty or the colour is not a 6-digit hex value.

#### Scenario: Invalid colour
- **WHEN** an avatar with colour `red` is supplied
- **THEN** the update SHALL be rejected

### Requirement: Editing a profile
updateProfile SHALL require a known token, SHALL apply a trimmed non-empty display name, and SHALL ignore a blank name.

#### Scenario: Blank name ignored
- **WHEN** the name is updated to whitespace
- **THEN** the previous name SHALL be kept

#### Scenario: Unknown token
- **WHEN** updateProfile is called with an unknown token
- **THEN** it SHALL be rejected

### Requirement: Per-game statistics
Recording a game result SHALL increment gamesPlayed, add the score (rounded, floored at 0) to totalScore, update bestScore and lastScore, and count perfect games. A game never played SHALL report zeroed stats.

#### Scenario: Running total
- **WHEN** a player banks 100 and then 50 points
- **THEN** totalScore SHALL be 150, bestScore 100 and gamesPlayed 2

### Requirement: High-score table
The high-score table SHALL list profiles that have played the game, ranked by totalScore descending with ties ordered by display name, limited to 10 by default and at most 50.

#### Scenario: Ranking
- **WHEN** two players have totals of 300 and 500
- **THEN** the 500 player SHALL rank first

#### Scenario: Never played excluded
- **WHEN** a profile has no games of that type
- **THEN** it SHALL NOT appear in the table

### Requirement: No token disclosure
Profile data returned to clients SHALL be copies and SHALL NOT include the profile token.

#### Scenario: Public profile
- **WHEN** getProfile returns a profile
- **THEN** the response SHALL NOT contain the token
