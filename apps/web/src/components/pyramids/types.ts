import type { Card } from "@hengames/shared";

export type PyramidSlotView =
  | { row: number; column: number; state: "removed" }
  | { row: number; column: number; state: "face-down" }
  | { row: number; column: number; state: "face-up"; card: Card; playable: boolean; points: number };

export type PyramidsTableView = {
  phase: "playing" | "game-over";
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
  nextStreakBonus: number;
  canDraw: boolean;
  canCollect: boolean;
  playableCardIds: string[];
  lastEvent: string;
  lastEventSeq: number;
};

export type PyramidsSession = {
  sessionId: string;
  status: "playing" | "game-over" | "collected";
  score: number;
  highScore: number;
  startedAt: string;
  view: PyramidsTableView;
};
