import type { GameId, GamePhase } from "./game.js";

export type ParticipantId = string;
export type RoomCode = string;
export type SeatId = "north" | "east" | "south" | "west";
export type TeamId = "red" | "blue";

export type ParticipantAvatar = {
  emoji: string;
  color: string;
};

export const DEFAULT_AVATAR_CHOICES = [
  { emoji: "🦊", color: "#f97316" },
  { emoji: "🐧", color: "#38bdf8" },
  { emoji: "🦉", color: "#a78bfa" },
  { emoji: "🐢", color: "#22c55e" },
  { emoji: "🦝", color: "#64748b" },
  { emoji: "🦡", color: "#a16207" },
  { emoji: "🐙", color: "#c084fc" },
  { emoji: "🦆", color: "#facc15" },
  { emoji: "🐸", color: "#4ade80" },
  { emoji: "🦜", color: "#fb7185" },
  { emoji: "🐺", color: "#94a3b8" },
  { emoji: "🦁", color: "#fb923c" },
  { emoji: "🐼", color: "#e2e8f0" },
  { emoji: "🐳", color: "#06b6d4" },
  { emoji: "🦄", color: "#e879f9" },
  { emoji: "🐲", color: "#14b8a6" }
] as const satisfies readonly ParticipantAvatar[];

export type Participant = {
  id: ParticipantId;
  displayName: string;
  avatar: ParticipantAvatar;
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

export type RoomOptions = {
  deckCount: number;
};

export type PublicRoomSnapshot<TPlayerView = unknown> = {
  code: RoomCode;
  gameId: GameId;
  status: RoomStatus;
  phase: GamePhase;
  hostParticipantId: ParticipantId;
  options: RoomOptions;
  currentParticipantId: ParticipantId | null;
  participants: Array<Omit<Participant, "token">>;
  seats: Seat[];
  spectatorIds: ParticipantId[];
  currentView: TPlayerView | null;
};
