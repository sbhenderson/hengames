# Game Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Hand and Foot game page into a mobile-first card-game table with clear turn status, shared table state, compact player summaries, draggable local card ordering, multi-card selection, meld actions, discard actions, and subtle book/meld hints.

**Architecture:** Keep the server-authoritative room snapshot and `gameAction` mutation unchanged. Split the current `GameTable.tsx` into focused web client components plus pure helper modules for card display, card-order reconciliation, selection analysis, hint classification, and turn prompts. Use CSS to create one mobile-first layout that expands on larger screens.

**Tech Stack:** React 19, TypeScript, Vite, tRPC, Vitest for pure helper tests, existing CSS in `apps\web\src\styles.css`.

---

## File structure

- Create: `apps\web\src\components\game-table\types.ts`
  - Shared table-view, team, player, hint, and action-option types for game table components.
- Create: `apps\web\src\components\game-table\cardDisplay.ts`
  - Card rank/suit formatting and meld/book label helpers.
- Create: `apps\web\src\components\game-table\gameTableHelpers.ts`
  - Pure helper logic for local hand order, turn prompt text, selected-card action analysis, and card hints.
- Create: `apps\web\src\components\game-table\gameTableHelpers.test.ts`
  - Vitest coverage for helper logic.
- Create: `apps\web\src\components\game-table\GameHud.tsx`
  - Sticky game status header and current user/avatar controls.
- Create: `apps\web\src\components\game-table\TableSurface.tsx`
  - Shared draw/discard piles, last event, and red/blue meld/book zones.
- Create: `apps\web\src\components\game-table\PlayerStrip.tsx`
  - Compact player chips with avatar, team, active pile, hand/foot counts, and turn marker.
- Create: `apps\web\src\components\game-table\PlayingCardButton.tsx`
  - Accessible playing-card button with selected, draggable, hint, and keyboard reorder states.
- Create: `apps\web\src\components\game-table\HandTray.tsx`
  - Local card ordering, drag/drop reordering, tap selection, move-left/move-right controls, contextual meld/discard actions, and action errors.
- Modify: `apps\web\src\components\GameTable.tsx`
  - Container only: derive current participant/player, call mutations, pass props to focused components, clear transient errors after successful actions.
- Modify: `apps\web\src\styles.css`
  - Mobile-first game table shell, sticky HUD, felt-like table surface, player strip, hand tray, compact cards, selected/hint states, and desktop expansion.

---

### Task 1: Shared types and display helpers

**Files:**
- Create: `apps\web\src\components\game-table\types.ts`
- Create: `apps\web\src\components\game-table\cardDisplay.ts`
- Create: `apps\web\src\components\game-table\gameTableHelpers.test.ts`

- [ ] **Step 1: Create shared game table types**

Create `apps\web\src\components\game-table\types.ts`:

```ts
import type { Card } from "@hengames/shared";

export type TeamId = "red" | "blue";

export type HandAndFootTableView = {
  phase: "playing" | "round-over" | "game-over";
  round: number;
  currentPlayerId: string;
  turnStep: "must-draw" | "may-meld" | "must-discard";
  players: Record<string, PublicPlayerState>;
  topDiscard: Card | null;
  discardCount: number;
  drawCount: number;
  melds: MeldView[];
  teamScores: Record<TeamId, number>;
  roundScores: Array<Record<TeamId, number>>;
  lastEvent: string;
};

export type PublicPlayerState = {
  id: string;
  teamId: TeamId;
  activePile: "hand" | "foot";
  hand?: Card[];
  foot?: Card[];
  handCount?: number;
  footCount?: number;
};

export type MeldView = {
  id: string;
  rank: Card["rank"];
  teamId: TeamId;
  cards: Card[];
  isBook: boolean;
  isClean: boolean;
};

export type CardHint = "possible-meld" | "existing-meld" | "wild-helper";

export type AddToMeldOption = {
  meldId: string;
  rank: Card["rank"];
  label: string;
};

export type SelectionAnalysis = {
  selectedCards: Card[];
  canCreateMeld: boolean;
  addToMeldOptions: AddToMeldOption[];
  canDiscard: boolean;
};
```

- [ ] **Step 2: Create card display helpers**

Create `apps\web\src\components\game-table\cardDisplay.ts`:

```ts
import type { Card } from "@hengames/shared";
import type { MeldView } from "./types";

export const suitEmoji: Record<Card["suit"], string> = {
  clubs: "♣️",
  diamonds: "♦️",
  hearts: "♥️",
  spades: "♠️",
  joker: "🤡"
};

export function formatCardRank(card: Card): string {
  return card.rank === "JOKER" ? "🤡" : card.rank;
}

export function formatCard(card: Card): string {
  return card.rank === "JOKER" ? "🤡 Joker" : `${card.rank} ${suitEmoji[card.suit]}`;
}

export function bookLabel(meld: MeldView): string {
  const hasWilds = meld.cards.some((card) => card.rank === "2" || card.rank === "JOKER");
  if (meld.isBook) {
    return hasWilds ? "Black dirty book" : "Red clean book";
  }
  return hasWilds ? "Building black book" : "Building red book";
}

export function bookClassName(meld: MeldView): string {
  const hasWilds = meld.cards.some((card) => card.rank === "2" || card.rank === "JOKER");
  return hasWilds ? "book-badge dirty-book" : "book-badge clean-book";
}
```

- [ ] **Step 3: Add initial display-helper tests**

Create `apps\web\src\components\game-table\gameTableHelpers.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import type { Card } from "@hengames/shared";
import { bookClassName, bookLabel, formatCard, formatCardRank } from "./cardDisplay";
import type { MeldView } from "./types";

function card(id: string, rank: Card["rank"], suit: Card["suit"] = "hearts"): Card {
  if (rank === "JOKER") {
    return { id, rank, suit: "joker", deckIndex: 0 };
  }
  return { id, rank, suit: suit === "joker" ? "hearts" : suit, deckIndex: 0 };
}

describe("card display helpers", () => {
  test("formats standard cards and jokers", () => {
    expect(formatCardRank(card("a", "A", "spades"))).toBe("A");
    expect(formatCard(card("a", "A", "spades"))).toBe("A ♠️");
    expect(formatCardRank(card("j", "JOKER"))).toBe("🤡");
    expect(formatCard(card("j", "JOKER"))).toBe("🤡 Joker");
  });

  test("labels clean and dirty books with text and classes", () => {
    const clean: MeldView = {
      id: "clean",
      rank: "8",
      teamId: "red",
      cards: [card("8a", "8"), card("8b", "8"), card("8c", "8")],
      isBook: true,
      isClean: true
    };
    const dirty: MeldView = {
      id: "dirty",
      rank: "K",
      teamId: "blue",
      cards: [card("ka", "K"), card("kb", "K"), card("wild", "2")],
      isBook: false,
      isClean: false
    };

    expect(bookLabel(clean)).toBe("Red clean book");
    expect(bookClassName(clean)).toBe("book-badge clean-book");
    expect(bookLabel(dirty)).toBe("Building black book");
    expect(bookClassName(dirty)).toBe("book-badge dirty-book");
  });
});
```

- [ ] **Step 4: Run helper tests to verify display helpers pass**

Run:

```powershell
npx vitest run apps\web\src\components\game-table\gameTableHelpers.test.ts
```

Expected: PASS with the two display-helper tests.

- [ ] **Step 5: Commit**

```powershell
git add apps\web\src\components\game-table\types.ts apps\web\src\components\game-table\cardDisplay.ts apps\web\src\components\game-table\gameTableHelpers.test.ts
git commit -m "feat: add game table display helpers" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 2: Interaction helper logic

**Files:**
- Create: `apps\web\src\components\game-table\gameTableHelpers.ts`
- Modify: `apps\web\src\components\game-table\gameTableHelpers.test.ts`

- [ ] **Step 1: Add failing tests for order reconciliation, prompts, selection analysis, and hints**

Append these imports to `apps\web\src\components\game-table\gameTableHelpers.test.ts`:

```ts
import {
  analyzeSelectedCards,
  getCardHints,
  reconcileCardOrder,
  turnActionPrompt
} from "./gameTableHelpers";
```

Append these tests to `apps\web\src\components\game-table\gameTableHelpers.test.ts`:

```ts
describe("game table interaction helpers", () => {
  test("reconciles saved card order with fresh cards", () => {
    const cards = [card("a", "A"), card("b", "K"), card("c", "5"), card("d", "7")];

    expect(reconcileCardOrder(cards, ["c", "a", "missing"])).toEqual(["c", "a", "b", "d"]);
  });

  test("builds direct action prompts for own and waiting turns", () => {
    expect(
      turnActionPrompt({
        isOwnTurn: true,
        currentPlayerName: "peeking-penguin",
        turnStep: "must-draw"
      })
    ).toBe("Your turn: draw 2");
    expect(
      turnActionPrompt({
        isOwnTurn: true,
        currentPlayerName: "peeking-penguin",
        turnStep: "must-discard"
      })
    ).toBe("Your turn: meld if you can, then discard 1");
    expect(
      turnActionPrompt({
        isOwnTurn: false,
        currentPlayerName: "curious-cardinal",
        turnStep: "must-draw"
      })
    ).toBe("Waiting for curious-cardinal to draw");
  });

  test("detects create-meld, add-to-meld, and discard options", () => {
    const hand = [
      card("8a", "8"),
      card("8b", "8"),
      card("8c", "8"),
      card("wild", "2"),
      card("ka", "K")
    ];
    const melds = [
      {
        id: "meld-k",
        rank: "K" as const,
        teamId: "red" as const,
        cards: [card("kb", "K"), card("kc", "K"), card("kd", "K")],
        isBook: false,
        isClean: true
      }
    ];

    expect(
      analyzeSelectedCards({
        cards: hand,
        selectedCardIds: ["8a", "8b", "8c"],
        melds,
        teamId: "red",
        turnStep: "must-discard"
      })
    ).toMatchObject({ canCreateMeld: true, canDiscard: false });

    expect(
      analyzeSelectedCards({
        cards: hand,
        selectedCardIds: ["ka"],
        melds,
        teamId: "red",
        turnStep: "must-discard"
      })
    ).toMatchObject({
      canCreateMeld: false,
      canDiscard: true,
      addToMeldOptions: [{ meldId: "meld-k", rank: "K", label: "Add to K" }]
    });
  });

  test("classifies possible meld, existing meld, and wild helper card hints", () => {
    const hand = [
      card("8a", "8"),
      card("8b", "8"),
      card("8c", "8"),
      card("ka", "K"),
      card("wild", "JOKER")
    ];
    const melds = [
      {
        id: "meld-k",
        rank: "K" as const,
        teamId: "red" as const,
        cards: [card("kb", "K"), card("kc", "K"), card("kd", "K")],
        isBook: false,
        isClean: true
      }
    ];

    const hints = getCardHints({ cards: hand, melds, teamId: "red" });

    expect(hints["8a"]).toBe("possible-meld");
    expect(hints["ka"]).toBe("existing-meld");
    expect(hints["wild"]).toBe("wild-helper");
  });
});
```

- [ ] **Step 2: Run tests to verify helper tests fail before implementation**

Run:

```powershell
npx vitest run apps\web\src\components\game-table\gameTableHelpers.test.ts
```

Expected: FAIL because `gameTableHelpers.ts` does not exist.

- [ ] **Step 3: Implement interaction helpers**

Create `apps\web\src\components\game-table\gameTableHelpers.ts`:

```ts
import type { Card } from "@hengames/shared";
import type { AddToMeldOption, CardHint, HandAndFootTableView, MeldView, SelectionAnalysis, TeamId } from "./types";

export function reconcileCardOrder(cards: Card[], previousOrder: string[]): string[] {
  const cardIds = cards.map((card) => card.id);
  const presentIds = new Set(cardIds);
  const orderedExisting = previousOrder.filter((cardId) => presentIds.has(cardId));
  const alreadyOrdered = new Set(orderedExisting);
  const appendedNew = cardIds.filter((cardId) => !alreadyOrdered.has(cardId));
  return [...orderedExisting, ...appendedNew];
}

export function turnActionPrompt(input: {
  isOwnTurn: boolean;
  currentPlayerName: string;
  turnStep: HandAndFootTableView["turnStep"];
}): string {
  if (input.isOwnTurn) {
    if (input.turnStep === "must-draw") {
      return "Your turn: draw 2";
    }
    if (input.turnStep === "must-discard") {
      return "Your turn: meld if you can, then discard 1";
    }
    return "Your turn: select cards to meld";
  }

  if (input.turnStep === "must-draw") {
    return `Waiting for ${input.currentPlayerName} to draw`;
  }
  if (input.turnStep === "must-discard") {
    return `Waiting for ${input.currentPlayerName} to discard`;
  }
  return `Waiting for ${input.currentPlayerName} to meld`;
}

export function analyzeSelectedCards(input: {
  cards: Card[];
  selectedCardIds: string[];
  melds: MeldView[];
  teamId: TeamId | undefined;
  turnStep: HandAndFootTableView["turnStep"];
}): SelectionAnalysis {
  const selectedIdSet = new Set(input.selectedCardIds);
  const selectedCards = input.cards.filter((card) => selectedIdSet.has(card.id));
  const ownMelds = input.teamId ? input.melds.filter((meld) => meld.teamId === input.teamId) : [];

  return {
    selectedCards,
    canCreateMeld: canFormMeld(selectedCards),
    addToMeldOptions: addToMeldOptions(selectedCards, ownMelds),
    canDiscard: input.turnStep === "must-discard" && selectedCards.length === 1
  };
}

export function getCardHints(input: {
  cards: Card[];
  melds: MeldView[];
  teamId: TeamId | undefined;
}): Record<string, CardHint> {
  const hints: Record<string, CardHint> = {};
  const naturalCounts = new Map<Card["rank"], number>();
  const ownMeldRanks = new Set(
    input.melds
      .filter((meld) => meld.teamId === input.teamId)
      .map((meld) => meld.rank)
  );

  for (const card of input.cards) {
    if (!isWild(card)) {
      naturalCounts.set(card.rank, (naturalCounts.get(card.rank) ?? 0) + 1);
    }
  }

  for (const card of input.cards) {
    if (isWild(card)) {
      hints[card.id] = "wild-helper";
    } else if (ownMeldRanks.has(card.rank)) {
      hints[card.id] = "existing-meld";
    } else if ((naturalCounts.get(card.rank) ?? 0) >= 3) {
      hints[card.id] = "possible-meld";
    }
  }

  return hints;
}

function addToMeldOptions(selectedCards: Card[], melds: MeldView[]): AddToMeldOption[] {
  if (selectedCards.length === 0) {
    return [];
  }

  return melds
    .filter((meld) => selectedCards.every((card) => isWild(card) || card.rank === meld.rank))
    .filter((meld) => canFormMeld([...meld.cards, ...selectedCards]))
    .map((meld) => ({
      meldId: meld.id,
      rank: meld.rank,
      label: `Add to ${meld.rank}`
    }));
}

function canFormMeld(cards: Card[]): boolean {
  if (cards.length < 3) {
    return false;
  }

  const naturalCards = cards.filter((card) => !isWild(card));
  const wildCards = cards.filter(isWild);
  const naturalRanks = new Set(naturalCards.map((card) => card.rank));

  return naturalCards.length >= 2 && naturalRanks.size === 1 && wildCards.length <= naturalCards.length;
}

function isWild(card: Card): boolean {
  return card.rank === "2" || card.rank === "JOKER";
}
```

- [ ] **Step 4: Run helper tests to verify they pass**

Run:

```powershell
npx vitest run apps\web\src\components\game-table\gameTableHelpers.test.ts
```

Expected: PASS with all helper tests.

- [ ] **Step 5: Commit**

```powershell
git add apps\web\src\components\game-table\gameTableHelpers.ts apps\web\src\components\game-table\gameTableHelpers.test.ts
git commit -m "feat: add game table interaction helpers" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 3: HUD, table surface, and player strip components

**Files:**
- Create: `apps\web\src\components\game-table\GameHud.tsx`
- Create: `apps\web\src\components\game-table\TableSurface.tsx`
- Create: `apps\web\src\components\game-table\PlayerStrip.tsx`

- [ ] **Step 1: Create the sticky HUD component**

Create `apps\web\src\components\game-table\GameHud.tsx`:

```tsx
import type { ParticipantAvatar } from "@hengames/shared";
import { AvatarPicker } from "../AvatarPicker";
import type { HandAndFootTableView, TeamId } from "./types";

export function GameHud(props: {
  roomCode: string;
  round: number;
  currentPlayerName: string;
  actionPrompt: string;
  teamScores: Record<TeamId, number>;
  isOwnTurn: boolean;
  participant?: {
    displayName: string;
    avatar: ParticipantAvatar;
  };
  playerTeam?: TeamId;
  activePile?: "hand" | "foot";
  turnStep: HandAndFootTableView["turnStep"];
  avatarDisabled: boolean;
  onBack(): void;
  onAvatarChange(avatar: ParticipantAvatar): void;
}) {
  return (
    <header className="game-hud">
      <div className="game-hud__topline">
        <button className="link-button game-hud__back" onClick={props.onBack}>Back</button>
        <span className="game-hud__room">Room {props.roomCode}</span>
        <span className={props.isOwnTurn ? "turn-pill active" : "turn-pill"}>{props.isOwnTurn ? "Your turn" : "Waiting"}</span>
      </div>
      <div className="game-hud__main">
        <div>
          <strong>Round {props.round}</strong>
          <p>{props.actionPrompt}</p>
        </div>
        <div className="score-strip" aria-label="Team scores">
          <span className="team-score red-team">Red {props.teamScores.red}</span>
          <span className="team-score blue-team">Blue {props.teamScores.blue}</span>
        </div>
      </div>
      <div className="game-hud__meta">
        <span>Current: {props.currentPlayerName}</span>
        <span>Step: {turnStepLabel(props.turnStep)}</span>
      </div>
      {props.participant ? (
        <div className="game-hud__player">
          <span className="avatar" style={{ background: props.participant.avatar.color }}>{props.participant.avatar.emoji}</span>
          <div>
            <strong>{props.participant.displayName}</strong>
            <p className="helper-text">
              Team {props.playerTeam ?? "spectator"}{props.activePile ? `; playing from ${props.activePile}` : ""}.
            </p>
            <AvatarPicker disabled={props.avatarDisabled} value={props.participant.avatar} onChange={props.onAvatarChange} />
          </div>
        </div>
      ) : null}
    </header>
  );
}

function turnStepLabel(turnStep: HandAndFootTableView["turnStep"]): string {
  if (turnStep === "must-draw") {
    return "Draw";
  }
  if (turnStep === "must-discard") {
    return "Meld or discard";
  }
  return "Meld";
}
```

- [ ] **Step 2: Create the shared table surface component**

Create `apps\web\src\components\game-table\TableSurface.tsx`:

```tsx
import type { Card } from "@hengames/shared";
import { bookClassName, bookLabel, formatCard } from "./cardDisplay";
import type { MeldView, TeamId } from "./types";

export function TableSurface(props: {
  topDiscard: Card | null;
  discardCount: number;
  drawCount: number;
  melds: MeldView[];
  lastEvent: string;
}) {
  return (
    <section className="table-surface" aria-label="Shared table">
      <div className="pile-row">
        <article className="pile-card">
          <span>Draw pile</span>
          <strong>{props.drawCount}</strong>
        </article>
        <article className="pile-card discard-pile">
          <span>Top discard</span>
          <strong>{props.topDiscard ? formatCard(props.topDiscard) : "None"}</strong>
          <small>{props.discardCount} cards</small>
        </article>
      </div>
      <p className="event-banner">{props.lastEvent}</p>
      <div className="team-melds-grid">
        {(["red", "blue"] as const).map((teamId) => (
          <TeamMelds key={teamId} teamId={teamId} melds={props.melds.filter((meld) => meld.teamId === teamId)} />
        ))}
      </div>
    </section>
  );
}

function TeamMelds(props: {
  teamId: TeamId;
  melds: MeldView[];
}) {
  return (
    <section className={`team-meld-zone ${props.teamId}-team`} aria-label={`Team ${props.teamId} books and melds`}>
      <h2>Team {props.teamId}</h2>
      {props.melds.length ? (
        <div className="meld-list">
          {props.melds.map((meld) => (
            <article className={meld.isBook ? "meld-card complete" : "meld-card"} key={meld.id}>
              <strong>{meld.rank}</strong>
              <span>{meld.cards.length} cards</span>
              <span className={bookClassName(meld)}>{bookLabel(meld)}</span>
            </article>
          ))}
        </div>
      ) : (
        <p className="helper-text">No melds or books yet.</p>
      )}
    </section>
  );
}
```

- [ ] **Step 3: Create the player strip component**

Create `apps\web\src\components\game-table\PlayerStrip.tsx`:

```tsx
import type { RoomSnapshot } from "../../api/trpc";
import type { PublicPlayerState } from "./types";

export function PlayerStrip(props: {
  players: Record<string, PublicPlayerState>;
  room: RoomSnapshot;
  currentPlayerId: string;
}) {
  return (
    <section className="player-strip" aria-label="Players">
      {Object.entries(props.players).map(([playerId, player]) => {
        const participant = props.room.participants.find((candidate) => candidate.id === playerId);
        const isCurrent = playerId === props.currentPlayerId;
        return (
          <article className={isCurrent ? "player-chip current" : "player-chip"} key={playerId}>
            {participant ? (
              <span className="avatar small" style={{ background: participant.avatar.color }}>{participant.avatar.emoji}</span>
            ) : null}
            <div>
              <strong>{participant?.displayName ?? playerId}</strong>
              <span>Team {player.teamId}</span>
            </div>
            <div className="player-chip__counts">
              {isCurrent ? <span className="turn-dot">Turn</span> : null}
              <span>{player.activePile}: {player.hand?.length ?? player.handCount ?? 0}</span>
              {player.footCount !== undefined ? <span>Foot: {player.footCount}</span> : null}
            </div>
          </article>
        );
      })}
    </section>
  );
}
```

- [ ] **Step 4: Run typecheck for new components**

Run:

```powershell
npm run typecheck -w @hengames/web
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add apps\web\src\components\game-table\GameHud.tsx apps\web\src\components\game-table\TableSurface.tsx apps\web\src\components\game-table\PlayerStrip.tsx
git commit -m "feat: add game table status components" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 4: Playing cards and hand tray

**Files:**
- Create: `apps\web\src\components\game-table\PlayingCardButton.tsx`
- Create: `apps\web\src\components\game-table\HandTray.tsx`

- [ ] **Step 1: Create the accessible card button**

Create `apps\web\src\components\game-table\PlayingCardButton.tsx`:

```tsx
import type { Card } from "@hengames/shared";
import { formatCardRank, suitEmoji } from "./cardDisplay";
import type { CardHint } from "./types";

export function PlayingCardButton(props: {
  card: Card;
  selected: boolean;
  hint?: CardHint;
  draggable: boolean;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  onToggle(): void;
  onMoveLeft(): void;
  onMoveRight(): void;
  onDragStart(): void;
  onDragEnter(): void;
  onDragEnd(): void;
}) {
  const hintClass = props.hint ? ` hint-${props.hint}` : "";
  return (
    <div className={props.selected ? "hand-card-shell selected" : "hand-card-shell"}>
      <button
        aria-label={formatCardAccessibleName(props.card)}
        aria-pressed={props.selected}
        className={`playing-card${hintClass}`}
        draggable={props.draggable}
        onClick={props.onToggle}
        onDragStart={props.onDragStart}
        onDragEnter={props.onDragEnter}
        onDragEnd={props.onDragEnd}
        type="button"
      >
        <span>{formatCardRank(props.card)}</span>
        <small>{suitEmoji[props.card.suit]}</small>
      </button>
      {props.selected ? (
        <div className="card-reorder-controls" aria-label={`Reorder ${formatCardAccessibleName(props.card)}`}>
          <button disabled={!props.canMoveLeft} onClick={props.onMoveLeft} type="button">Left</button>
          <button disabled={!props.canMoveRight} onClick={props.onMoveRight} type="button">Right</button>
        </div>
      ) : null}
    </div>
  );
}

function formatCardAccessibleName(card: Card): string {
  if (card.rank === "JOKER") {
    return "Joker";
  }
  return `${card.rank} of ${card.suit}`;
}
```

- [ ] **Step 2: Create the hand tray component**

Create `apps\web\src\components\game-table\HandTray.tsx`:

```tsx
import { useEffect, useMemo, useState } from "react";
import type { Card } from "@hengames/shared";
import { analyzeSelectedCards, getCardHints, reconcileCardOrder } from "./gameTableHelpers";
import { PlayingCardButton } from "./PlayingCardButton";
import type { HandAndFootTableView, MeldView, TeamId } from "./types";

export function HandTray(props: {
  cards: Card[] | undefined;
  activePile: "hand" | "foot" | undefined;
  teamId: TeamId | undefined;
  turnStep: HandAndFootTableView["turnStep"];
  isOwnTurn: boolean;
  melds: MeldView[];
  actionError: string | null;
  actionPending: boolean;
  onDraw(): void;
  onDiscard(cardId: string): void;
  onCreateMeld(cardIds: string[]): void;
  onAddToMeld(cardIds: string[], targetMeldId: string): void;
}) {
  const [orderedCardIds, setOrderedCardIds] = useState<string[]>([]);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const visibleCards = useMemo(() => props.cards ?? [], [props.cards]);

  useEffect(() => {
    setOrderedCardIds((currentOrder) => reconcileCardOrder(visibleCards, currentOrder));
  }, [visibleCards]);

  useEffect(() => {
    const visibleCardIds = new Set(visibleCards.map((card) => card.id));
    setSelectedCardIds((currentSelection) => currentSelection.filter((cardId) => visibleCardIds.has(cardId)));
  }, [visibleCards]);

  const orderedCards = useMemo(() => {
    const byId = new Map(visibleCards.map((card) => [card.id, card]));
    return orderedCardIds.map((cardId) => byId.get(cardId)).filter((card): card is Card => Boolean(card));
  }, [orderedCardIds, visibleCards]);

  const hints = useMemo(
    () => getCardHints({ cards: visibleCards, melds: props.melds, teamId: props.teamId }),
    [visibleCards, props.melds, props.teamId]
  );
  const analysis = useMemo(
    () =>
      analyzeSelectedCards({
        cards: visibleCards,
        selectedCardIds,
        melds: props.melds,
        teamId: props.teamId,
        turnStep: props.turnStep
      }),
    [visibleCards, selectedCardIds, props.melds, props.teamId, props.turnStep]
  );

  if (!visibleCards.length) {
    return (
      <section className="hand-tray">
        <h2>Your cards</h2>
        <p className="helper-text">You are spectating public state.</p>
      </section>
    );
  }

  const selectedIds = analysis.selectedCards.map((card) => card.id);

  return (
    <section className="hand-tray" aria-label="Your cards">
      <div className="hand-tray__header">
        <div>
          <h2>Your {props.activePile ?? "hand"}</h2>
          <p className="helper-text">{visibleCards.length} cards. Tap to select; drag selected workspace cards to reorder.</p>
        </div>
        <button disabled={!props.isOwnTurn || props.turnStep !== "must-draw" || props.actionPending} onClick={props.onDraw} type="button">
          Draw 2
        </button>
      </div>
      {props.actionError ? <p className="action-error" role="alert">{props.actionError}</p> : null}
      <div className="hand-action-bar" aria-label="Selected card actions">
        <span>{selectedIds.length} selected</span>
        <button disabled={!analysis.canCreateMeld || props.actionPending} onClick={() => props.onCreateMeld(selectedIds)} type="button">
          Create meld
        </button>
        {analysis.addToMeldOptions.map((option) => (
          <button disabled={props.actionPending} key={option.meldId} onClick={() => props.onAddToMeld(selectedIds, option.meldId)} type="button">
            {option.label}
          </button>
        ))}
        <button
          disabled={!analysis.canDiscard || props.actionPending}
          onClick={() => {
            const cardId = selectedIds[0];
            if (cardId) {
              props.onDiscard(cardId);
            }
          }}
          type="button"
        >
          Discard
        </button>
        <button disabled={!selectedIds.length || props.actionPending} onClick={() => setSelectedCardIds([])} type="button">
          Clear
        </button>
      </div>
      <div className="hand-card-row">
        {orderedCards.map((card, index) => (
          <PlayingCardButton
            card={card}
            canMoveLeft={index > 0}
            canMoveRight={index < orderedCards.length - 1}
            draggable
            hint={hints[card.id]}
            key={card.id}
            onDragEnd={() => setDraggedCardId(null)}
            onDragEnter={() => {
              if (draggedCardId && draggedCardId !== card.id) {
                setOrderedCardIds((currentOrder) => moveBefore(currentOrder, draggedCardId, card.id));
              }
            }}
            onDragStart={() => setDraggedCardId(card.id)}
            onMoveLeft={() => setOrderedCardIds((currentOrder) => moveByOffset(currentOrder, card.id, -1))}
            onMoveRight={() => setOrderedCardIds((currentOrder) => moveByOffset(currentOrder, card.id, 1))}
          onToggle={() => {
              if (props.isOwnTurn && props.turnStep === "must-discard" && selectedCardIds.length === 1 && selectedCardIds[0] === card.id) {
                props.onDiscard(card.id);
                return;
              }
              setSelectedCardIds((currentSelection) =>
                currentSelection.includes(card.id)
                  ? currentSelection.filter((selectedCardId) => selectedCardId !== card.id)
                  : [...currentSelection, card.id]
              );
            }}
            selected={selectedCardIds.includes(card.id)}
          />
        ))}
      </div>
    </section>
  );
}

function moveBefore(cardIds: string[], movingCardId: string, targetCardId: string): string[] {
  const withoutMoving = cardIds.filter((cardId) => cardId !== movingCardId);
  const targetIndex = withoutMoving.indexOf(targetCardId);
  if (targetIndex === -1) {
    return cardIds;
  }
  return [...withoutMoving.slice(0, targetIndex), movingCardId, ...withoutMoving.slice(targetIndex)];
}

function moveByOffset(cardIds: string[], cardId: string, offset: -1 | 1): string[] {
  const currentIndex = cardIds.indexOf(cardId);
  const nextIndex = currentIndex + offset;
  if (currentIndex === -1 || nextIndex < 0 || nextIndex >= cardIds.length) {
    return cardIds;
  }
  const nextOrder = [...cardIds];
  const [card] = nextOrder.splice(currentIndex, 1);
  nextOrder.splice(nextIndex, 0, card);
  return nextOrder;
}
```

- [ ] **Step 3: Run typecheck for the new hand components**

Run:

```powershell
npm run typecheck -w @hengames/web
```

Expected: PASS.

- [ ] **Step 4: Commit**

```powershell
git add apps\web\src\components\game-table\PlayingCardButton.tsx apps\web\src\components\game-table\HandTray.tsx
git commit -m "feat: add interactive hand tray" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 5: Rewire the game table container

**Files:**
- Modify: `apps\web\src\components\GameTable.tsx`

- [ ] **Step 1: Replace `GameTable.tsx` with the container implementation**

Replace `apps\web\src\components\GameTable.tsx` with:

```tsx
import { useState } from "react";
import type { ParticipantAvatar } from "@hengames/shared";
import { trpc, type RoomSnapshot } from "../api/trpc";
import { GameHud } from "./game-table/GameHud";
import { HandTray } from "./game-table/HandTray";
import { PlayerStrip } from "./game-table/PlayerStrip";
import { TableSurface } from "./game-table/TableSurface";
import { turnActionPrompt } from "./game-table/gameTableHelpers";
import type { HandAndFootTableView } from "./game-table/types";

export function GameTable(props: {
  room: RoomSnapshot;
  participantToken: string;
  onBack(): void;
}) {
  const action = trpc.gameAction.useMutation();
  const updateAvatar = trpc.updateAvatar.useMutation();
  const [actionError, setActionError] = useState<string | null>(null);
  const view = props.room.currentView as HandAndFootTableView | null;

  const currentParticipantId = props.room.currentParticipantId;
  const ownPlayer = currentParticipantId && view ? view.players[currentParticipantId] : undefined;
  const visibleCards = ownPlayer?.activePile === "foot" ? ownPlayer.foot : ownPlayer?.hand;
  const participant = props.room.participants.find((candidate) => candidate.id === currentParticipantId);

  if (!view) {
    return (
      <main className="page game-page">
        <button className="link-button" onClick={props.onBack}>Back to rooms</button>
        <section className="panel">
          <p>Waiting for game state...</p>
        </section>
      </main>
    );
  }

  const currentPlayerName = displayName(view.currentPlayerId, props.room);
  const isOwnTurn = view.currentPlayerId === currentParticipantId;

  const runAction = (gameAction: Parameters<typeof action.mutate>[0]["action"]) => {
    setActionError(null);
    action.mutate(
      { code: props.room.code, participantToken: props.participantToken, action: gameAction },
      {
        onError(error) {
          setActionError(error.message);
        },
        onSuccess() {
          setActionError(null);
        }
      }
    );
  };

  const updateParticipantAvatar = (avatar: ParticipantAvatar) => {
    updateAvatar.mutate({
      code: props.room.code,
      participantToken: props.participantToken,
      avatar
    });
  };

  return (
    <main className="page game-page">
      <GameHud
        actionPrompt={turnActionPrompt({ isOwnTurn, currentPlayerName, turnStep: view.turnStep })}
        activePile={ownPlayer?.activePile}
        avatarDisabled={updateAvatar.isPending}
        currentPlayerName={currentPlayerName}
        isOwnTurn={isOwnTurn}
        onAvatarChange={updateParticipantAvatar}
        onBack={props.onBack}
        participant={participant}
        playerTeam={ownPlayer?.teamId}
        roomCode={props.room.code}
        round={view.round}
        teamScores={view.teamScores}
        turnStep={view.turnStep}
      />
      <section className="game-table-shell">
        <TableSurface
          discardCount={view.discardCount}
          drawCount={view.drawCount}
          lastEvent={view.lastEvent}
          melds={view.melds}
          topDiscard={view.topDiscard}
        />
        <PlayerStrip currentPlayerId={view.currentPlayerId} players={view.players} room={props.room} />
        <HandTray
          actionError={actionError}
          actionPending={action.isPending}
          activePile={ownPlayer?.activePile}
          cards={visibleCards}
          isOwnTurn={isOwnTurn}
          melds={view.melds}
          onAddToMeld={(cardIds, targetMeldId) => runAction({ type: "meld", cardIds, targetMeldId })}
          onCreateMeld={(cardIds) => runAction({ type: "meld", cardIds })}
          onDiscard={(cardId) => runAction({ type: "discard", cardId })}
          onDraw={() => runAction({ type: "draw" })}
          teamId={ownPlayer?.teamId}
          turnStep={view.turnStep}
        />
      </section>
    </main>
  );
}

function displayName(participantId: string, room: RoomSnapshot): string {
  return room.participants.find((participant) => participant.id === participantId)?.displayName ?? participantId;
}
```

- [ ] **Step 2: Run typecheck for the rewired game table**

Run:

```powershell
npm run typecheck -w @hengames/web
```

Expected: PASS.

- [ ] **Step 3: Commit**

```powershell
git add apps\web\src\components\GameTable.tsx
git commit -m "feat: rework game table container" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 6: Mobile-first game table styling

**Files:**
- Modify: `apps\web\src\styles.css`

- [ ] **Step 1: Append game table shell styles**

Append this CSS to `apps\web\src\styles.css`:

```css
.game-page {
  max-width: 1180px;
  padding: 0.75rem;
}

.game-hud {
  background: linear-gradient(135deg, #0f172a, #12312f);
  border: 1px solid #2dd4bf;
  border-radius: 1.25rem;
  box-shadow: 0 1rem 2rem rgb(2 6 23 / 0.35);
  display: grid;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
  padding: 0.85rem;
  position: sticky;
  top: 0.5rem;
  z-index: 20;
}

.game-hud__topline,
.game-hud__main,
.game-hud__meta,
.game-hud__player,
.score-strip,
.pile-row,
.hand-tray__header,
.hand-action-bar {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.game-hud__main {
  justify-content: space-between;
}

.game-hud__main p,
.game-hud__player p {
  margin: 0.15rem 0 0;
}

.game-hud__room,
.turn-pill,
.team-score,
.turn-dot {
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 800;
  padding: 0.25rem 0.6rem;
}

.game-hud__room,
.turn-pill {
  background: rgb(15 23 42 / 0.85);
  color: #e2e8f0;
}

.turn-pill.active {
  background: #facc15;
  color: #422006;
}

.team-score.red-team {
  background: #fee2e2;
  color: #991b1b;
}

.team-score.blue-team {
  background: #dbeafe;
  color: #1e3a8a;
}

.game-table-shell {
  display: grid;
  gap: 0.75rem;
}

.table-surface {
  background:
    radial-gradient(circle at top, rgb(45 212 191 / 0.16), transparent 38%),
    linear-gradient(180deg, #064e3b, #052e2b);
  border: 1px solid #0f766e;
  border-radius: 1.5rem;
  box-shadow: inset 0 0 2rem rgb(2 6 23 / 0.28);
  display: grid;
  gap: 0.75rem;
  padding: 0.85rem;
}

.pile-row {
  align-items: stretch;
  display: grid;
  grid-template-columns: 1fr 1fr;
}

.pile-card,
.event-banner,
.team-meld-zone,
.player-chip,
.hand-tray {
  background: rgb(15 23 42 / 0.86);
  border: 1px solid rgb(148 163 184 / 0.25);
  border-radius: 1rem;
  padding: 0.75rem;
}

.pile-card {
  display: grid;
  gap: 0.25rem;
  min-height: 4.75rem;
}

.pile-card strong {
  font-size: 1.15rem;
}

.event-banner {
  margin: 0;
}

.team-melds-grid {
  display: grid;
  gap: 0.75rem;
}

.team-meld-zone h2,
.hand-tray h2 {
  margin: 0 0 0.5rem;
}

.meld-list {
  display: grid;
  gap: 0.5rem;
}

.meld-card {
  align-items: center;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 0.85rem;
  display: grid;
  gap: 0.35rem;
  padding: 0.65rem;
}

.meld-card.complete {
  border-color: #facc15;
}

.player-strip {
  display: grid;
  gap: 0.5rem;
  grid-auto-columns: minmax(13rem, 1fr);
  grid-auto-flow: column;
  overflow-x: auto;
  padding-bottom: 0.2rem;
}

.player-chip {
  align-items: center;
  display: grid;
  gap: 0.5rem;
  grid-template-columns: auto 1fr;
  min-width: 13rem;
}

.player-chip.current {
  border-color: #facc15;
}

.player-chip__counts {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  grid-column: 1 / -1;
}

.turn-dot {
  background: #facc15;
  color: #422006;
}

.hand-tray {
  bottom: 0.5rem;
  box-shadow: 0 -1rem 2rem rgb(2 6 23 / 0.22);
  display: grid;
  gap: 0.75rem;
  position: sticky;
}

.hand-tray__header {
  justify-content: space-between;
}

.hand-action-bar {
  background: #020617;
  border: 1px solid #334155;
  border-radius: 999px;
  overflow-x: auto;
  padding: 0.45rem;
}

.hand-action-bar button,
.card-reorder-controls button {
  padding: 0.45rem 0.65rem;
}

.action-error {
  background: #fee2e2;
  border-radius: 0.75rem;
  color: #991b1b;
  margin: 0;
  padding: 0.6rem 0.75rem;
}

.hand-card-row {
  display: grid;
  gap: 0.45rem;
  grid-auto-columns: minmax(3.4rem, 4.4rem);
  grid-auto-flow: column;
  overflow-x: auto;
  padding: 0.25rem 0.1rem 0.6rem;
}

.hand-card-shell {
  display: grid;
  gap: 0.25rem;
  transition: transform 150ms ease;
}

.hand-card-shell.selected {
  transform: translateY(-0.45rem);
}

.hand-card-shell.selected .playing-card {
  border-color: #facc15;
  box-shadow: 0 0 0 3px rgb(250 204 21 / 0.35);
}

.playing-card.hint-possible-meld {
  box-shadow: inset 0 0 0 3px rgb(45 212 191 / 0.35);
}

.playing-card.hint-existing-meld {
  border-left: 0.35rem solid #38bdf8;
}

.playing-card.hint-wild-helper {
  background: linear-gradient(180deg, #f8fafc, #ede9fe);
}

.card-reorder-controls {
  display: grid;
  gap: 0.2rem;
  grid-template-columns: 1fr 1fr;
}

@media (min-width: 760px) {
  .team-melds-grid {
    grid-template-columns: 1fr 1fr;
  }

  .player-strip {
    grid-auto-flow: initial;
    grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
    overflow-x: visible;
  }

  .hand-card-row {
    grid-auto-columns: minmax(3.75rem, 4.8rem);
  }
}

@media (min-width: 980px) {
  .game-table-shell {
    grid-template-columns: minmax(0, 1fr) 21rem;
  }

  .table-surface {
    grid-column: 1;
  }

  .player-strip {
    align-self: start;
    grid-column: 2;
    grid-row: 1;
  }

  .hand-tray {
    grid-column: 1 / -1;
  }
}
```

- [ ] **Step 2: Run web build to validate CSS and component imports**

Run:

```powershell
npm run build -w @hengames/web
```

Expected: PASS.

- [ ] **Step 3: Commit**

```powershell
git add apps\web\src\styles.css
git commit -m "feat: style mobile game table" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 7: Final validation

**Files:**
- Validate: helper tests, web typecheck, web build, repository typecheck, repository tests, repository build

- [ ] **Step 1: Run all focused automated checks**

Run:

```powershell
npx vitest run apps\web\src\components\game-table\gameTableHelpers.test.ts
npm run typecheck -w @hengames/web
npm run build -w @hengames/web
```

Expected: PASS for helper tests, web typecheck, and web build.

- [ ] **Step 2: Run repository-level checks**

Run:

```powershell
npm run typecheck
npm run test
npm run build
```

Expected: PASS for all packages.

## Self-review

### Spec coverage

- Mobile-first game-table shell: Task 6 styles and Task 5 container.
- Sticky HUD with round, turn, own-turn prompt, scores, and room control: Task 3 `GameHud`, Task 5 wiring, Task 2 prompt helper.
- Shared table surface with piles, last event, and team books: Task 3 `TableSurface`, Task 5 wiring.
- Player hand/foot counts and current turn marker: Task 3 `PlayerStrip`, Task 5 wiring.
- Personal hand tray with compact cards: Task 4 `HandTray` and `PlayingCardButton`, Task 6 styles.
- Local drag ordering by card ID and reconciliation across snapshots: Task 2 helper, Task 4 component.
- Multi-card selection for creating melds and adding to existing melds: Task 2 helper, Task 4 action bar, Task 5 mutation wiring.
- Single-card discard action and fast discard path: Task 4 component, Task 5 mutation wiring.
- Subtle hints for potential melds, existing melds, and wild cards: Task 2 helper, Task 4 card props, Task 6 styles.
- Server remains authoritative: Task 5 keeps the existing `gameAction` mutation and displays mutation errors.
- Accessibility: Task 4 uses buttons and `aria-pressed`, adds move-left/move-right controls, Task 6 keeps text actions visible.

### Placeholder scan

This plan contains concrete file paths, code blocks, commands, expected outcomes, and commit commands for each task.

### Type consistency

The shared `HandAndFootTableView`, `MeldView`, `TeamId`, `CardHint`, and `SelectionAnalysis` types are introduced in Task 1 and reused by later helpers and components. The `gameAction` payloads in Task 5 match the existing server schema: `draw`, `meld`, and `discard`.
