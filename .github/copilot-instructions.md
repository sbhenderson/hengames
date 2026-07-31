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
  - `packages/game-engine`: game rules/state transitions (`hand-and-foot`, `pyramids`, plus a shared `common/deck` helper and a `registry`)
  - `packages/shared`: cross-package domain types and game interfaces
- Games are declared in `GAME_CATALOG` (`packages/shared/src/game.ts`) and implemented as a `GameDefinition`; `getGameDefinition(gameId)` resolves one at runtime.
- The server is authoritative for room, game, profile, and solo-session state. `createRoomStore()` owns multiplayer room lifecycle; `createSoloStore()` owns single-player sessions; `createProfileStore()` owns durable player identity and per-game stats.
- `createAppRouter()` is a thin API layer: validate input with Zod, call store methods, and broadcast updates over WebSocket after state-changing room mutations.
- Live room updates are pushed from `wsHub` (`/ws`) using room snapshots; HTTP/tRPC is used for commands and initial reads. Solo games use tRPC only — there is nothing to broadcast.
- Production runtime is a single Node server serving API, WebSocket, health endpoint, and built web assets from `apps/server/dist/public`.

## Key repository conventions

- Keep shared contracts in `@hengames/shared`; both server and web consume these types directly.
- Preserve server-authoritative flow: UI should call tRPC mutations; room/game state changes belong in `roomStore`/`soloStore`, not in React state.
- Player identity is app-level. `ProfileProvider` (`apps/web/src/profile/`) owns the display name, avatar, and per-game stats; components read it with `useProfile()` rather than calling `loadSessionProfile()` themselves.
- The client keeps a durable `hengames.profileToken` in `localStorage`; the server adopts unrecognised tokens so identity survives a restart.
- Web components declare their own structural mirror of a game's player view (e.g. `game-table/types.ts`, `pyramids/types.ts`) instead of depending on `@hengames/game-engine`.
- Maintain token naming conventions:
  - external API fields commonly use `participantToken` (rooms) or `profileToken` (profiles and solo games)
  - room-store internals use `token`
  - `getRoom` can read token from tRPC context (`Authorization: Bearer ...`) when not passed explicitly.
- Normalize room codes to uppercase before matching/lookup/broadcast behavior.
- In `createAppRouter()`, mutations that update existing room snapshots call `wsHub.broadcastRoom(code, roomStore)` after successful state changes; `createRoom` is the only exception.
- Use `GameRuleError` for rule-validation failures in game engine actions.
- Vitest tests are colocated with source files (`*.test.ts`). Server router tests use `router.createCaller(...)` rather than HTTP-level integration for most behavior checks.
- The root `test` script runs the `@hengames/game-engine`, `@hengames/server`, and `@hengames/web` suites.
