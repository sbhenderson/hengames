# hengames

A full-stack TypeScript card game application. It started with Hand and Foot — making it easy to play together without managing physical decks, shuffling, or table state — and now hosts a small library of games behind a shared landing page.

The implementation uses a Vite React client, a TypeScript Node server, tRPC for typed commands and queries, and WebSocket broadcasts for live room updates. The server owns game state, and every game is plugged in through the same `GameDefinition` interface so new card games or house-rule variants can be added without rewriting the room system.

## Games

| Game | Mode | Description |
| --- | --- | --- |
| Hand and Foot | 4 players, 2 teams | The classic partnership canasta variant played in rooms with seats, readiness, and spectators. |
| Pyramids | Solo | Clear a 28-card pyramid by playing cards one rank above or below the target. Aces are high and low. Streaks pay bonus points, and collected points build a running high score. |

Games are registered in `GAME_CATALOG` (`@hengames/shared`) and implemented as a `GameDefinition` in `@hengames/game-engine`.

### Hand and Foot

Played in a room: the host creates it (choosing how many decks, default 6), players take seats, mark
themselves ready, and anyone else spectates. The server owns the deal, turn order, and scoring, and
broadcasts a fresh snapshot over WebSocket after every action.

The table is mobile-first. A sticky HUD carries the round number, whose turn it is, and what that
player must do next; the felt below shows the draw and discard piles plus both teams' melds, so you
can always see what the opposition has built. Your own cards sit in a tray you can drag to reorder,
tap to multi-select for melding, and the app subtly highlights cards that could form a new book,
extend an existing one, or act as a wild.

### Pyramids

A solo game — no room, no seats, just press start. Twenty-eight cards are dealt into a pyramid over a
single face-up target card. Play any card one rank above or below the target to clear it; aces wrap
both ways, so they connect to both kings and twos. Consecutive clears build a streak that pays bonus
points, and if you stall you flip a new target from the stock at the cost of your streak. Points bank
into a running high score, and the best runs land on a shared high-score table. Clearing the whole
pyramid pays a completion bonus; the game ends when the pyramid is empty, or when the stock runs out
with no legal move left.

## Development

Install dependencies:

```bash
npm install
```

Run the web client and server:

```bash
npm run dev
```

The server listens on `http://localhost:3000`. The Vite client listens on `http://localhost:5173`.

Run checks:

```bash
npm run typecheck
npm run test
npm run build
```

Build and run the production container locally:

```bash
docker build -t hengames .
docker run --rm -p 3000:3000 hengames
```

The container serves the React app, tRPC API, WebSocket endpoint, and health check from `http://localhost:3000`.

## Deployment

The `CI and Docker` GitHub Actions workflow verifies typecheck, tests, and build on pull requests and
pushes. On pushes to `main`, tags matching `v*.*.*`, or manual dispatches, it also builds the image
and publishes it to the GitHub Container Registry as `ghcr.io/sbhenderson/hengames`.

Published tags:

| Tag | Source |
| --- | --- |
| `main` | Latest push to the `main` branch |
| `v1.2.3` | A pushed `v*.*.*` release tag |
| `sha-<commit>` | Every built commit, for pinning to an exact build |

Run the published image:

```bash
docker run --rm -p 3000:3000 ghcr.io/sbhenderson/hengames:main
```

Then open `http://localhost:3000`. If the package is private, authenticate first with a GitHub token
that has `read:packages`:

```bash
echo "$GITHUB_TOKEN" | docker login ghcr.io -u <your-username> --password-stdin
```

The container listens on port 3000 (override with `PORT`) and exposes `/health` for readiness checks.
State is in-memory, so a restart clears all rooms and scores — run a single replica rather than
scaling it horizontally.

## Current scope

- A landing page that lets you pick a game, with your profile pinned to the top.
- A durable player profile (name, icon, per-game stats) that follows you into every game.
- Active in-memory room discovery.
- Host-created Hand and Foot rooms.
- Seat selection, readiness, and spectators.
- Server-authoritative Hand and Foot and Pyramids state.
- A mobile-first Hand and Foot table: compact status HUD, drag-to-reorder hand, multi-card selection, and subtle meld/book hints.
- Solo Pyramids sessions with running high scores and a shared high-score table.
- tRPC commands and WebSocket room snapshots.

Rooms, profiles, and high scores are held in memory and clear when the server restarts. A browser keeps its `hengames.profileToken` in `localStorage`, and the server adopts unrecognised tokens, so a player's name and icon are restored after a restart even though their score history is not.

## Architecture

```text
apps/server      Node + tRPC + WebSocket hub; owns all game state
apps/web         Vite React client
packages/shared  Types, game catalog, card model shared by both
packages/game-engine  GameDefinition implementations (hand-and-foot, pyramids)
```

The server is authoritative: the client never computes game state, it sends a command and renders the
snapshot it gets back. Each game implements the same `GameDefinition` interface, so the room system,
profiles, and notifications work for any game plugged into `GAME_CATALOG`.

On the client, the Hand and Foot table is split into `GameHud`, `TableSurface`, `PlayerStrip`, and
`HandTray`, with the non-visual logic factored into pure, unit-tested helpers
(`gameTableHelpers.ts`, `cardDisplay.ts`) — card-order reconciliation, turn prompts, selection
analysis, and meld hint classification.

### Previewing the table without a game

The game table renders from a snapshot, so it can be driven by fixture data:

```bash
npm run dev
# then open http://localhost:5173/?preview=game
```

`_shot.mjs` screenshots any route at a chosen viewport, which is the quickest way to check mobile
layout:

```bash
node _shot.mjs "http://localhost:5173/?preview=game" shot.png 402 860 viewport
```

## Known gaps

- Double-tapping a selected card discards it, but that shortcut is only advertised in small helper
  text — a destructive action with a weak affordance.
- The "Add to meld" buttons only appear once a valid selection exists, so nothing hints they exist
  beforehand.
- No animation on draw, meld, or discard; state changes swap in instantly.
- All state is in-memory, so nothing survives a restart and the server cannot be scaled horizontally.
