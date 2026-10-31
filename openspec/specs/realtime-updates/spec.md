# realtime-updates Specification

## Purpose
Specifies the as-built WebSocket hub in apps/server/src/wsHub.ts that pushes per-viewer room snapshots to connected clients.

## Requirements

### Requirement: Subscribing
Clients SHALL subscribe by connecting to /ws with a code query parameter (normalised to upper case) and an optional participantToken; a connection without a code SHALL be closed with code 1008.

#### Scenario: Missing code
- **WHEN** a client connects to /ws without a code
- **THEN** the socket SHALL be closed with code 1008

### Requirement: Snapshot broadcast
After every successful room mutation other than creation, the server SHALL send each open client of that room a message of type room-snapshot containing a snapshot built for that client's token, and SHALL NOT send it to clients of other rooms.

#### Scenario: Room scoped
- **WHEN** a player readies up in room ABC234
- **THEN** only clients subscribed to ABC234 SHALL receive a snapshot

### Requirement: Per-viewer snapshots
Each client's snapshot SHALL be built for its own token so that it reveals only that viewer's private cards, SHALL never include any participant token, and a failure building one client's snapshot SHALL NOT prevent delivery to others.

#### Scenario: Private hand
- **WHEN** two seated players receive a snapshot
- **THEN** each SHALL see only their own hand

#### Scenario: Bad token isolated
- **WHEN** one subscribed client has an invalid token
- **THEN** the other clients SHALL still receive snapshots

### Requirement: Disconnect cleanup
Closed sockets SHALL be removed from the hub.

#### Scenario: Client leaves
- **WHEN** a client disconnects
- **THEN** it SHALL receive no further broadcasts
