# Hand and Foot Card Game Design

## Problem

Build a simple full-stack card game site where anonymous users can create, discover, join, and play shared card game rooms. The first playable game is Hand and Foot. The implementation should remove the in-person friction of managing many decks, shuffling, turn state, melds, books, and scoring while keeping the architecture open for future games and house-rule changes.

## Scope

The first version supports Hand and Foot only, but it must expose a standard game-engine interface so future games such as Poker or Texas Hold 'Em can be added later. Rooms and games are stored in memory while the server is running. Server restarts intentionally clear active rooms.

The app does not need user accounts, persistent game history, matchmaking, chat, payments, or production-scale hosting concerns in the first version.

## Architecture

The project will use a monorepo-style TypeScript structure:

- `apps/web`: Vite React client.
- `apps/server`: Node TypeScript server.
- `packages/shared`: shared room, player, card, game, and tRPC types.
- `packages/game-engine`: generic game contracts and Hand and Foot implementation.

The server is authoritative for all room and game state. Clients never mutate game state locally except for temporary UI selection state. The client sends commands and queries through tRPC. The server validates each command, applies it to room or game state, and then broadcasts sanitized snapshots over WebSocket channels to connected clients in the affected room.

This hybrid approach keeps the command surface strongly typed through tRPC while using straightforward WebSocket broadcasts for live state updates.

## Room Flow

The home page lists all currently active in-memory rooms with their game, status, player count, and join or spectate options. Users can also create a new Hand and Foot room from the home page.

Room codes and links may still exist for sharing, but users do not need a code to find a room in the first version. A visitor can provide an optional display name. If no name is provided, the app assigns an anonymous name.

Room creators become hosts. Before the game starts, the host can start, reset, or kick participants from the room. Seated players choose open seats and teams, then ready up. Extra users can remain spectators.

## Game Flow

During play, each seated player sees their private hand and foot piles, available actions, current turn prompt, and the public table state. Spectators only see public state. The UI should work well on phones and computers, with large touch targets, clear action buttons, and readable card groupings.

The server sends each participant a player-specific view so private cards are never sent to other players or spectators.

## Game Engine Interface

The shared game interface will define:

- `GameDefinition`: metadata, default rules, supported actions, and setup.
- `GameRules`: configurable rule values and variants.
- `GameState`: authoritative internal state.
- `PlayerView`: sanitized per-player state sent to clients.
- `PlayerAction`: typed user intent submitted from the UI.
- `applyAction`: validation and reducer-style transition from current state to next state.

Room state remains separate from game state. Room state includes code, host, participants, spectators, seats, readiness, selected game, and selected rules. Game state contains only game-specific data.

## Hand and Foot Rules

The first Hand and Foot implementation uses a common configurable baseline:

- Four player seats in two teams.
- Five decks with jokers.
- Eleven-card hand and eleven-card foot per player.
- Draw two cards and discard one card per turn.
- Round opening meld minimums of 50, 90, 120, and 150.
- Meld creation and addition are strictly validated.
- Clean and dirty books are tracked and scored.
- Foot transition is enforced.
- Going-out requirements are enforced.
- Round scoring and game-end detection are automated.

House-rule values should live in a rules object instead of being scattered through the implementation. This allows changes to deck count, hand size, foot size, team layout, meld minimums, wild-card handling, book requirements, discard restrictions, going-out requirements, scoring values, and game-end target without changing the room system.

## Error Handling and Reconnection

The server rejects invalid commands with explicit typed errors. Examples include acting out of turn, attempting an illegal meld, joining a full seat, starting before players are ready, or submitting an action for the wrong participant.

WebSocket clients reconnect automatically. After reconnecting, the client re-fetches the latest room snapshot through tRPC and resumes receiving broadcasts. Because state is in-memory, reconnect only works while the same server process is still running.

## Testing

Testing should focus first on pure game-engine behavior:

- Deck construction and dealing.
- Turn validation.
- Draw and discard rules.
- Meld and book legality.
- Foot transition.
- Going-out requirements.
- Round scoring and game-end detection.
- Player-view privacy.

API tests should cover room creation, active room listing, joining, spectating, seat selection, readiness, host controls, game start, command authorization, and invalid command errors.

## Notes

The design intentionally favors a small first deployment over persistence or account features. The key architectural commitment is that rooms and transport remain game-agnostic while Hand and Foot lives behind a clear game definition interface.
