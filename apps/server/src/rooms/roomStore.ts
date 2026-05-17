import { randomUUID } from "node:crypto";
import {
  DEFAULT_AVATAR_CHOICES,
  type Participant,
  type ParticipantAvatar,
  type ParticipantId,
  type PublicRoomSnapshot,
  type RoomCode,
  type RoomOptions,
  type RoomStatus,
  type RoomSummary,
  type Seat,
  type SeatId
} from "@hengames/shared";
import {
  handAndFootDefinition,
  type HandAndFootAction,
  type HandAndFootPlayerView,
  type HandAndFootState
} from "@hengames/game-engine";

const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROOM_CODE_LENGTH = 6;
const ROOM_INACTIVITY_LIMIT_MS = 5 * 60 * 1000;
const DEFAULT_ROOM_OPTIONS: RoomOptions = { deckCount: handAndFootDefinition.defaultRules.deckCount };
const ADJECTIVES = ["brave", "clever", "cozy", "curious", "dapper", "lucky", "peeking", "snappy"];
const ANIMALS = ["badger", "fox", "otter", "penguin", "raven", "turtle", "walrus", "wombat"];

type RoomRecord = {
  code: RoomCode;
  gameId: "hand-and-foot";
  status: RoomStatus;
  hostParticipantId: ParticipantId;
  participants: Map<ParticipantId, Participant>;
  spectatorIds: Set<ParticipantId>;
  seats: Seat[];
  options: RoomOptions;
  rules: typeof handAndFootDefinition.defaultRules;
  gameState: HandAndFootState | null;
  createdAt: string;
  lastActivityAt: number;
};

export function createRoomStore() {
  const rooms = new Map<RoomCode, RoomRecord>();

  function createRoomCode(): RoomCode {
    let code: string;
    do {
      code = Array.from({ length: ROOM_CODE_LENGTH }, () =>
        ROOM_CODE_ALPHABET.charAt(Math.floor(Math.random() * ROOM_CODE_ALPHABET.length))
      ).join("");
    } while (rooms.has(code));
    return code;
  }

  function createParticipant(displayName?: string, avatar?: ParticipantAvatar): Participant {
    const id = randomUUID();
    const token = randomUUID();
    return {
      id,
      displayName: normalizeDisplayName(displayName) ?? generateDisplayName(id),
      avatar: avatar ? normalizeAvatar(avatar) : generateAvatar(id),
      token,
      connected: true
    };
  }

  function normalizeDisplayName(displayName?: string): string | undefined {
    const trimmed = displayName?.trim();
    return trimmed ? trimmed : undefined;
  }

  function hashText(value: string): number {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
      hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
    }
    return hash;
  }

  function generateDisplayName(id: string): string {
    const hash = hashText(id);
    return `${ADJECTIVES[hash % ADJECTIVES.length]}-${ANIMALS[Math.floor(hash / ADJECTIVES.length) % ANIMALS.length]}`;
  }

  function generateAvatar(id: string): ParticipantAvatar {
    const hash = hashText(id);
    return { ...DEFAULT_AVATAR_CHOICES[hash % DEFAULT_AVATAR_CHOICES.length]! };
  }

  function normalizeAvatar(avatar: ParticipantAvatar): ParticipantAvatar {
    const emoji = avatar.emoji.trim();
    const color = avatar.color.trim();
    if (!emoji || !/^#[0-9a-fA-F]{6}$/.test(color)) {
      throw new Error("Avatar requires an emoji and a hex color.");
    }
    return { emoji, color };
  }

  function createRoomOptions(input?: Partial<RoomOptions>): RoomOptions {
    const deckCount = input?.deckCount ?? DEFAULT_ROOM_OPTIONS.deckCount;
    if (!Number.isInteger(deckCount) || deckCount < 2 || deckCount > 8) {
      throw new Error("Deck count must be an integer between 2 and 8.");
    }
    return { deckCount };
  }

  function createRules(options: RoomOptions): typeof handAndFootDefinition.defaultRules {
    return {
      ...handAndFootDefinition.defaultRules,
      deckCount: options.deckCount
    };
  }

  function findRoom(code: RoomCode): RoomRecord {
    const normalizedCode = code.toUpperCase();
    const room = rooms.get(normalizedCode);
    if (!room) {
      throw new Error(`Room ${code} not found`);
    }
    return room;
  }

  function authenticateRoomParticipant(room: RoomRecord, token: string): Participant {
    for (const participant of room.participants.values()) {
      if (participant.token === token) {
        return participant;
      }
    }
    throw new Error("Invalid or expired token");
  }

  function createSnapshot(room: RoomRecord, currentParticipantId: ParticipantId | null): PublicRoomSnapshot {
    const publicParticipants = Array.from(room.participants.values()).map(p => ({
      id: p.id,
      displayName: p.displayName,
      avatar: { ...p.avatar },
      connected: p.connected
    }));

    let currentView: HandAndFootPlayerView | null = null;
    if (room.gameState && currentParticipantId) {
      currentView = handAndFootDefinition.getPlayerView({
        state: room.gameState,
        playerId: currentParticipantId,
        rules: room.rules
      });
      currentView.lastEvent = displayParticipantNames(currentView.lastEvent, room.participants);
    }

    return {
      code: room.code,
      gameId: room.gameId,
      status: room.status,
      phase: room.gameState?.phase ?? "lobby",
      hostParticipantId: room.hostParticipantId,
      options: { ...room.options },
      currentParticipantId,
      participants: publicParticipants,
      seats: room.seats.map(s => ({ ...s })),
      spectatorIds: Array.from(room.spectatorIds),
      currentView
    };
  }

  function touchRoom(room: RoomRecord, now = Date.now()) {
    room.lastActivityAt = now;
  }

  function createRoom(input: { displayName?: string; avatar?: ParticipantAvatar; options?: Partial<RoomOptions> }): {
    room: PublicRoomSnapshot;
    participant: Participant;
  } {
    const participant = createParticipant(input.displayName, input.avatar);
    const code = createRoomCode();
    const options = createRoomOptions(input.options);
    const rules = createRules(options);

    const seats: Seat[] = [
      { id: "north", teamId: "red", participantId: null, ready: false },
      { id: "east", teamId: "blue", participantId: null, ready: false },
      { id: "south", teamId: "red", participantId: null, ready: false },
      { id: "west", teamId: "blue", participantId: null, ready: false }
    ];

    const now = Date.now();
    const room: RoomRecord = {
      code,
      gameId: "hand-and-foot",
      status: "waiting",
      hostParticipantId: participant.id,
      participants: new Map([[participant.id, participant]]),
      spectatorIds: new Set([participant.id]),
      seats,
      options,
      rules,
      gameState: null,
      createdAt: new Date(now).toISOString(),
      lastActivityAt: now
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

  function joinRoom(input: { code: RoomCode; displayName?: string; avatar?: ParticipantAvatar }): {
    participant: Participant;
  } {
    const room = findRoom(input.code);
    const participant = createParticipant(input.displayName, input.avatar);

    room.participants.set(participant.id, participant);
    room.spectatorIds.add(participant.id);
    touchRoom(room);

    return { participant };
  }

  function updateAvatar(input: {
    code: RoomCode;
    token: string;
    avatar: ParticipantAvatar;
  }): PublicRoomSnapshot {
    const room = findRoom(input.code);
    const participant = authenticateRoomParticipant(room, input.token);
    participant.avatar = normalizeAvatar(input.avatar);
    touchRoom(room);
    return createSnapshot(room, participant.id);
  }

  function chooseSeat(input: {
    code: RoomCode;
    token: string;
    seatId: SeatId;
  }): PublicRoomSnapshot {
    const room = findRoom(input.code);
    const participant = authenticateRoomParticipant(room, input.token);

    if (room.status !== "waiting") {
      throw new Error("Cannot choose seat: room is not in waiting status");
    }

    const seat = room.seats.find(s => s.id === input.seatId);
    if (!seat) {
      throw new Error(`Seat ${input.seatId} does not exist`);
    }

    // If participant is already in the requested seat, no-op
    if (seat.participantId === participant.id) {
      touchRoom(room);
      return createSnapshot(room, participant.id);
    }

    if (seat.participantId !== null && seat.participantId !== participant.id) {
      throw new Error(`Seat ${input.seatId} is already occupied`);
    }

    // Clear participant from any prior seat
    for (const s of room.seats) {
      if (s.participantId === participant.id) {
        s.participantId = null;
        s.ready = false;
      }
    }

    // Assign participant to the new seat
    seat.participantId = participant.id;
    seat.ready = false;

    // Remove from spectators
    room.spectatorIds.delete(participant.id);
    touchRoom(room);

    return createSnapshot(room, participant.id);
  }

  function setReady(input: {
    code: RoomCode;
    token: string;
    ready: boolean;
  }): PublicRoomSnapshot {
    const room = findRoom(input.code);
    const participant = authenticateRoomParticipant(room, input.token);

    if (room.status !== "waiting") {
      throw new Error("Cannot set ready: room is not in waiting status");
    }

    const seat = room.seats.find(s => s.participantId === participant.id);
    if (!seat) {
      throw new Error("Only seated players can set ready status");
    }

    seat.ready = input.ready;
    touchRoom(room);

    return createSnapshot(room, participant.id);
  }

  function requireHost(room: RoomRecord, participantId: string) {
    if (room.hostParticipantId !== participantId) {
      throw new Error("Only the host can do that.");
    }
  }

  function resetLobby(input: {
    code: RoomCode;
    participantToken: string;
  }): PublicRoomSnapshot {
    const room = findRoom(input.code);
    const participant = authenticateRoomParticipant(room, input.participantToken);

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
    touchRoom(room);

    return createSnapshot(room, participant.id);
  }

  function kickParticipant(input: {
    code: RoomCode;
    participantToken: string;
    targetParticipantId: string;
  }): PublicRoomSnapshot {
    const room = findRoom(input.code);
    const participant = authenticateRoomParticipant(room, input.participantToken);

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
    touchRoom(room);

    return createSnapshot(room, participant.id);
  }

  function startGame(input: {
    code: RoomCode;
    token: string;
  }): PublicRoomSnapshot {
    const room = findRoom(input.code);
    const participant = authenticateRoomParticipant(room, input.token);

    if (room.status !== "waiting") {
      throw new Error("Cannot start game: room is not in waiting status");
    }

    requireHost(room, participant.id);

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
      rules: room.rules
    });

    room.gameState = gameState;
    room.status = "playing";
    touchRoom(room);

    return createSnapshot(room, participant.id);
  }

  function applyGameAction(input: {
    code: RoomCode;
    token: string;
    action: HandAndFootAction;
  }): PublicRoomSnapshot {
    const room = findRoom(input.code);
    const participant = authenticateRoomParticipant(room, input.token);

    if (!room.gameState) {
      throw new Error("Game has not started");
    }

    const seat = room.seats.find(s => s.participantId === participant.id);
    if (!seat) {
      throw new Error("Only seated players can perform game actions");
    }

    const nextState = handAndFootDefinition.applyAction({
      state: room.gameState,
      action: input.action,
      playerId: participant.id,
      rules: room.rules
    });

    room.gameState = nextState;
    touchRoom(room);

    return createSnapshot(room, participant.id);
  }

  function getSnapshot(input: {
    code: RoomCode;
    token?: string;
  }): PublicRoomSnapshot {
    const room = findRoom(input.code);
    if (input.token) {
      const participant = authenticateRoomParticipant(room, input.token);
      return createSnapshot(room, participant.id);
    } else {
      return createSnapshot(room, null);
    }
  }

  function closeInactiveRooms(input: {
    inactiveMs?: number;
    now?: number;
  } = {}): RoomCode[] {
    const inactiveMs = input.inactiveMs ?? ROOM_INACTIVITY_LIMIT_MS;
    const now = input.now ?? Date.now();
    const closedCodes: RoomCode[] = [];

    for (const [code, room] of rooms.entries()) {
      if (now - room.lastActivityAt >= inactiveMs) {
        rooms.delete(code);
        closedCodes.push(code);
      }
    }

    return closedCodes;
  }

  function displayParticipantNames(event: string, participants: Map<ParticipantId, Participant>): string {
    const displayNames = new Map<ParticipantId, string>();
    const participantIdPatterns: string[] = [];

    for (const participant of participants.values()) {
      displayNames.set(participant.id, participant.displayName);
      participantIdPatterns.push(escapeRegExp(participant.id));
    }

    if (participantIdPatterns.length === 0) {
      return event;
    }

    return event.replace(
      new RegExp(`(^|[^\\w-])(${participantIdPatterns.join("|")})(?=$|[^\\w-])`, "g"),
      (_match, prefix: string, participantId: string) => `${prefix}${displayNames.get(participantId)}`
    );
  }

  function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  return {
    createRoom,
    listRooms,
    joinRoom,
    updateAvatar,
    chooseSeat,
    setReady,
    resetLobby,
    kickParticipant,
    startGame,
    applyGameAction,
    getSnapshot,
    closeInactiveRooms,
    // Test helper
    _getInternalGameState(code: RoomCode) {
      const room = findRoom(code);
      return room.gameState;
    }
  };
}
