# landing-and-lobby-ui Specification

## Purpose
Specifies the as-built landing page, profile header, Hand and Foot room browser and room lobby in the HenGames web client.

## Requirements

### Requirement: Landing page
The landing page SHALL show the HenGames title, the player's profile at the top, and one tile per catalog game showing its emoji, name, tagline, description, mode badge and player count; solo tiles SHALL also show high score, best game and games played.

#### Scenario: Both games shown
- **WHEN** the landing page loads
- **THEN** tiles for Hand and Foot and Pyramids SHALL be shown

### Requirement: Profile header
The profile header SHALL show `You are {name}` with an edit control that saves a trimmed non-empty name on Enter and cancels on Escape, and a regenerate control that assigns a new generated name and icon.

#### Scenario: Rename
- **WHEN** the player saves "  bob "
- **THEN** the name SHALL become bob

### Requirement: Avatar picker
Clicking the avatar SHALL open a dropdown grid of the avatar library, mark the current choice, and close after a selection.

#### Scenario: Change icon
- **WHEN** the player picks a different avatar
- **THEN** the avatar SHALL update and the dropdown SHALL close

### Requirement: Room browser
The Hand and Foot room browser SHALL list active rooms (refreshed every 3 seconds) as cards with code, status, player count and a join-or-spectate action, followed by a create-room card with a deck count defaulting to 6.

#### Scenario: No rooms
- **WHEN** no rooms exist
- **THEN** the text No active rooms yet. SHALL be shown

### Requirement: Lobby
The lobby SHALL show the room code, the chosen deck count, and the four seats with team, occupant and ready state; open seats SHALL offer Sit here, seated players SHALL get a ready toggle, and unseated players SHALL be told they are spectating.

#### Scenario: Spectating
- **WHEN** an unseated participant views the lobby
- **THEN** a message SHALL say they are spectating until they choose an open seat

### Requirement: Host controls
The host SHALL see Start game, Reset lobby seats, and a Kick button for every other participant.

#### Scenario: Host view
- **WHEN** the host views the lobby
- **THEN** Start game, Reset lobby seats and Kick buttons SHALL be shown
