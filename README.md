# hengames

A full-stack TypeScript card game application. It started with Hand and Foot — making it easy to play together without managing physical decks, shuffling, or table state — and now hosts a small library of games behind a shared landing page.

The implementation uses a Vite React client, a TypeScript Node server, tRPC for typed commands and queries, and WebSocket broadcasts for live room updates. The server owns game state, and every game is plugged in through the same `GameDefinition` interface so new card games or house-rule variants can be added without rewriting the room system.

## Games

| Game | Mode | Description |
| --- | --- | --- |
| Hand and Foot | 4 players, 2 teams | The classic partnership canasta variant played in rooms with seats, readiness, and spectators. |
| Pyramids | Solo | Clear a 28-card pyramid by playing cards one rank above or below the target. Aces are high and low. Streaks pay bonus points, and collected points build a running high score. |

Games are registered in `GAME_CATALOG` (`@hengames/shared`) and implemented as a `GameDefinition` in `@hengames/game-engine`.

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

Build and run the production container locally:

```powershell
docker build -t hengames .
docker run --rm -p 3000:3000 hengames
```

The container serves the React app, tRPC API, WebSocket endpoint, and health check from `http://localhost:3000`.

## Deployment

The `CI and Docker` GitHub Actions workflow verifies typecheck, tests, and build on pull requests and pushes. On pushes to `main`, tags matching `v*.*.*`, or manual dispatches, it also publishes a Docker image to GitHub Container Registry:

```text
ghcr.io/<owner>/<repo>
```

Run the published image with:

```powershell
docker run --rm -p 3000:3000 ghcr.io/<owner>/<repo>:main
```

## Current scope

- A landing page that lets you pick a game, with your profile pinned to the top.
- A durable player profile (name, icon, per-game stats) that follows you into every game.
- Active in-memory room discovery.
- Host-created Hand and Foot rooms.
- Seat selection, readiness, and spectators.
- Server-authoritative Hand and Foot and Pyramids state.
- Solo Pyramids sessions with running high scores and a shared high-score table.
- tRPC commands and WebSocket room snapshots.

Rooms, profiles, and high scores are held in memory and clear when the server restarts. A browser keeps its `hengames.profileToken` in `localStorage`, and the server adopts unrecognised tokens, so a player's name and icon are restored after a restart even though their score history is not.
