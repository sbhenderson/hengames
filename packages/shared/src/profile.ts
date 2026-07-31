import type { GameId } from "./game.js";
import type { ParticipantAvatar } from "./rooms.js";

export type PlayerId = string;

export type GameStats = {
  gamesPlayed: number;
  /** Running total of every point scored in this game. Doubles as the high-score table value. */
  totalScore: number;
  bestScore: number;
  lastScore: number;
  /** Game specific counter, e.g. pyramids cleared. */
  perfectGames: number;
};

export function createEmptyGameStats(): GameStats {
  return { gamesPlayed: 0, totalScore: 0, bestScore: 0, lastScore: 0, perfectGames: 0 };
}

export type PublicPlayerProfile = {
  id: PlayerId;
  displayName: string;
  avatar: ParticipantAvatar;
  createdAt: string;
  stats: Partial<Record<GameId, GameStats>>;
};

export type PlayerProfile = PublicPlayerProfile & {
  token: string;
};

export type HighScoreEntry = {
  playerId: PlayerId;
  displayName: string;
  avatar: ParticipantAvatar;
  score: number;
  gamesPlayed: number;
};
