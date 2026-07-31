import type { GameId } from "./game.js";
import type { GameStats } from "./profile.js";

export type SoloSessionId = string;

export type SoloSessionStatus = "playing" | "game-over" | "collected";

export type SoloSessionSnapshot<TPlayerView = unknown> = {
  sessionId: SoloSessionId;
  gameId: GameId;
  status: SoloSessionStatus;
  /** Points banked so far in this session. */
  score: number;
  /** Player's running total for this game, including the collected session score. */
  highScore: number;
  startedAt: string;
  view: TPlayerView;
};

export type SoloCollectResult = {
  session: SoloSessionSnapshot;
  awarded: number;
  stats: GameStats;
};
