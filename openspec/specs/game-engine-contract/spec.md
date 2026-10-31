# game-engine-contract Specification

## Purpose
Defines the shared GameDefinition plug-in contract in @hengames/game-engine and the GAME_CATALOG in @hengames/shared that every HenGames game implements, so rooms, solo sessions and the landing page stay game-agnostic.

## Requirements

### Requirement: Game catalog
The system SHALL publish a GAME_CATALOG listing every playable game with id, displayName, mode (solo or multiplayer), emoji, tagline, description, minPlayers and maxPlayers, and SHALL currently contain exactly Hand and Foot (multiplayer, 4 players) and Pyramids (solo, 1 player).

#### Scenario: Catalog lists both games
- **WHEN** the catalog is read via the listGames query
- **THEN** it returns hand-and-foot with mode multiplayer and min/max players 4, and pyramids with mode solo and min/max players 1

#### Scenario: Unknown game lookup
- **WHEN** findGame is called with an id not in the catalog
- **THEN** it SHALL throw `Unknown game: <id>`

### Requirement: GameDefinition interface
Each game SHALL be implemented as a GameDefinition exposing id, defaultRules, createInitialState(players, rules, seed), getPlayerView(state, viewerId) and applyAction(state, playerId, action), and the registry SHALL resolve a definition by game id.

#### Scenario: Registry resolves Hand and Foot
- **WHEN** getGameDefinition("hand-and-foot") is called
- **THEN** it SHALL return the Hand and Foot definition

#### Scenario: Registry rejects unknown ids
- **WHEN** getGameDefinition is called with an unregistered id
- **THEN** it SHALL throw an error naming the unknown game

### Requirement: Immutable action application
applyAction SHALL NOT mutate the state passed to it; it SHALL return a new state, and a rejected action SHALL leave the caller's state unchanged.

#### Scenario: Rejected action leaves state intact
- **WHEN** an action is rejected with a GameRuleError
- **THEN** the original state object SHALL be identical to before the call

### Requirement: Typed rule errors
Rule violations SHALL be raised as GameRuleError carrying one of the codes invalid-action, invalid-player, invalid-rules, not-your-turn or room-not-ready.

#### Scenario: Out-of-turn action
- **WHEN** a player acts when it is not their turn
- **THEN** a GameRuleError with code not-your-turn SHALL be thrown

### Requirement: Deterministic seeded shuffle
Decks SHALL be shuffled deterministically from a string seed, so the same seed and rules always produce the same deal.

#### Scenario: Same seed, same deal
- **WHEN** two games are created with identical rules and seed
- **THEN** their initial card order SHALL be identical
