# Hand and Foot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working Vite React + TypeScript server app where anonymous users can discover in-memory Hand and Foot rooms, join as players or spectators, and play a strictly enforced server-authoritative game.

**Architecture:** Use npm workspaces with `apps/web`, `apps/server`, `packages/shared`, and `packages/game-engine`. The server owns all room and game state, exposes typed tRPC commands/queries, and broadcasts sanitized room snapshots over WebSocket channels. The game engine is pure TypeScript behind a generic interface so rooms and transport remain game-agnostic.

**Tech Stack:** TypeScript, npm workspaces, Vite, React, Express, tRPC, TanStack Query, ws, Zod, Vitest, ESLint.

---

## File Structure

- Create `package.json`: root workspace scripts and shared dev dependencies.
- Create `tsconfig.base.json`: shared strict TypeScript settings.
- Create `.gitignore`: Node/build artifacts.
- Create `packages/shared`: shared cards, game contracts, room DTOs, API types.
- Create `packages/game-engine`: pure game engine with Hand and Foot rules and tests.
- Create `apps/server`: Express + tRPC + WebSocket server, in-memory room store, API tests.
- Create `apps/web`: Vite React UI, tRPC client, WebSocket listener, room discovery, lobby, and game table.
- Modify `README.md`: add setup and run instructions after implementation exists.

## Task 1: Workspace Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/game-engine/package.json`
- Create: `packages/game-engine/tsconfig.json`
- Create: `packages/game-engine/src/index.ts`
- Create: `apps/server/package.json`
- Create: `apps/server/tsconfig.json`
- Create: `apps/server/vitest.config.ts`
- Create: `apps/server/src/index.ts`
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/index.html`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/App.tsx`

- [ ] **Step 1: Create the root workspace files**

Create `package.json`:

```json
{
  "name": "hengames",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "concurrently \"npm run dev -w @hengames/server\" \"npm run dev -w @hengames/web\"",
    "build": "npm run build -ws",
    "typecheck": "npm run typecheck -ws",
    "test": "npm run test -ws --if-present",
    "lint": "npm run lint -ws --if-present"
  },
  "devDependencies": {
    "@types/node": "^22.15.19",
    "concurrently": "^9.1.2",
    "eslint": "^9.27.0",
    "typescript": "^5.8.3",
    "vitest": "^3.1.4"
  }
}
```

Create `tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true
  }
}
```

Create `.gitignore`:

```gitignore
node_modules
dist
.vite
coverage
*.tsbuildinfo
.env
.env.*
!.env.example
```

- [ ] **Step 2: Create empty workspace package shells**

Create `packages/shared/package.json`:

```json
{
  "name": "@hengames/shared",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  }
}
```

Create `packages/shared/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "emitDeclarationOnly": false
  },
  "include": ["src"]
}
```

Create `packages/shared/src/index.ts`:

```ts
export const sharedPackageReady = true;
```

Create `packages/game-engine/package.json`:

```json
{
  "name": "@hengames/game-engine",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@hengames/shared": "0.1.0"
  },
  "devDependencies": {
    "vitest": "^3.1.4"
  }
}
```

Create `packages/game-engine/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true
  },
  "include": ["src"]
}
```

Create `packages/game-engine/src/index.ts`:

```ts
export const gameEnginePackageReady = true;
```

- [ ] **Step 3: Create the server package shell**

Create `apps/server/package.json`:

```json
{
  "name": "@hengames/server",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@hengames/game-engine": "0.1.0",
    "@hengames/shared": "0.1.0",
    "@trpc/server": "^11.1.2",
    "cors": "^2.8.5",
    "express": "^5.1.0",
    "ws": "^8.18.2",
    "zod": "^3.24.4"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^5.0.2",
    "@types/ws": "^8.18.1",
    "tsx": "^4.19.4",
    "vitest": "^3.1.4"
  }
}
```

Create `apps/server/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "types": ["node"]
  },
  "include": ["src", "vitest.config.ts"]
}
```

Create `apps/server/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node"
  }
});
```

Create `apps/server/src/index.ts`:

```ts
console.log("hengames server scaffold ready");
```

- [ ] **Step 4: Create the web package shell**

Create `apps/web/package.json`:

```json
{
  "name": "@hengames/web",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "tsc -p tsconfig.json && vite build",
    "preview": "vite preview",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@hengames/shared": "0.1.0",
    "@tanstack/react-query": "^5.76.1",
    "@trpc/client": "^11.1.2",
    "@trpc/react-query": "^11.1.2",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "zod": "^3.24.4"
  },
  "devDependencies": {
    "@types/react": "^19.1.4",
    "@types/react-dom": "^19.1.5",
    "@vitejs/plugin-react": "^4.4.1",
    "vite": "^6.3.5"
  }
}
```

Create `apps/web/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "noEmit": true
  },
  "include": ["src", "vite.config.ts"]
}
```

Create `apps/web/vite.config.ts`:

```ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173
  }
});
```

Create `apps/web/index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>hengames</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Create `apps/web/src/main.tsx`:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

Create `apps/web/src/App.tsx`:

```tsx
export function App() {
  return <main>hengames scaffold ready</main>;
}
```

- [ ] **Step 5: Install dependencies**

Run:

```powershell
npm install
```

Expected: `package-lock.json` is created and npm exits with code 0.

- [ ] **Step 6: Verify workspace builds**

Run:

```powershell
npm run typecheck
npm run build
```

Expected: both commands exit with code 0.

- [ ] **Step 7: Commit**

```powershell
git add .gitignore package.json package-lock.json tsconfig.base.json apps packages
git commit -m "chore: scaffold TypeScript workspace" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Task 2: Shared Domain Types and Game Contract

**Files:**
- Create: `packages/shared/src/cards.ts`
- Create: `packages/shared/src/game.ts`
- Create: `packages/shared/src/rooms.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Define card types**

Create `packages/shared/src/cards.ts`:

```ts
export type Suit = "clubs" | "diamonds" | "hearts" | "spades";
export type StandardRank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";
export type Rank = StandardRank | "JOKER";

export type Card = {
  id: string;
  rank: Rank;
  suit: Suit | "joker";
  deckIndex: number;
};

export type CardId = Card["id"];

export function cardLabel(card: Pick<Card, "rank" | "suit">): string {
  return card.rank === "JOKER" ? "Joker" : `${card.rank} ${card.suit}`;
}
```

- [ ] **Step 2: Define the generic game contract**

Create `packages/shared/src/game.ts`:

```ts
export type GameId = "hand-and-foot";

export type GamePhase = "lobby" | "playing" | "round-over" | "game-over";

export type GameErrorCode =
  | "invalid-action"
  | "invalid-player"
  | "invalid-rules"
  | "not-your-turn"
  | "room-not-ready";

export class GameRuleError extends Error {
  constructor(
    readonly code: GameErrorCode,
    message: string
  ) {
    super(message);
    this.name = "GameRuleError";
  }
}

export type GameDefinition<TRules, TState, TAction, TPlayerView> = {
  id: GameId;
  displayName: string;
  defaultRules: TRules;
  createInitialState(input: {
    seed: string;
    playerIds: string[];
    rules: TRules;
  }): TState;
  getPlayerView(input: {
    state: TState;
    playerId: string | null;
    rules: TRules;
  }): TPlayerView;
  applyAction(input: {
    state: TState;
    action: TAction;
    playerId: string;
    rules: TRules;
  }): TState;
};
```

- [ ] **Step 3: Define room DTOs**

Create `packages/shared/src/rooms.ts`:

```ts
import type { GameId, GamePhase } from "./game";

export type ParticipantId = string;
export type RoomCode = string;
export type SeatId = "north" | "east" | "south" | "west";
export type TeamId = "red" | "blue";

export type Participant = {
  id: ParticipantId;
  displayName: string;
  token: string;
  connected: boolean;
};

export type Seat = {
  id: SeatId;
  teamId: TeamId;
  participantId: ParticipantId | null;
  ready: boolean;
};

export type RoomStatus = "waiting" | "playing" | "finished";

export type RoomSummary = {
  code: RoomCode;
  gameId: GameId;
  status: RoomStatus;
  hostParticipantId: ParticipantId;
  playerCount: number;
  spectatorCount: number;
  createdAt: string;
};

export type PublicRoomSnapshot<TPlayerView = unknown> = {
  code: RoomCode;
  gameId: GameId;
  status: RoomStatus;
  phase: GamePhase;
  hostParticipantId: ParticipantId;
  currentParticipantId: ParticipantId | null;
  participants: Array<Omit<Participant, "token">>;
  seats: Seat[];
  spectatorIds: ParticipantId[];
  currentView: TPlayerView | null;
};
```

- [ ] **Step 4: Export shared types**

Modify `packages/shared/src/index.ts`:

```ts
export * from "./cards";
export * from "./game";
export * from "./rooms";
```

- [ ] **Step 5: Verify shared package**

Run:

```powershell
npm run typecheck -w @hengames/shared
```

Expected: exits with code 0.

- [ ] **Step 6: Commit**

```powershell
git add packages/shared
git commit -m "feat: define shared game and room types" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Task 3: Hand and Foot Deck, Rules, Setup, and Views

**Files:**
- Create: `packages/game-engine/src/hand-and-foot/types.ts`
- Create: `packages/game-engine/src/hand-and-foot/cards.ts`
- Create: `packages/game-engine/src/hand-and-foot/setup.ts`
- Create: `packages/game-engine/src/hand-and-foot/views.ts`
- Create: `packages/game-engine/src/hand-and-foot/index.ts`
- Create: `packages/game-engine/src/hand-and-foot/setup.test.ts`
- Modify: `packages/game-engine/src/index.ts`

- [ ] **Step 1: Write failing setup and privacy tests**

Create `packages/game-engine/src/hand-and-foot/setup.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { handAndFootDefinition } from "./index";

describe("hand and foot setup", () => {
  it("deals eleven hand cards and eleven foot cards to each player", () => {
    const state = handAndFootDefinition.createInitialState({
      seed: "test-seed",
      playerIds: ["p1", "p2", "p3", "p4"],
      rules: handAndFootDefinition.defaultRules
    });

    expect(Object.values(state.players)).toHaveLength(4);
    expect(state.players.p1?.hand).toHaveLength(11);
    expect(state.players.p1?.foot).toHaveLength(11);
    expect(state.drawPile.length).toBeGreaterThan(0);
    expect(state.discardPile).toHaveLength(1);
  });

  it("does not expose another player's private cards", () => {
    const state = handAndFootDefinition.createInitialState({
      seed: "test-seed",
      playerIds: ["p1", "p2", "p3", "p4"],
      rules: handAndFootDefinition.defaultRules
    });

    const view = handAndFootDefinition.getPlayerView({
      state,
      playerId: "p1",
      rules: handAndFootDefinition.defaultRules
    });

    expect(view.players.p1?.hand).toHaveLength(11);
    expect(view.players.p2?.hand).toBeUndefined();
    expect(view.players.p2?.handCount).toBe(11);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```powershell
npm run test -w @hengames/game-engine -- hand-and-foot/setup.test.ts
```

Expected: FAIL because `./index` or `handAndFootDefinition` does not exist.

- [ ] **Step 3: Add Hand and Foot types**

Create `packages/game-engine/src/hand-and-foot/types.ts`:

```ts
import type { Card, CardId, Rank } from "@hengames/shared";

export type HandAndFootRules = {
  playerCount: 4;
  teamCount: 2;
  deckCount: number;
  cardsPerHand: number;
  cardsPerFoot: number;
  drawCount: number;
  openingMeldMinimums: [number, number, number, number];
  cleanBookSize: number;
  dirtyBookSize: number;
  goingOutRequiresCleanBook: boolean;
  goingOutRequiresDirtyBook: boolean;
  gameEndScore: number;
  cardPoints: Record<Rank, number>;
};

export type Meld = {
  id: string;
  teamId: "red" | "blue";
  rank: Rank;
  cards: Card[];
  isBook: boolean;
  isClean: boolean;
};

export type HandAndFootPlayerState = {
  id: string;
  teamId: "red" | "blue";
  hand: Card[];
  foot: Card[];
  activePile: "hand" | "foot";
};

export type HandAndFootState = {
  phase: "playing" | "round-over" | "game-over";
  round: number;
  playerOrder: string[];
  currentPlayerIndex: number;
  turnStep: "must-draw" | "may-meld" | "must-discard";
  players: Record<string, HandAndFootPlayerState>;
  drawPile: Card[];
  discardPile: Card[];
  melds: Meld[];
  teamScores: Record<"red" | "blue", number>;
  roundScores: Array<Record<"red" | "blue", number>>;
  lastEvent: string;
};

export type HandAndFootAction =
  | { type: "draw" }
  | { type: "meld"; cardIds: CardId[]; targetMeldId?: string }
  | { type: "discard"; cardId: CardId };

export type PublicPlayerState = {
  id: string;
  teamId: "red" | "blue";
  activePile: "hand" | "foot";
  hand?: Card[];
  foot?: Card[];
  handCount?: number;
  footCount?: number;
};

export type HandAndFootPlayerView = {
  phase: HandAndFootState["phase"];
  round: number;
  currentPlayerId: string;
  turnStep: HandAndFootState["turnStep"];
  players: Record<string, PublicPlayerState>;
  topDiscard: Card | null;
  discardCount: number;
  drawCount: number;
  melds: Meld[];
  teamScores: Record<"red" | "blue", number>;
  roundScores: Array<Record<"red" | "blue", number>>;
  lastEvent: string;
};
```

- [ ] **Step 4: Add deterministic deck helpers**

Create `packages/game-engine/src/hand-and-foot/cards.ts`:

```ts
import type { Card, Rank, StandardRank, Suit } from "@hengames/shared";

const suits: Suit[] = ["clubs", "diamonds", "hearts", "spades"];
const ranks: StandardRank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

export function createDecks(deckCount: number): Card[] {
  const cards: Card[] = [];

  for (let deckIndex = 0; deckIndex < deckCount; deckIndex += 1) {
    for (const suit of suits) {
      for (const rank of ranks) {
        cards.push({ id: `${deckIndex}-${suit}-${rank}`, suit, rank, deckIndex });
      }
    }

    cards.push({ id: `${deckIndex}-joker-1`, suit: "joker", rank: "JOKER", deckIndex });
    cards.push({ id: `${deckIndex}-joker-2`, suit: "joker", rank: "JOKER", deckIndex });
  }

  return cards;
}

export function isWildRank(rank: Rank): boolean {
  return rank === "2" || rank === "JOKER";
}

export function shuffle(cards: Card[], seed: string): Card[] {
  const copy = [...cards];
  let state = hashSeed(seed);

  for (let index = copy.length - 1; index > 0; index -= 1) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const swapIndex = state % (index + 1);
    const current = copy[index];
    const swap = copy[swapIndex];

    if (!current || !swap) {
      throw new Error("Shuffle index out of bounds");
    }

    copy[index] = swap;
    copy[swapIndex] = current;
  }

  return copy;
}

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (const char of seed) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
```

- [ ] **Step 5: Add setup and player views**

Create `packages/game-engine/src/hand-and-foot/setup.ts`:

```ts
import { GameRuleError } from "@hengames/shared";
import { createDecks, shuffle } from "./cards";
import type { HandAndFootRules, HandAndFootState } from "./types";

export const defaultHandAndFootRules: HandAndFootRules = {
  playerCount: 4,
  teamCount: 2,
  deckCount: 5,
  cardsPerHand: 11,
  cardsPerFoot: 11,
  drawCount: 2,
  openingMeldMinimums: [50, 90, 120, 150],
  cleanBookSize: 7,
  dirtyBookSize: 7,
  goingOutRequiresCleanBook: true,
  goingOutRequiresDirtyBook: true,
  gameEndScore: 8500,
  cardPoints: {
    "3": 5,
    "4": 5,
    "5": 5,
    "6": 5,
    "7": 5,
    "8": 10,
    "9": 10,
    "10": 10,
    J: 10,
    Q: 10,
    K: 10,
    A: 20,
    "2": 20,
    JOKER: 50
  }
};

export function createInitialHandAndFootState(input: {
  seed: string;
  playerIds: string[];
  rules: HandAndFootRules;
}): HandAndFootState {
  const { playerIds, rules, seed } = input;

  if (playerIds.length !== rules.playerCount) {
    throw new GameRuleError("invalid-rules", `Hand and Foot requires exactly ${rules.playerCount} players.`);
  }

  const deck = shuffle(createDecks(rules.deckCount), seed);
  const players: HandAndFootState["players"] = {};

  for (const [index, playerId] of playerIds.entries()) {
    players[playerId] = {
      id: playerId,
      teamId: index % 2 === 0 ? "red" : "blue",
      hand: deck.splice(0, rules.cardsPerHand),
      foot: deck.splice(0, rules.cardsPerFoot),
      activePile: "hand"
    };
  }

  const firstDiscard = deck.shift();

  if (!firstDiscard) {
    throw new GameRuleError("invalid-rules", "Not enough cards to start the discard pile.");
  }

  return {
    phase: "playing",
    round: 1,
    playerOrder: [...playerIds],
    currentPlayerIndex: 0,
    turnStep: "must-draw",
    players,
    drawPile: deck,
    discardPile: [firstDiscard],
    melds: [],
    teamScores: { red: 0, blue: 0 },
    roundScores: [],
    lastEvent: "Game started."
  };
}
```

Create `packages/game-engine/src/hand-and-foot/views.ts`:

```ts
import type { HandAndFootPlayerView, HandAndFootRules, HandAndFootState } from "./types";

export function getHandAndFootPlayerView(input: {
  state: HandAndFootState;
  playerId: string | null;
  rules: HandAndFootRules;
}): HandAndFootPlayerView {
  const { state, playerId } = input;
  const players: HandAndFootPlayerView["players"] = {};

  for (const player of Object.values(state.players)) {
    const isCurrentViewer = player.id === playerId;
    players[player.id] = {
      id: player.id,
      teamId: player.teamId,
      activePile: player.activePile,
      hand: isCurrentViewer ? player.hand : undefined,
      foot: isCurrentViewer && player.activePile === "foot" ? player.foot : undefined,
      handCount: isCurrentViewer ? undefined : player.hand.length,
      footCount: isCurrentViewer && player.activePile === "foot" ? undefined : player.foot.length
    };
  }

  return {
    phase: state.phase,
    round: state.round,
    currentPlayerId: state.playerOrder[state.currentPlayerIndex] ?? "",
    turnStep: state.turnStep,
    players,
    topDiscard: state.discardPile.at(-1) ?? null,
    discardCount: state.discardPile.length,
    drawCount: state.drawPile.length,
    melds: state.melds,
    teamScores: state.teamScores,
    roundScores: state.roundScores,
    lastEvent: state.lastEvent
  };
}
```

- [ ] **Step 6: Export the game definition**

Create `packages/game-engine/src/hand-and-foot/index.ts`:

```ts
import type { GameDefinition } from "@hengames/shared";
import { createInitialHandAndFootState, defaultHandAndFootRules } from "./setup";
import { getHandAndFootPlayerView } from "./views";
import type { HandAndFootAction, HandAndFootPlayerView, HandAndFootRules, HandAndFootState } from "./types";

export const handAndFootDefinition: GameDefinition<
  HandAndFootRules,
  HandAndFootState,
  HandAndFootAction,
  HandAndFootPlayerView
> = {
  id: "hand-and-foot",
  displayName: "Hand and Foot",
  defaultRules: defaultHandAndFootRules,
  createInitialState: createInitialHandAndFootState,
  getPlayerView: getHandAndFootPlayerView,
  applyAction: ({ state }) => state
};

export * from "./types";
export * from "./cards";
export * from "./setup";
export * from "./views";
```

Modify `packages/game-engine/src/index.ts`:

```ts
export * from "./hand-and-foot";
```

- [ ] **Step 7: Run tests to verify they pass**

Run:

```powershell
npm run test -w @hengames/game-engine -- hand-and-foot/setup.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```powershell
git add packages/game-engine
git commit -m "feat: add Hand and Foot setup and player views" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Task 4: Hand and Foot Actions, Melds, Books, and Scoring

**Files:**
- Create: `packages/game-engine/src/hand-and-foot/actions.ts`
- Create: `packages/game-engine/src/hand-and-foot/scoring.ts`
- Create: `packages/game-engine/src/hand-and-foot/actions.test.ts`
- Modify: `packages/game-engine/src/hand-and-foot/index.ts`

- [ ] **Step 1: Write failing action tests**

Create `packages/game-engine/src/hand-and-foot/actions.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { GameRuleError } from "@hengames/shared";
import { handAndFootDefinition } from "./index";

function startState() {
  return handAndFootDefinition.createInitialState({
    seed: "actions",
    playerIds: ["p1", "p2", "p3", "p4"],
    rules: handAndFootDefinition.defaultRules
  });
}

describe("hand and foot actions", () => {
  it("draws two cards and advances to meld step", () => {
    const state = startState();
    const next = handAndFootDefinition.applyAction({
      state,
      playerId: "p1",
      rules: handAndFootDefinition.defaultRules,
      action: { type: "draw" }
    });

    expect(next.players.p1?.hand).toHaveLength(13);
    expect(next.turnStep).toBe("may-meld");
  });

  it("rejects acting out of turn", () => {
    const state = startState();
    expect(() =>
      handAndFootDefinition.applyAction({
        state,
        playerId: "p2",
        rules: handAndFootDefinition.defaultRules,
        action: { type: "draw" }
      })
    ).toThrow(GameRuleError);
  });

  it("discards after drawing and advances the turn", () => {
    const drawn = handAndFootDefinition.applyAction({
      state: startState(),
      playerId: "p1",
      rules: handAndFootDefinition.defaultRules,
      action: { type: "draw" }
    });
    const cardId = drawn.players.p1?.hand[0]?.id;

    if (!cardId) {
      throw new Error("Expected p1 to have a card to discard");
    }

    const next = handAndFootDefinition.applyAction({
      state: drawn,
      playerId: "p1",
      rules: handAndFootDefinition.defaultRules,
      action: { type: "discard", cardId }
    });

    expect(next.currentPlayerIndex).toBe(1);
    expect(next.turnStep).toBe("must-draw");
  });

  it("creates a clean book from seven same-rank natural cards", () => {
    const state = startState();
    const p1 = state.players.p1;

    if (!p1) {
      throw new Error("Expected p1");
    }

    p1.hand = [
      { id: "a", rank: "8", suit: "clubs", deckIndex: 0 },
      { id: "b", rank: "8", suit: "diamonds", deckIndex: 0 },
      { id: "c", rank: "8", suit: "hearts", deckIndex: 0 },
      { id: "d", rank: "8", suit: "spades", deckIndex: 0 },
      { id: "e", rank: "8", suit: "clubs", deckIndex: 1 },
      { id: "f", rank: "8", suit: "diamonds", deckIndex: 1 },
      { id: "g", rank: "8", suit: "hearts", deckIndex: 1 }
    ];
    state.turnStep = "may-meld";

    const next = handAndFootDefinition.applyAction({
      state,
      playerId: "p1",
      rules: handAndFootDefinition.defaultRules,
      action: { type: "meld", cardIds: ["a", "b", "c", "d", "e", "f", "g"] }
    });

    expect(next.melds[0]).toMatchObject({ rank: "8", isBook: true, isClean: true });
  });

  it("enforces the opening meld minimum for the round", () => {
    const state = startState();
    const p1 = state.players.p1;

    if (!p1) {
      throw new Error("Expected p1");
    }

    p1.hand = [
      { id: "a", rank: "4", suit: "clubs", deckIndex: 0 },
      { id: "b", rank: "4", suit: "diamonds", deckIndex: 0 },
      { id: "c", rank: "4", suit: "hearts", deckIndex: 0 }
    ];
    state.turnStep = "may-meld";

    expect(() =>
      handAndFootDefinition.applyAction({
        state,
        playerId: "p1",
        rules: handAndFootDefinition.defaultRules,
        action: { type: "meld", cardIds: ["a", "b", "c"] }
      })
    ).toThrow(GameRuleError);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```powershell
npm run test -w @hengames/game-engine -- hand-and-foot/actions.test.ts
```

Expected: FAIL because `applyAction` currently returns unchanged state.

- [ ] **Step 3: Implement scoring helpers**

Create `packages/game-engine/src/hand-and-foot/scoring.ts`:

```ts
import type { Card, Rank } from "@hengames/shared";
import { isWildRank } from "./cards";
import type { HandAndFootRules, HandAndFootState, Meld } from "./types";

export function cardPoints(card: Pick<Card, "rank">, rules: HandAndFootRules): number {
  return rules.cardPoints[card.rank];
}

export function determineMeldRank(cards: Card[]): Rank {
  const natural = cards.find((card) => !isWildRank(card.rank));
  if (!natural) {
    throw new Error("Meld requires at least one natural card.");
  }
  return natural.rank;
}

export function classifyMeld(input: {
  id: string;
  teamId: "red" | "blue";
  cards: Card[];
  rules: HandAndFootRules;
}): Meld {
  const { cards, id, rules, teamId } = input;
  const rank = determineMeldRank(cards);
  const naturalCount = cards.filter((card) => card.rank === rank).length;
  const wildCount = cards.filter((card) => isWildRank(card.rank)).length;

  if (cards.length < 3) {
    throw new Error("A meld requires at least three cards.");
  }

  if (naturalCount < 2) {
    throw new Error("A meld requires at least two natural cards.");
  }

  if (wildCount > naturalCount) {
    throw new Error("A meld cannot contain more wild cards than natural cards.");
  }

  const isBook = cards.length >= rules.cleanBookSize;

  return {
    id,
    teamId,
    rank,
    cards,
    isBook,
    isClean: isBook && wildCount === 0
  };
}

export function scoreRound(state: HandAndFootState, rules: HandAndFootRules): Record<"red" | "blue", number> {
  const score = { red: 0, blue: 0 };

  for (const meld of state.melds) {
    const bookBonus = meld.isBook ? (meld.isClean ? 500 : 300) : 0;
    const cardTotal = meld.cards.reduce((total, card) => total + cardPoints(card, rules), 0);
    score[meld.teamId] += bookBonus + cardTotal;
  }

  for (const player of Object.values(state.players)) {
    const penaltyCards = [...player.hand, ...player.foot];
    score[player.teamId] -= penaltyCards.reduce((total, card) => total + cardPoints(card, rules), 0);
  }

  return score;
}
```

- [ ] **Step 4: Implement action reducer**

Create `packages/game-engine/src/hand-and-foot/actions.ts`:

```ts
import { GameRuleError, type Card, type CardId } from "@hengames/shared";
import { cardPoints, classifyMeld, scoreRound } from "./scoring";
import type { HandAndFootAction, HandAndFootRules, HandAndFootState } from "./types";

export function applyHandAndFootAction(input: {
  state: HandAndFootState;
  action: HandAndFootAction;
  playerId: string;
  rules: HandAndFootRules;
}): HandAndFootState {
  const { action, playerId, rules } = input;
  const state = cloneState(input.state);
  const currentPlayerId = state.playerOrder[state.currentPlayerIndex];

  if (state.phase !== "playing") {
    throw new GameRuleError("invalid-action", "The round is not currently playable.");
  }

  if (currentPlayerId !== playerId) {
    throw new GameRuleError("not-your-turn", "It is not your turn.");
  }

  if (action.type === "draw") {
    return drawCards(state, playerId, rules);
  }

  if (action.type === "meld") {
    return meldCards(state, playerId, action.cardIds, action.targetMeldId, rules);
  }

  return discardCard(state, playerId, action.cardId, rules);
}

function drawCards(state: HandAndFootState, playerId: string, rules: HandAndFootRules): HandAndFootState {
  if (state.turnStep !== "must-draw") {
    throw new GameRuleError("invalid-action", "You can only draw at the start of your turn.");
  }

  const player = requirePlayer(state, playerId);
  const drawn = state.drawPile.splice(0, rules.drawCount);

  if (drawn.length !== rules.drawCount) {
    throw new GameRuleError("invalid-action", "The draw pile does not have enough cards.");
  }

  activeCards(player).push(...drawn);
  state.turnStep = "may-meld";
  state.lastEvent = `${playerId} drew ${drawn.length} cards.`;
  return state;
}

function meldCards(
  state: HandAndFootState,
  playerId: string,
  cardIds: CardId[],
  targetMeldId: string | undefined,
  rules: HandAndFootRules
): HandAndFootState {
  if (state.turnStep === "must-draw") {
    throw new GameRuleError("invalid-action", "Draw before melding.");
  }

  const player = requirePlayer(state, playerId);
  const cards = removeCards(activeCards(player), cardIds);

  try {
    if (targetMeldId) {
      const target = state.melds.find((meld) => meld.id === targetMeldId);
      if (!target) {
        throw new Error("Target meld not found.");
      }
      if (target.teamId !== player.teamId) {
        throw new Error("Cannot add cards to the other team's meld.");
      }
      if (cards.some((card) => card.rank !== target.rank && card.rank !== "2" && card.rank !== "JOKER")) {
        throw new Error("Cards added to a meld must match the meld rank or be wild.");
      }
      target.cards.push(...cards);
      target.isBook = target.cards.length >= rules.cleanBookSize;
      target.isClean = target.isBook && target.cards.every((card) => card.rank === target.rank);
      state.lastEvent = `${playerId} added ${cards.length} cards to a meld.`;
    } else {
      const openingMinimum = rules.openingMeldMinimums[Math.min(state.round - 1, rules.openingMeldMinimums.length - 1)];
      const teamHasExistingMeld = state.melds.some((meld) => meld.teamId === player.teamId);
      const meldPointTotal = cards.reduce((total, card) => total + cardPoints(card, rules), 0);
      if (!teamHasExistingMeld && meldPointTotal < openingMinimum) {
        throw new Error(`Opening meld requires at least ${openingMinimum} points.`);
      }
      const meld = classifyMeld({
        id: `meld-${state.melds.length + 1}`,
        teamId: player.teamId,
        cards,
        rules
      });
      state.melds.push(meld);
      state.lastEvent = `${playerId} created a meld of ${meld.rank}.`;
    }
  } catch (error) {
    activeCards(player).push(...cards);
    throw new GameRuleError("invalid-action", error instanceof Error ? error.message : "Invalid meld.");
  }

  if (player.hand.length === 0 && player.activePile === "hand") {
    player.activePile = "foot";
    state.lastEvent = `${playerId} entered their foot.`;
  }

  state.turnStep = "must-discard";
  return maybeFinishRound(state, rules);
}

function discardCard(
  state: HandAndFootState,
  playerId: string,
  cardId: CardId,
  rules: HandAndFootRules
): HandAndFootState {
  if (state.turnStep === "must-draw") {
    throw new GameRuleError("invalid-action", "Draw before discarding.");
  }

  const player = requirePlayer(state, playerId);
  const [card] = removeCards(activeCards(player), [cardId]);
  if (!card) {
    throw new GameRuleError("invalid-action", "Card not found.");
  }

  state.discardPile.push(card);
  state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.playerOrder.length;
  state.turnStep = "must-draw";
  state.lastEvent = `${playerId} discarded.`;
  return maybeFinishRound(state, rules);
}

function maybeFinishRound(state: HandAndFootState, rules: HandAndFootRules): HandAndFootState {
  const emptyPlayer = Object.values(state.players).find(
    (player) => player.activePile === "foot" && player.hand.length === 0 && player.foot.length === 0
  );

  if (!emptyPlayer) {
    return state;
  }

  const teamMelds = state.melds.filter((meld) => meld.teamId === emptyPlayer.teamId);
  const hasCleanBook = teamMelds.some((meld) => meld.isBook && meld.isClean);
  const hasDirtyBook = teamMelds.some((meld) => meld.isBook && !meld.isClean);

  if ((rules.goingOutRequiresCleanBook && !hasCleanBook) || (rules.goingOutRequiresDirtyBook && !hasDirtyBook)) {
    return state;
  }

  const roundScore = scoreRound(state, rules);
  state.roundScores.push(roundScore);
  state.teamScores.red += roundScore.red;
  state.teamScores.blue += roundScore.blue;
  state.phase = state.teamScores.red >= rules.gameEndScore || state.teamScores.blue >= rules.gameEndScore ? "game-over" : "round-over";
  state.lastEvent = `${emptyPlayer.id} went out.`;
  return state;
}

function requirePlayer(state: HandAndFootState, playerId: string) {
  const player = state.players[playerId];
  if (!player) {
    throw new GameRuleError("invalid-player", "Player is not in this game.");
  }
  return player;
}

function activeCards(player: { activePile: "hand" | "foot"; hand: Card[]; foot: Card[] }): Card[] {
  return player.activePile === "hand" ? player.hand : player.foot;
}

function removeCards(cards: Card[], cardIds: CardId[]): Card[] {
  const removed: Card[] = [];

  for (const cardId of cardIds) {
    const index = cards.findIndex((card) => card.id === cardId);
    if (index === -1) {
      throw new GameRuleError("invalid-action", `Card ${cardId} is not available.`);
    }
    const [card] = cards.splice(index, 1);
    if (card) {
      removed.push(card);
    }
  }

  return removed;
}

function cloneState(state: HandAndFootState): HandAndFootState {
  return structuredClone(state);
}
```

- [ ] **Step 5: Wire the reducer into the definition**

Modify `packages/game-engine/src/hand-and-foot/index.ts`:

```ts
import type { GameDefinition } from "@hengames/shared";
import { applyHandAndFootAction } from "./actions";
import { createInitialHandAndFootState, defaultHandAndFootRules } from "./setup";
import { getHandAndFootPlayerView } from "./views";
import type { HandAndFootAction, HandAndFootPlayerView, HandAndFootRules, HandAndFootState } from "./types";

export const handAndFootDefinition: GameDefinition<
  HandAndFootRules,
  HandAndFootState,
  HandAndFootAction,
  HandAndFootPlayerView
> = {
  id: "hand-and-foot",
  displayName: "Hand and Foot",
  defaultRules: defaultHandAndFootRules,
  createInitialState: createInitialHandAndFootState,
  getPlayerView: getHandAndFootPlayerView,
  applyAction: applyHandAndFootAction
};

export * from "./actions";
export * from "./types";
export * from "./cards";
export * from "./setup";
export * from "./views";
```

- [ ] **Step 6: Run action tests**

Run:

```powershell
npm run test -w @hengames/game-engine -- hand-and-foot/actions.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add packages/game-engine
git commit -m "feat: enforce Hand and Foot actions" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Task 5: In-Memory Room Store

**Files:**
- Create: `apps/server/src/rooms/roomStore.ts`
- Create: `apps/server/src/rooms/roomStore.test.ts`
- Modify: `apps/server/src/index.ts`

- [ ] **Step 1: Write failing room store tests**

Create `apps/server/src/rooms/roomStore.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createRoomStore } from "./roomStore";

describe("room store", () => {
  it("creates discoverable Hand and Foot rooms", () => {
    const store = createRoomStore();
    const result = store.createRoom({ displayName: "Sam" });

    expect(result.room.code).toHaveLength(6);
    expect(result.room.hostParticipantId).toBe(result.participant.id);
    expect(store.listRooms()).toHaveLength(1);
  });

  it("lets users join as spectators before choosing a seat", () => {
    const store = createRoomStore();
    const created = store.createRoom({ displayName: "Host" });
    const joined = store.joinRoom({ code: created.room.code, displayName: "Guest" });

    expect(joined.room.spectatorIds).toContain(joined.participant.id);
  });

  it("starts a game when all seats are occupied and ready", () => {
    const store = createRoomStore();
    const host = store.createRoom({ displayName: "P1" });
    const p2 = store.joinRoom({ code: host.room.code, displayName: "P2" });
    const p3 = store.joinRoom({ code: host.room.code, displayName: "P3" });
    const p4 = store.joinRoom({ code: host.room.code, displayName: "P4" });

    store.chooseSeat({ code: host.room.code, participantToken: host.participant.token, seatId: "north" });
    store.chooseSeat({ code: host.room.code, participantToken: p2.participant.token, seatId: "east" });
    store.chooseSeat({ code: host.room.code, participantToken: p3.participant.token, seatId: "south" });
    store.chooseSeat({ code: host.room.code, participantToken: p4.participant.token, seatId: "west" });
    for (const token of [host.participant.token, p2.participant.token, p3.participant.token, p4.participant.token]) {
      store.setReady({ code: host.room.code, participantToken: token, ready: true });
    }

    const started = store.startGame({ code: host.room.code, participantToken: host.participant.token });

    expect(started.status).toBe("playing");
    expect(started.gameState).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```powershell
npm run test -w @hengames/server -- roomStore.test.ts
```

Expected: FAIL because `roomStore` does not exist.

- [ ] **Step 3: Implement the in-memory room store**

Create `apps/server/src/rooms/roomStore.ts`:

```ts
import { handAndFootDefinition, type HandAndFootAction, type HandAndFootState } from "@hengames/game-engine";
import type { Participant, PublicRoomSnapshot, RoomCode, RoomStatus, Seat, SeatId } from "@hengames/shared";

type RoomRecord = {
  code: RoomCode;
  gameId: "hand-and-foot";
  status: RoomStatus;
  hostParticipantId: string;
  participants: Map<string, Participant>;
  spectatorIds: Set<string>;
  seats: Seat[];
  gameState: HandAndFootState | null;
  createdAt: string;
};

type ParticipantResult = {
  room: PublicRoomSnapshot;
  participant: Participant;
};

export function createRoomStore() {
  const rooms = new Map<RoomCode, RoomRecord>();

  function createRoom(input: { displayName?: string }): ParticipantResult {
    const participant = createParticipant(input.displayName);
    const room: RoomRecord = {
      code: createRoomCode(rooms),
      gameId: "hand-and-foot",
      status: "waiting",
      hostParticipantId: participant.id,
      participants: new Map([[participant.id, participant]]),
      spectatorIds: new Set([participant.id]),
      seats: [
        { id: "north", teamId: "red", participantId: null, ready: false },
        { id: "east", teamId: "blue", participantId: null, ready: false },
        { id: "south", teamId: "red", participantId: null, ready: false },
        { id: "west", teamId: "blue", participantId: null, ready: false }
      ],
      gameState: null,
      createdAt: new Date().toISOString()
    };
    rooms.set(room.code, room);
    return { room: snapshot(room, participant.id), participant };
  }

  function listRooms() {
    return [...rooms.values()].map((room) => ({
      code: room.code,
      gameId: room.gameId,
      status: room.status,
      hostParticipantId: room.hostParticipantId,
      playerCount: room.seats.filter((seat) => seat.participantId).length,
      spectatorCount: room.spectatorIds.size,
      createdAt: room.createdAt
    }));
  }

  function joinRoom(input: { code: RoomCode; displayName?: string }): ParticipantResult {
    const room = requireRoom(input.code);
    const participant = createParticipant(input.displayName);
    room.participants.set(participant.id, participant);
    room.spectatorIds.add(participant.id);
    return { room: snapshot(room, participant.id), participant };
  }

  function chooseSeat(input: { code: RoomCode; participantToken: string; seatId: SeatId }) {
    const { participant, room } = authenticate(input.code, input.participantToken);
    if (room.status !== "waiting") {
      throw new Error("Seats cannot be changed after the game starts.");
    }
    const seat = room.seats.find((candidate) => candidate.id === input.seatId);
    if (!seat) {
      throw new Error("Seat not found.");
    }
    if (seat.participantId && seat.participantId !== participant.id) {
      throw new Error("Seat is already occupied.");
    }
    for (const candidate of room.seats) {
      if (candidate.participantId === participant.id) {
        candidate.participantId = null;
        candidate.ready = false;
      }
    }
    seat.participantId = participant.id;
    seat.ready = false;
    room.spectatorIds.delete(participant.id);
    return snapshot(room, participant.id);
  }

  function setReady(input: { code: RoomCode; participantToken: string; ready: boolean }) {
    const { participant, room } = authenticate(input.code, input.participantToken);
    const seat = room.seats.find((candidate) => candidate.participantId === participant.id);
    if (!seat) {
      throw new Error("Only seated players can ready up.");
    }
    seat.ready = input.ready;
    return snapshot(room, participant.id);
  }

  function startGame(input: { code: RoomCode; participantToken: string }) {
    const { participant, room } = authenticate(input.code, input.participantToken);
    if (participant.id !== room.hostParticipantId) {
      throw new Error("Only the host can start the game.");
    }
    if (room.seats.some((seat) => !seat.participantId || !seat.ready)) {
      throw new Error("All seats must be occupied and ready.");
    }
    const playerIds = room.seats.map((seat) => {
      if (!seat.participantId) {
        throw new Error("Seat missing participant.");
      }
      return seat.participantId;
    });
    room.gameState = handAndFootDefinition.createInitialState({
      seed: `${room.code}-${Date.now()}`,
      playerIds,
      rules: handAndFootDefinition.defaultRules
    });
    room.status = "playing";
    return room;
  }

  function applyGameAction(input: { code: RoomCode; participantToken: string; action: HandAndFootAction }) {
    const { participant, room } = authenticate(input.code, input.participantToken);
    if (!room.gameState) {
      throw new Error("Game has not started.");
    }
    room.gameState = handAndFootDefinition.applyAction({
      state: room.gameState,
      action: input.action,
      playerId: participant.id,
      rules: handAndFootDefinition.defaultRules
    });
    return snapshot(room, participant.id);
  }

  function getSnapshot(input: { code: RoomCode; participantToken?: string }) {
    const room = requireRoom(input.code);
    const participantId = input.participantToken ? authenticate(input.code, input.participantToken).participant.id : null;
    return snapshot(room, participantId);
  }

  return { createRoom, listRooms, joinRoom, chooseSeat, setReady, startGame, applyGameAction, getSnapshot };

  function requireRoom(code: RoomCode): RoomRecord {
    const room = rooms.get(code.toUpperCase());
    if (!room) {
      throw new Error("Room not found.");
    }
    return room;
  }

  function authenticate(code: RoomCode, token: string) {
    const room = requireRoom(code);
    const participant = [...room.participants.values()].find((candidate) => candidate.token === token);
    if (!participant) {
      throw new Error("Participant token is invalid.");
    }
    return { room, participant };
  }
}

function snapshot(room: RoomRecord, viewerParticipantId: string | null): PublicRoomSnapshot {
  return {
    code: room.code,
    gameId: room.gameId,
    status: room.status,
    phase: room.gameState?.phase ?? "lobby",
    hostParticipantId: room.hostParticipantId,
    currentParticipantId: viewerParticipantId,
    participants: [...room.participants.values()].map(({ token: _token, ...participant }) => participant),
    seats: room.seats,
    spectatorIds: [...room.spectatorIds],
    currentView: room.gameState
      ? handAndFootDefinition.getPlayerView({
          state: room.gameState,
          playerId: viewerParticipantId,
          rules: handAndFootDefinition.defaultRules
        })
      : null
  };
}

function createParticipant(displayName: string | undefined): Participant {
  const id = crypto.randomUUID();
  return {
    id,
    displayName: displayName?.trim() || `Player ${id.slice(0, 4)}`,
    token: crypto.randomUUID(),
    connected: true
  };
}

function createRoomCode(existing: Map<RoomCode, RoomRecord>): RoomCode {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let attempt = 0; attempt < 100; attempt += 1) {
    let code = "";
    for (let index = 0; index < 6; index += 1) {
      code += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    if (!existing.has(code)) {
      return code;
    }
  }
  throw new Error("Could not allocate a room code.");
}
```

- [ ] **Step 4: Run room store tests**

Run:

```powershell
npm run test -w @hengames/server -- roomStore.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add apps/server/src/rooms
git commit -m "feat: add in-memory room store" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Task 6: tRPC API and WebSocket Broadcasts

**Files:**
- Create: `apps/server/src/trpc.ts`
- Create: `apps/server/src/routers/appRouter.ts`
- Create: `apps/server/src/wsHub.ts`
- Modify: `apps/server/src/index.ts`

- [ ] **Step 1: Create tRPC helpers**

Create `apps/server/src/trpc.ts`:

```ts
import { initTRPC } from "@trpc/server";

export type AppContext = {
  participantToken?: string;
};

const t = initTRPC.context<AppContext>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
```

- [ ] **Step 2: Create the app router**

Create `apps/server/src/routers/appRouter.ts`:

```ts
import { z } from "zod";
import type { HandAndFootAction } from "@hengames/game-engine";
import { publicProcedure, router } from "../trpc";
import type { createRoomStore } from "../rooms/roomStore";
import type { WsHub } from "../wsHub";

const seatIdSchema = z.enum(["north", "east", "south", "west"]);
const actionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("draw") }),
  z.object({ type: z.literal("meld"), cardIds: z.array(z.string()).min(1), targetMeldId: z.string().optional() }),
  z.object({ type: z.literal("discard"), cardId: z.string() })
]);

export function createAppRouter(input: {
  roomStore: ReturnType<typeof createRoomStore>;
  wsHub: WsHub;
}) {
  const { roomStore, wsHub } = input;

  return router({
    listRooms: publicProcedure.query(() => roomStore.listRooms()),
    createRoom: publicProcedure
      .input(z.object({ displayName: z.string().optional() }))
      .mutation(({ input }) => roomStore.createRoom(input)),
    joinRoom: publicProcedure
      .input(z.object({ code: z.string(), displayName: z.string().optional() }))
      .mutation(({ input }) => roomStore.joinRoom(input)),
    getRoom: publicProcedure
      .input(z.object({ code: z.string(), participantToken: z.string().optional() }))
      .query(({ input }) => roomStore.getSnapshot(input)),
    chooseSeat: publicProcedure
      .input(z.object({ code: z.string(), participantToken: z.string(), seatId: seatIdSchema }))
      .mutation(({ input }) => {
        const snapshot = roomStore.chooseSeat(input);
        wsHub.broadcastRoom(input.code, roomStore);
        return snapshot;
      }),
    setReady: publicProcedure
      .input(z.object({ code: z.string(), participantToken: z.string(), ready: z.boolean() }))
      .mutation(({ input }) => {
        const snapshot = roomStore.setReady(input);
        wsHub.broadcastRoom(input.code, roomStore);
        return snapshot;
      }),
    startGame: publicProcedure
      .input(z.object({ code: z.string(), participantToken: z.string() }))
      .mutation(({ input }) => {
        roomStore.startGame(input);
        wsHub.broadcastRoom(input.code, roomStore);
        return roomStore.getSnapshot(input);
      }),
    gameAction: publicProcedure
      .input(z.object({ code: z.string(), participantToken: z.string(), action: actionSchema }))
      .mutation(({ input }) => {
        const snapshot = roomStore.applyGameAction({
          code: input.code,
          participantToken: input.participantToken,
          action: input.action as HandAndFootAction
        });
        wsHub.broadcastRoom(input.code, roomStore);
        return snapshot;
      })
  });
}

export type AppRouter = ReturnType<typeof createAppRouter>;
```

- [ ] **Step 3: Create WebSocket hub**

Create `apps/server/src/wsHub.ts`:

```ts
import type { Server } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import type { createRoomStore } from "./rooms/roomStore";

type Client = {
  socket: WebSocket;
  code: string;
  participantToken?: string;
};

export type WsHub = ReturnType<typeof createWsHub>;

export function createWsHub(server: Server) {
  const clients = new Set<Client>();
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (socket, request) => {
    const url = new URL(request.url ?? "", "http://localhost");
    const code = url.searchParams.get("code")?.toUpperCase();
    const participantToken = url.searchParams.get("participantToken") ?? undefined;

    if (!code) {
      socket.close(1008, "Room code is required.");
      return;
    }

    const client = { socket, code, participantToken };
    clients.add(client);
    socket.on("close", () => clients.delete(client));
  });

  return {
    broadcastRoom(code: string, roomStore: ReturnType<typeof createRoomStore>) {
      for (const client of clients) {
        if (client.code !== code.toUpperCase() || client.socket.readyState !== client.socket.OPEN) {
          continue;
        }
        const snapshot = roomStore.getSnapshot({ code, participantToken: client.participantToken });
        client.socket.send(JSON.stringify({ type: "room-snapshot", snapshot }));
      }
    }
  };
}
```

- [ ] **Step 4: Wire Express, tRPC, and WebSocket**

Modify `apps/server/src/index.ts`:

```ts
import http from "node:http";
import cors from "cors";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { createRoomStore } from "./rooms/roomStore";
import { createAppRouter } from "./routers/appRouter";
import { createWsHub } from "./wsHub";

const app = express();
const server = http.createServer(app);
const roomStore = createRoomStore();
const wsHub = createWsHub(server);
const appRouter = createAppRouter({ roomStore, wsHub });

app.use(cors({ origin: true }));
app.use(
  "/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext: ({ req }) => ({
      participantToken: req.headers.authorization?.replace(/^Bearer\s+/i, "")
    })
  })
);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

const port = Number(process.env.PORT ?? 3000);

server.listen(port, () => {
  console.log(`hengames server listening on http://localhost:${port}`);
});

export type { AppRouter } from "./routers/appRouter";
```

- [ ] **Step 5: Verify server build**

Run:

```powershell
npm run typecheck -w @hengames/server
npm run build -w @hengames/server
```

Expected: both commands exit with code 0.

- [ ] **Step 6: Commit**

```powershell
git add apps/server
git commit -m "feat: expose room API and live updates" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Task 7: React API Client and App State

**Files:**
- Create: `apps/web/src/api/trpc.ts`
- Create: `apps/web/src/api/useRoomSocket.ts`
- Create: `apps/web/src/session.ts`
- Modify: `apps/web/src/main.tsx`

- [ ] **Step 1: Add tRPC client**

Create `apps/web/src/api/trpc.ts`:

```ts
import { createTRPCReact, httpBatchLink } from "@trpc/react-query";
import type { AppRouter } from "@hengames/server/src/routers/appRouter";

export const trpc = createTRPCReact<AppRouter>();

export function createTrpcClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: "http://localhost:3000/trpc"
      })
    ]
  });
}
```

- [ ] **Step 2: Add local session token storage**

Create `apps/web/src/session.ts`:

```ts
const participantTokenKey = "hengames.participantToken";

export function saveParticipantToken(token: string) {
  window.localStorage.setItem(participantTokenKey, token);
}

export function loadParticipantToken(): string | undefined {
  return window.localStorage.getItem(participantTokenKey) ?? undefined;
}
```

- [ ] **Step 3: Add room WebSocket hook**

Create `apps/web/src/api/useRoomSocket.ts`:

```ts
import { useEffect } from "react";
import type { PublicRoomSnapshot } from "@hengames/shared";

export function useRoomSocket(input: {
  code: string | null;
  participantToken?: string;
  onSnapshot(snapshot: PublicRoomSnapshot): void;
}) {
  const { code, onSnapshot, participantToken } = input;

  useEffect(() => {
    if (!code) {
      return;
    }

    const params = new URLSearchParams({ code });
    if (participantToken) {
      params.set("participantToken", participantToken);
    }

    const socket = new WebSocket(`ws://localhost:3000/ws?${params.toString()}`);
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data) as { type: "room-snapshot"; snapshot: PublicRoomSnapshot };
      if (message.type === "room-snapshot") {
        onSnapshot(message.snapshot);
      }
    });

    return () => socket.close();
  }, [code, onSnapshot, participantToken]);
}
```

- [ ] **Step 4: Wrap React in Query and tRPC providers**

Modify `apps/web/src/main.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { createTrpcClient, trpc } from "./api/trpc";
import "./styles.css";

function Providers() {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() => createTrpcClient());

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </trpc.Provider>
  );
}

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found");
}

createRoot(root).render(
  <StrictMode>
    <Providers />
  </StrictMode>
);
```

- [ ] **Step 5: Verify web typecheck**

Run:

```powershell
npm run typecheck -w @hengames/web
```

Expected: exits with code 0.

- [ ] **Step 6: Commit**

```powershell
git add apps/web/src
git commit -m "feat: add React API clients" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Task 8: Room Discovery and Lobby UI

**Files:**
- Modify: `apps/web/src/App.tsx`
- Create: `apps/web/src/components/HomePage.tsx`
- Create: `apps/web/src/components/Lobby.tsx`
- Create: `apps/web/src/styles.css`

- [ ] **Step 1: Create home page component**

Create `apps/web/src/components/HomePage.tsx`:

```tsx
import { useState } from "react";
import { trpc } from "../api/trpc";
import { saveParticipantToken } from "../session";

export function HomePage(props: { onEnterRoom(code: string, participantToken?: string): void }) {
  const [displayName, setDisplayName] = useState("");
  const rooms = trpc.listRooms.useQuery(undefined, { refetchInterval: 3000 });
  const utils = trpc.useUtils();
  const createRoom = trpc.createRoom.useMutation({
    onSuccess(result) {
      saveParticipantToken(result.participant.token);
      props.onEnterRoom(result.room.code, result.participant.token);
      void utils.listRooms.invalidate();
    }
  });
  const joinRoom = trpc.joinRoom.useMutation({
    onSuccess(result) {
      saveParticipantToken(result.participant.token);
      props.onEnterRoom(result.room.code, result.participant.token);
    }
  });

  return (
    <main className="page">
      <section className="hero">
        <h1>hengames</h1>
        <p>Play Hand and Foot together without shuffling five decks.</p>
        <label>
          Display name
          <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Anonymous is fine" />
        </label>
        <button onClick={() => createRoom.mutate({ displayName })}>Create Hand and Foot room</button>
      </section>

      <section className="panel">
        <h2>Active rooms</h2>
        {rooms.data?.length ? (
          <div className="room-list">
            {rooms.data.map((room) => (
              <article className="room-card" key={room.code}>
                <strong>{room.code}</strong>
                <span>{room.status}</span>
                <span>{room.playerCount} players</span>
                <button onClick={() => joinRoom.mutate({ code: room.code, displayName })}>Join or spectate</button>
              </article>
            ))}
          </div>
        ) : (
          <p>No active rooms yet.</p>
        )}
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Create lobby component**

Create `apps/web/src/components/Lobby.tsx`:

```tsx
import type { PublicRoomSnapshot, SeatId } from "@hengames/shared";
import { trpc } from "../api/trpc";

const seats: SeatId[] = ["north", "east", "south", "west"];

export function Lobby(props: {
  room: PublicRoomSnapshot;
  participantToken: string;
  onBack(): void;
}) {
  const chooseSeat = trpc.chooseSeat.useMutation();
  const setReady = trpc.setReady.useMutation();
  const startGame = trpc.startGame.useMutation();

  const participant = props.room.participants.find((candidate) => candidate.id === props.room.currentParticipantId);
  const ownSeat = props.room.seats.find((seat) => seat.participantId === participant?.id);
  const isHost = participant?.id === props.room.hostParticipantId;

  return (
    <main className="page">
      <button className="link-button" onClick={props.onBack}>Back to rooms</button>
      <section className="panel">
        <h1>Room {props.room.code}</h1>
        <p>{props.room.status === "waiting" ? "Choose a seat and ready up." : "Game in progress."}</p>
        <div className="seat-grid">
          {seats.map((seatId) => {
            const seat = props.room.seats.find((candidate) => candidate.id === seatId);
            const occupant = props.room.participants.find((candidate) => candidate.id === seat?.participantId);
            return (
              <article className="seat-card" key={seatId}>
                <strong>{seatId}</strong>
                <span>Team {seat?.teamId}</span>
                <span>{occupant?.displayName ?? "Open"}</span>
                <span>{seat?.ready ? "Ready" : "Not ready"}</span>
                {!seat?.participantId ? (
                  <button onClick={() => chooseSeat.mutate({ code: props.room.code, participantToken: props.participantToken, seatId })}>
                    Sit here
                  </button>
                ) : null}
              </article>
            );
          })}
        </div>
        {ownSeat ? (
          <button onClick={() => setReady.mutate({ code: props.room.code, participantToken: props.participantToken, ready: !ownSeat.ready })}>
            {ownSeat.ready ? "Unready" : "Ready"}
          </button>
        ) : (
          <p>You are spectating until you choose an open seat.</p>
        )}
        {isHost ? (
          <button onClick={() => startGame.mutate({ code: props.room.code, participantToken: props.participantToken })}>Start game</button>
        ) : null}
      </section>
    </main>
  );
}
```

- [ ] **Step 3: Wire app navigation**

Modify `apps/web/src/App.tsx`:

```tsx
import { useCallback, useState } from "react";
import type { PublicRoomSnapshot } from "@hengames/shared";
import { trpc } from "./api/trpc";
import { useRoomSocket } from "./api/useRoomSocket";
import { HomePage } from "./components/HomePage";
import { Lobby } from "./components/Lobby";

export function App() {
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [participantToken, setParticipantToken] = useState<string | undefined>();
  const [socketSnapshot, setSocketSnapshot] = useState<PublicRoomSnapshot | null>(null);
  const roomQuery = trpc.getRoom.useQuery(
    { code: roomCode ?? "", participantToken },
    { enabled: Boolean(roomCode) }
  );
  const handleSnapshot = useCallback((snapshot: PublicRoomSnapshot) => {
    setSocketSnapshot(snapshot);
  }, []);

  useRoomSocket({ code: roomCode, participantToken, onSnapshot: handleSnapshot });

  const room = socketSnapshot ?? roomQuery.data ?? null;

  if (!roomCode || !participantToken) {
    return (
      <HomePage
        onEnterRoom={(code, token) => {
          setRoomCode(code);
          setParticipantToken(token);
          setSocketSnapshot(null);
        }}
      />
    );
  }

  if (!room) {
    return <main className="page">Loading room...</main>;
  }

  return (
    <Lobby
      room={room}
      participantToken={participantToken}
      onBack={() => {
        setRoomCode(null);
        setParticipantToken(undefined);
        setSocketSnapshot(null);
      }}
    />
  );
}
```

- [ ] **Step 4: Add responsive styles**

Create `apps/web/src/styles.css`:

```css
:root {
  color: #f8fafc;
  background: #0f172a;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

body {
  margin: 0;
}

button,
input {
  border-radius: 0.75rem;
  border: 1px solid #334155;
  font: inherit;
  padding: 0.85rem 1rem;
}

button {
  background: #38bdf8;
  color: #082f49;
  cursor: pointer;
  font-weight: 700;
}

.page {
  margin: 0 auto;
  max-width: 1100px;
  padding: 1rem;
}

.hero,
.panel,
.room-card,
.seat-card {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 1rem;
  padding: 1rem;
}

.hero,
.panel {
  margin-bottom: 1rem;
}

.hero label {
  display: grid;
  gap: 0.4rem;
  margin: 1rem 0;
}

.room-list,
.seat-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.room-card,
.seat-card {
  display: grid;
  gap: 0.5rem;
}

.link-button {
  background: transparent;
  color: #bae6fd;
}
```

- [ ] **Step 5: Verify web build**

Run:

```powershell
npm run build -w @hengames/web
```

Expected: exits with code 0.

- [ ] **Step 6: Commit**

```powershell
git add apps/web/src
git commit -m "feat: add room discovery and lobby UI" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Task 9: Host Reset and Kick Controls

**Files:**
- Modify: `apps/server/src/rooms/roomStore.ts`
- Modify: `apps/server/src/routers/appRouter.ts`
- Modify: `apps/web/src/components/Lobby.tsx`

- [ ] **Step 1: Add room store host-control methods**

Modify the returned method list in `apps/server/src/rooms/roomStore.ts`:

```ts
return {
  createRoom,
  listRooms,
  joinRoom,
  chooseSeat,
  setReady,
  resetLobby,
  kickParticipant,
  startGame,
  applyGameAction,
  getSnapshot
};
```

Add these functions before `startGame`:

```ts
function resetLobby(input: { code: RoomCode; participantToken: string }) {
  const { participant, room } = authenticate(input.code, input.participantToken);
  requireHost(room, participant.id);
  if (room.status !== "waiting") {
    throw new Error("Only waiting rooms can be reset in the first version.");
  }
  for (const seat of room.seats) {
    if (seat.participantId) {
      room.spectatorIds.add(seat.participantId);
    }
    seat.participantId = null;
    seat.ready = false;
  }
  room.gameState = null;
  room.status = "waiting";
  return snapshot(room, participant.id);
}

function kickParticipant(input: { code: RoomCode; participantToken: string; targetParticipantId: string }) {
  const { participant, room } = authenticate(input.code, input.participantToken);
  requireHost(room, participant.id);
  if (room.status !== "waiting") {
    throw new Error("Participants can only be kicked before the game starts.");
  }
  if (input.targetParticipantId === room.hostParticipantId) {
    throw new Error("The host cannot kick themselves.");
  }
  if (!room.participants.has(input.targetParticipantId)) {
    throw new Error("Participant not found.");
  }
  room.participants.delete(input.targetParticipantId);
  room.spectatorIds.delete(input.targetParticipantId);
  for (const seat of room.seats) {
    if (seat.participantId === input.targetParticipantId) {
      seat.participantId = null;
      seat.ready = false;
    }
  }
  return snapshot(room, participant.id);
}

function requireHost(room: RoomRecord, participantId: string) {
  if (room.hostParticipantId !== participantId) {
    throw new Error("Only the host can do that.");
  }
}
```

Replace the host check in `startGame`:

```ts
requireHost(room, participant.id);
```

- [ ] **Step 2: Add tRPC host-control mutations**

Add these procedures to `apps/server/src/routers/appRouter.ts` after `setReady`:

```ts
resetLobby: publicProcedure
  .input(z.object({ code: z.string(), participantToken: z.string() }))
  .mutation(({ input }) => {
    const snapshot = roomStore.resetLobby(input);
    wsHub.broadcastRoom(input.code, roomStore);
    return snapshot;
  }),
kickParticipant: publicProcedure
  .input(z.object({ code: z.string(), participantToken: z.string(), targetParticipantId: z.string() }))
  .mutation(({ input }) => {
    const snapshot = roomStore.kickParticipant(input);
    wsHub.broadcastRoom(input.code, roomStore);
    return snapshot;
  }),
```

- [ ] **Step 3: Add host controls to the lobby UI**

Add these mutations near the existing lobby mutations in `apps/web/src/components/Lobby.tsx`:

```tsx
const resetLobby = trpc.resetLobby.useMutation();
const kickParticipant = trpc.kickParticipant.useMutation();
```

Add this host-only controls block after the Start game button:

```tsx
{isHost ? (
  <section className="panel">
    <h2>Host controls</h2>
    <button onClick={() => resetLobby.mutate({ code: props.room.code, participantToken: props.participantToken })}>
      Reset lobby seats
    </button>
    <div className="room-list">
      {props.room.participants
        .filter((candidate) => candidate.id !== props.room.hostParticipantId)
        .map((candidate) => (
          <article className="room-card" key={candidate.id}>
            <span>{candidate.displayName}</span>
            <button
              onClick={() =>
                kickParticipant.mutate({
                  code: props.room.code,
                  participantToken: props.participantToken,
                  targetParticipantId: candidate.id
                })
              }
            >
              Kick
            </button>
          </article>
        ))}
    </div>
  </section>
) : null}
```

- [ ] **Step 4: Verify dependent packages**

Run:

```powershell
npm run typecheck
```

Expected: exits with code 0.

- [ ] **Step 5: Commit**

```powershell
git add packages/shared apps/server apps/web
git commit -m "feat: add room host controls" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Task 10: Game Table UI

**Files:**
- Create: `apps/web/src/components/GameTable.tsx`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/styles.css`

- [ ] **Step 1: Create game table component**

Create `apps/web/src/components/GameTable.tsx`:

```tsx
import type { Card, PublicRoomSnapshot } from "@hengames/shared";
import { trpc } from "../api/trpc";

export function GameTable(props: {
  room: PublicRoomSnapshot;
  participantToken: string;
  onBack(): void;
}) {
  const action = trpc.gameAction.useMutation();
  const view = props.room.currentView as {
    currentPlayerId: string;
    turnStep: "must-draw" | "may-meld" | "must-discard";
    players: Record<string, { hand?: Card[]; handCount?: number; footCount?: number; teamId: "red" | "blue"; activePile: "hand" | "foot" }>;
    topDiscard: Card | null;
    drawCount: number;
    melds: Array<{ id: string; rank: string; teamId: "red" | "blue"; cards: Card[]; isBook: boolean; isClean: boolean }>;
    teamScores: Record<"red" | "blue", number>;
    lastEvent: string;
  } | null;

  const currentParticipantId = props.room.currentParticipantId;
  const ownPlayer = currentParticipantId ? view?.players[currentParticipantId] : undefined;

  return (
    <main className="page">
      <button className="link-button" onClick={props.onBack}>Back to rooms</button>
      <section className="panel">
        <h1>Room {props.room.code}</h1>
        {view ? (
          <>
            <p>{view.lastEvent}</p>
            <p>Current turn: {displayName(view.currentPlayerId, props.room)}</p>
            <p>Scores: Red {view.teamScores.red} | Blue {view.teamScores.blue}</p>
            <div className="table-grid">
              <article className="panel">
                <h2>Your cards</h2>
                {ownPlayer?.hand?.length ? (
                  <div className="card-grid">
                    {ownPlayer.hand.map((card) => (
                      <button
                        className="playing-card"
                        key={card.id}
                        onClick={() =>
                          view.turnStep === "must-discard"
                            ? action.mutate({ code: props.room.code, participantToken: props.participantToken, action: { type: "discard", cardId: card.id } })
                            : undefined
                        }
                      >
                        {card.rank}
                        <small>{card.suit}</small>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p>You are spectating public state.</p>
                )}
              </article>
              <article className="panel">
                <h2>Actions</h2>
                <button
                  disabled={view.turnStep !== "must-draw"}
                  onClick={() => action.mutate({ code: props.room.code, participantToken: props.participantToken, action: { type: "draw" } })}
                >
                  Draw 2
                </button>
                <p>Top discard: {view.topDiscard ? `${view.topDiscard.rank} ${view.topDiscard.suit}` : "None"}</p>
                <p>Draw pile: {view.drawCount}</p>
              </article>
            </div>
            <section className="panel">
              <h2>Melds and books</h2>
              <div className="room-list">
                {view.melds.map((meld) => (
                  <article className="room-card" key={meld.id}>
                    <strong>{meld.rank}</strong>
                    <span>Team {meld.teamId}</span>
                    <span>{meld.cards.length} cards</span>
                    <span>{meld.isBook ? (meld.isClean ? "Clean book" : "Dirty book") : "Meld"}</span>
                  </article>
                ))}
              </div>
            </section>
          </>
        ) : (
          <p>Waiting for game state...</p>
        )}
      </section>
    </main>
  );
}

function displayName(participantId: string, room: PublicRoomSnapshot): string {
  return room.participants.find((participant) => participant.id === participantId)?.displayName ?? participantId;
}
```

- [ ] **Step 2: Route playing rooms to game table**

Modify `apps/web/src/App.tsx`:

```tsx
import { useCallback, useState } from "react";
import type { PublicRoomSnapshot } from "@hengames/shared";
import { trpc } from "./api/trpc";
import { useRoomSocket } from "./api/useRoomSocket";
import { GameTable } from "./components/GameTable";
import { HomePage } from "./components/HomePage";
import { Lobby } from "./components/Lobby";

export function App() {
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [participantToken, setParticipantToken] = useState<string | undefined>();
  const [socketSnapshot, setSocketSnapshot] = useState<PublicRoomSnapshot | null>(null);
  const roomQuery = trpc.getRoom.useQuery(
    { code: roomCode ?? "", participantToken },
    { enabled: Boolean(roomCode) }
  );
  const handleSnapshot = useCallback((snapshot: PublicRoomSnapshot) => {
    setSocketSnapshot(snapshot);
  }, []);

  useRoomSocket({ code: roomCode, participantToken, onSnapshot: handleSnapshot });

  const leaveRoom = () => {
    setRoomCode(null);
    setParticipantToken(undefined);
    setSocketSnapshot(null);
  };
  const room = socketSnapshot ?? roomQuery.data ?? null;

  if (!roomCode || !participantToken) {
    return (
      <HomePage
        onEnterRoom={(code, token) => {
          setRoomCode(code);
          setParticipantToken(token);
          setSocketSnapshot(null);
        }}
      />
    );
  }

  if (!room) {
    return <main className="page">Loading room...</main>;
  }

  if (room.status === "playing") {
    return <GameTable room={room} participantToken={participantToken} onBack={leaveRoom} />;
  }

  return <Lobby room={room} participantToken={participantToken} onBack={leaveRoom} />;
}
```

- [ ] **Step 3: Add card table styles**

Append to `apps/web/src/styles.css`:

```css
.table-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: minmax(0, 2fr) minmax(220px, 1fr);
}

.card-grid {
  display: grid;
  gap: 0.5rem;
  grid-template-columns: repeat(auto-fit, minmax(72px, 1fr));
}

.playing-card {
  align-items: center;
  aspect-ratio: 2.5 / 3.5;
  background: #f8fafc;
  color: #0f172a;
  display: grid;
  justify-items: center;
  min-height: 96px;
}

.playing-card small {
  color: #475569;
  font-size: 0.75rem;
}

@media (max-width: 760px) {
  .table-grid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 4: Verify web build**

Run:

```powershell
npm run build -w @hengames/web
```

Expected: exits with code 0.

- [ ] **Step 5: Commit**

```powershell
git add apps/web/src
git commit -m "feat: add Hand and Foot game table" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Task 11: Full-System Smoke Test and README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update README with run instructions**

Modify `README.md`:

```md
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
```

- [ ] **Step 2: Run all verification commands**

Run:

```powershell
npm run typecheck
npm run test
npm run build
```

Expected: all commands exit with code 0.

- [ ] **Step 3: Manual smoke test**

Run the app:

```powershell
npm run dev
```

Open `http://localhost:5173` in two browser windows. Verify:

1. The first window can create a room.
2. The second window sees the room in the active room list without a code.
3. Four joined participants can choose north/east/south/west seats and ready up.
4. The host can start the game.
5. The current player can draw.
6. The game table updates in the other windows without refreshing.

Stop the dev command with `Ctrl+C`.

- [ ] **Step 4: Commit**

```powershell
git add README.md
git commit -m "docs: add development instructions" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Self-Review Checklist

- Spec coverage: Tasks cover the monorepo, Vite React client, TypeScript server, tRPC commands/queries, WebSocket broadcasts, in-memory rooms, active room listing, anonymous names, host controls, seats, spectators, server-authoritative state, game interface, strict Hand and Foot baseline, typed errors, reconnect snapshots, tests, and README updates.
- Placeholder scan: This plan has no placeholder markers or unspecified validation steps. Every task names files, commands, and expected outcomes.
- Type consistency: Shared DTO names are `PublicRoomSnapshot`, `RoomSummary`, `Participant`, `Seat`, and `SeatId`; server and web tasks use those exact names. Hand and Foot action names are `draw`, `meld`, and `discard`; server and web tasks use those exact names.
