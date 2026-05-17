# hengames

A full-stack TypeScript card game application focused first on making Hand and Foot easy to play together without managing physical decks, shuffling, or table state.

The first implementation uses a Vite React client, a TypeScript Node server, tRPC for typed commands and queries, and WebSocket broadcasts for live room updates. The server owns game state, rooms are anonymous and in-memory for the first version, and the game engine is designed around a standard interface so future card games or house-rule variants can be added without rewriting the room system.

## Development

Install dependencies:

```powershell
npm install
```

Run the web client and server:

```powershell
npm run dev
```

The server listens on `http://localhost:3000`. The Vite client listens on `http://localhost:5173`.

Run checks:

```powershell
npm run typecheck
npm run test
npm run build
```

## Current scope

- Anonymous participants with optional display names.
- Active in-memory room discovery.
- Host-created Hand and Foot rooms.
- Seat selection, readiness, and spectators.
- Server-authoritative Hand and Foot state.
- tRPC commands and WebSocket room snapshots.

Rooms clear when the server restarts.
