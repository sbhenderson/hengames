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
