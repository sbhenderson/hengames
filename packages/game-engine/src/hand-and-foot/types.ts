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
