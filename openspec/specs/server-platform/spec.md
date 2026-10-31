# server-platform Specification

## Purpose
Specifies the as-built HTTP server, typed API surface and container packaging in apps/server/src/index.ts, the tRPC router and the Dockerfile/CI workflow.

## Requirements

### Requirement: Typed API
The server SHALL expose its API as tRPC procedures under /trpc: queries listGames, getProfile, listHighScores, getSoloGame, listRooms and getRoom, and mutations ensureProfile, updateProfile, startSoloGame, soloAction, collectSoloPoints, createRoom, joinRoom, updateAvatar, chooseSeat, setReady, resetLobby, kickParticipant, startGame and gameAction, validating inputs with zod.

#### Scenario: Invalid input
- **WHEN** chooseSeat is called with an unknown seat id
- **THEN** the request SHALL be rejected before reaching the room store

### Requirement: Health check
GET /health SHALL respond 200 with {"ok":true}.

#### Scenario: Healthy
- **WHEN** GET /health is requested
- **THEN** the response SHALL be 200 with {"ok":true}

### Requirement: Single-origin web hosting
When a built web app is present in the static assets directory (STATIC_ASSETS_DIR, defaulting to ./public beside the server), the server SHALL serve it and SHALL return index.html for other GET paths.

#### Scenario: SPA fallback
- **WHEN** GET /some/client/path is requested
- **THEN** the server SHALL return index.html

### Requirement: Configuration
The server SHALL listen on PORT, defaulting to 3000.

#### Scenario: Default port
- **WHEN** PORT is unset
- **THEN** the server SHALL listen on 3000

### Requirement: In-memory state
Rooms, solo sessions, profiles and high scores SHALL be held in process memory and SHALL be lost on restart.

#### Scenario: Restart
- **WHEN** the server restarts
- **THEN** no rooms, sessions or scores SHALL remain

### Requirement: Container image
The repository SHALL build a single production container that runs typecheck, tests and build, serves the web app, API, WebSocket endpoint and health check on port 3000, and declares a HEALTHCHECK against /health. CI SHALL publish it to ghcr.io/sbhenderson/hengames on pushes to main (tag main), v*.*.* tags, and manual dispatch, with sha- tags per build.

#### Scenario: Published on main
- **WHEN** a commit is pushed to main and CI passes
- **THEN** ghcr.io/sbhenderson/hengames:main SHALL be updated

#### Scenario: Pull requests not published
- **WHEN** a pull request is built
- **THEN** the image SHALL be built but not pushed
