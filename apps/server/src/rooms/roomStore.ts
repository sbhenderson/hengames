import { randomUUID } from "node:crypto";
import type {
  Participant,
  ParticipantId,
  PublicRoomSnapshot,
  RoomCode,
  RoomStatus,
  RoomSummary,
  Seat,
  SeatId
} from "@hengames/shared";
import { handAndFootDefinition, type HandAndFootAction, type HandAndFootState } from "@hengames/game-engine";

const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROOM_CODE_LENGTH = 6;

type RoomRecord = {
  code: RoomCode;
  gameId: "hand-and-foot";
  status: RoomStatus;
  hostParticipantId: ParticipantId;
  participants: Map<ParticipantId, Participant>;
  spectatorIds: Set<ParticipantId>;
  seats: Seat[];
  gameState: HandAndFootState | null;
  createdAt: string;
};

export function createRoomStore() {
  const rooms = new Map<RoomCode, RoomRecord>();
  const participantTokens = new Map<string, ParticipantId>();

  function createRoomCode(): RoomCode {
    let code: string;
    do {
      code = Array.from({ length: ROOM_CODE_LENGTH }, () =>
        ROOM_CODE_ALPHABET.charAt(Math.floor(Math.random() * ROOM_CODE_ALPHABET.length))
      ).join("");
    } while (rooms.has(code));
    return code;
  }

  function createParticipant(displayName?: string): Participant {
    const id = randomUUID();
    const token = randomUUID();
    participantTokens.set(token, id);
    return {
      id,
      displayName: displayName || `Anonymous-${id.slice(0, 6)}`,
      token,
      connected: true
    };
  }

  function authenticateToken(token: string): ParticipantId {
    const participantId = participantTokens.get(token);
    if (!participantId) {
      throw new Error("Invalid or expired token");
    }
    return participantId;
  }

  function findRoom(code: RoomCode): RoomRecord {
    const normalizedCode = code.toUpperCase();
    const room = rooms.get(normalizedCode);
    if (!room) {
      throw new Error(`Room ${code} not found`);
    }
    return room;
  }

  function createSnapshot(room: RoomRecord, currentParticipantId: ParticipantId | null): PublicRoomSnapshot {
    const publicParticipants = Array.from(room.participants.values()).map(p => ({
      id: p.id,
      displayName: p.displayName,
      connected: p.connected
    }));

    let currentView = null;
    if (room.gameState && currentParticipantId) {
      currentView = handAndFootDefinition.getPlayerView({
        state: room.gameState,
        playerId: currentParticipantId,
        rules: handAndFootDefinition.defaultRules
      });
    }

    return {
      code: room.code,
      gameId: room.gameId,
      status: room.status,
      phase: room.gameState?.phase ?? "lobby",
      hostParticipantId: room.hostParticipantId,
      currentParticipantId,
      participants: publicParticipants,
      seats: room.seats.map(s => ({ ...s })),
      spectatorIds: Array.from(room.spectatorIds),
      currentView
    };
  }

  function createRoom(input: { displayName?: string }): {
    room: PublicRoomSnapshot;
    participant: Participant;
  } {
    const participant = createParticipant(input.displayName);
    const code = createRoomCode();

    const seats: Seat[] = [
      { id: "north", teamId: "red", participantId: null, ready: false },
      { id: "east", teamId: "blue", participantId: null, ready: false },
      { id: "south", teamId: "red", participantId: null, ready: false },
      { id: "west", teamId: "blue", participantId: null, ready: false }
    ];

    const room: RoomRecord = {
      code,
      gameId: "hand-and-foot",
      status: "waiting",
      hostParticipantId: participant.id,
      participants: new Map([[participant.id, participant]]),
      spectatorIds: new Set([participant.id]),
      seats,
      gameState: null,
      createdAt: new Date().toISOString()
    };

    rooms.set(code, room);

    return {
      room: createSnapshot(room, participant.id),
      participant
    };
  }

  function listRooms(): RoomSummary[] {
    return Array.from(rooms.values()).map(room => ({
      code: room.code,
      gameId: room.gameId,
      status: room.status,
      hostParticipantId: room.hostParticipantId,
      playerCount: room.seats.filter(s => s.participantId !== null).length,
      spectatorCount: room.spectatorIds.size,
      createdAt: room.createdAt
    }));
  }

  function joinRoom(input: { code: RoomCode; displayName?: string }): {
    participant: Participant;
  } {
    const room = findRoom(input.code);
    const participant = createParticipant(input.displayName);

    room.participants.set(participant.id, participant);
    room.spectatorIds.add(participant.id);

    return { participant };
  }

  function chooseSeat(input: {
    code: RoomCode;
    token: string;
    seatId: SeatId;
  }): PublicRoomSnapshot {
    const participantId = authenticateToken(input.token);
    const room = findRoom(input.code);

    if (room.status !== "waiting") {
      throw new Error("Cannot choose seat: room is not in waiting status");
    }

    const seat = room.seats.find(s => s.id === input.seatId);
    if (!seat) {
      throw new Error(`Seat ${input.seatId} does not exist`);
    }

    if (seat.participantId !== null && seat.participantId !== participantId) {
      throw new Error(`Seat ${input.seatId} is already occupied`);
    }

    // Clear participant from any prior seat
    for (const s of room.seats) {
      if (s.participantId === participantId) {
        s.participantId = null;
        s.ready = false;
      }
    }

    // Assign participant to the new seat
    seat.participantId = participantId;
    seat.ready = false;

    // Remove from spectators
    room.spectatorIds.delete(participantId);

    return createSnapshot(room, participantId);
  }

  function setReady(input: {
    code: RoomCode;
    token: string;
    ready: boolean;
  }): PublicRoomSnapshot {
    const participantId = authenticateToken(input.token);
    const room = findRoom(input.code);

    const seat = room.seats.find(s => s.participantId === participantId);
    if (!seat) {
      throw new Error("Only seated players can set ready status");
    }

    seat.ready = input.ready;

    return createSnapshot(room, participantId);
  }

  function startGame(input: {
    code: RoomCode;
    token: string;
  }): RoomRecord {
    const participantId = authenticateToken(input.token);
    const room = findRoom(input.code);

    if (participantId !== room.hostParticipantId) {
      throw new Error("Only the host can start the game");
    }

    // Check all seats are occupied
    const allSeatsOccupied = room.seats.every(s => s.participantId !== null);
    if (!allSeatsOccupied) {
      throw new Error("All seats must be occupied to start the game");
    }

    // Check all players are ready
    const allPlayersReady = room.seats.every(s => s.ready);
    if (!allPlayersReady) {
      throw new Error("All players must be ready to start the game");
    }

    // Create game state with player IDs from seats
    const playerIds = room.seats.map(s => s.participantId as string);

    const gameState = handAndFootDefinition.createInitialState({
      seed: randomUUID(),
      playerIds,
      rules: handAndFootDefinition.defaultRules
    });

    room.gameState = gameState;
    room.status = "playing";

    return room;
  }

  function applyGameAction(input: {
    code: RoomCode;
    token: string;
    action: HandAndFootAction;
  }): PublicRoomSnapshot {
    const participantId = authenticateToken(input.token);
    const room = findRoom(input.code);

    if (!room.gameState) {
      throw new Error("Game has not started");
    }

    const nextState = handAndFootDefinition.applyAction({
      state: room.gameState,
      action: input.action,
      playerId: participantId,
      rules: handAndFootDefinition.defaultRules
    });

    room.gameState = nextState;

    return createSnapshot(room, participantId);
  }

  function getSnapshot(input: {
    code: RoomCode;
    token?: string;
  }): PublicRoomSnapshot {
    const room = findRoom(input.code);
    const participantId = input.token ? authenticateToken(input.token) : null;
    return createSnapshot(room, participantId);
  }

  return {
    createRoom,
    listRooms,
    joinRoom,
    chooseSeat,
    setReady,
    startGame,
    applyGameAction,
    getSnapshot
  };
}
