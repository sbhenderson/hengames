import type { Card, GamePhase } from "@hengames/shared";

export type PyramidsRules = {
  /** Number of rows in the pyramid. Row 0 is the apex. */
  rowCount: number;
  /** Points for clearing a card, indexed from the apex (row 0) down to the base. */
  rowPoints: number[];
  /** Extra points added for each play beyond the first in a streak. */
  streakBonusStep: number;
  /** Bonus awarded for emptying the pyramid. */
  clearBonus: number;
};

export type PyramidSlot = {
  row: number;
  column: number;
  card: Card;
  removed: boolean;
};

export type PyramidsState = {
  phase: Extract<GamePhase, "playing" | "game-over">;
  playerId: string;
  rules: PyramidsRules;
  slots: PyramidSlot[];
  drawPile: Card[];
  targetCard: Card;
  /** Cards played since the last draw. */
  consecutivePlays: number;
  bestStreak: number;
  gamePoints: number;
  cardsCleared: number;
  pyramidCleared: boolean;
  collected: boolean;
  lastEvent: string;
  lastEventSeq: number;
};

export type PyramidsAction =
  | { type: "play"; cardId: string }
  | { type: "draw" }
  | { type: "collect" };

export type PyramidSlotView =
  | { row: number; column: number; state: "removed" }
  | { row: number; column: number; state: "face-down" }
  | { row: number; column: number; state: "face-up"; card: Card; playable: boolean; points: number };

export type PyramidsPlayerView = {
  phase: PyramidsState["phase"];
  rows: PyramidSlotView[][];
  targetCard: Card;
  drawCount: number;
  consecutivePlays: number;
  bestStreak: number;
  gamePoints: number;
  cardsRemaining: number;
  cardsCleared: number;
  pyramidCleared: boolean;
  collected: boolean;
  /** Bonus the next successful play would earn on top of its row points. */
  nextStreakBonus: number;
  canDraw: boolean;
  canCollect: boolean;
  playableCardIds: string[];
  lastEvent: string;
  lastEventSeq: number;
};
