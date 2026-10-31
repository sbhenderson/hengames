# web-app-shell Specification

## Purpose
Specifies the as-built web client shell in apps/web/src: view routing, profile persistence, room synchronisation, notifications, sound/haptic feedback and development preview routes.

## Requirements

### Requirement: View routing
The client SHALL route by in-memory state rather than URLs: the landing page, then the Pyramids game for solo play or the room browser for Hand and Foot, then the lobby while a room is waiting and the game table while it is playing. Leaving a room SHALL return to the room browser.

#### Scenario: Reload
- **WHEN** the page is reloaded
- **THEN** the app SHALL start on the landing page

#### Scenario: Leave room
- **WHEN** a player leaves a room
- **THEN** the room browser SHALL be shown

### Requirement: Profile persistence
The client SHALL keep its profile token and profile in localStorage (hengames.profileToken, hengames.sessionProfile) and SHALL call ensureProfile once on load, adopting the server's name, avatar and stats.

#### Scenario: Returning visitor
- **WHEN** a browser with a stored token loads the app
- **THEN** the server profile for that token SHALL be shown

### Requirement: Room synchronisation
While in a room the client SHALL subscribe to the room WebSocket and SHALL also poll getRoom every 5 seconds, preferring the WebSocket snapshot when present. The socket SHALL reconnect with exponential backoff from 1 second up to 10 seconds.

#### Scenario: Reconnect backoff
- **WHEN** the socket fails to open three times in a row
- **THEN** the reconnect delays SHALL be 1, 2 and 4 seconds

### Requirement: Notification history
The client SHALL record a notification for each new game event with a higher sequence number than any already seen, SHALL keep at most 50, and SHALL reset the history when a new game instance starts.

#### Scenario: Duplicate snapshot
- **WHEN** the same event arrives via socket and poll
- **THEN** only one notification SHALL be recorded

### Requirement: Sound and haptics
A sound-and-haptics toggle SHALL default to off and persist in localStorage; when on, the client SHALL play synthesized cues and vibration patterns for game events.

#### Scenario: Default off
- **WHEN** a first-time visitor loads the app
- **THEN** sound and haptics SHALL be off

### Requirement: Development previews
In development builds only, ?preview=cards SHALL render a card gallery and any other preview value SHALL render the game table from fixture data.

#### Scenario: Game preview
- **WHEN** the dev app is opened with ?preview=game
- **THEN** the game table SHALL render with fixture data
