# Copilot instructions for `hengames`

## Build, test, and lint commands

Run from repository root:

```powershell
npm install
npm run lint
npm run typecheck
npm run test
npm run build
```

Target a single test file (Vitest) by workspace:

```powershell
npm run test -w @hengames/server -- src/rooms/roomStore.test.ts
npm run test -w @hengames/game-engine -- src/hand-and-foot/actions.test.ts
```

Useful package-scoped commands:

```powershell
npm run dev -w @hengames/server
npm run dev -w @hengames/web
npm run build -w @hengames/web
```

## High-level architecture

- This is an npm workspaces monorepo:
  - `apps/server`: Express + tRPC + WebSocket server
  - `apps/web`: Vite + React client
  - `packages/game-engine`: Hand and Foot rules/state transitions
  - `packages/shared`: cross-package domain types and game interfaces
- The server is authoritative for room and game state. `createRoomStore()` owns room lifecycle, participants, seating/readiness, and applying game actions.
- `createAppRouter()` is a thin API layer: validate input with Zod, call room-store methods, and broadcast updates over WebSocket after state-changing mutations.
- Live room updates are pushed from `wsHub` (`/ws`) using room snapshots; HTTP/tRPC is used for commands and initial reads.
- The game engine is plugged in through `GameDefinition` (`@hengames/shared`), with current implementation `handAndFootDefinition`.
- Production runtime is a single Node server serving API, WebSocket, health endpoint, and built web assets from `apps/server/dist/public`.

## Key repository conventions

- Keep shared contracts in `@hengames/shared`; both server and web consume these types directly.
- Preserve server-authoritative flow: UI should call tRPC mutations; room/game state changes belong in `roomStore`, not in React state.
- Maintain token naming conventions:
  - external API fields commonly use `participantToken`
  - room-store internals use `token`
  - `getRoom` can read token from tRPC context (`Authorization: Bearer ...`) when not passed explicitly.
- Normalize room codes to uppercase before matching/lookup/broadcast behavior.
- In `createAppRouter()`, mutations that update existing room snapshots call `wsHub.broadcastRoom(code, roomStore)` after successful state changes; `createRoom` is the only exception.
- Use `GameRuleError` for rule-validation failures in game engine actions.
- Vitest tests are colocated with source files (`*.test.ts`). Server router tests use `router.createCaller(...)` rather than HTTP-level integration for most behavior checks.
- The root `test` script currently runs `@hengames/game-engine` and `@hengames/server` suites; web tests are not part of the root test script unless explicitly wired.
