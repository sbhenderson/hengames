import { describe, test, expect, beforeEach } from "vitest";
import { createRoomStore } from "./roomStore";

describe("roomStore", () => {
  let store: ReturnType<typeof createRoomStore>;

  beforeEach(() => {
    store = createRoomStore();
  });

  test("createRoom creates a discoverable Hand and Foot room", () => {
    const result = store.createRoom({ displayName: "Alice" });

    expect(result.room.code).toBeTruthy();
    expect(result.room.code.length).toBe(6);
    expect(result.room.gameId).toBe("hand-and-foot");
    expect(result.room.status).toBe("waiting");
    expect(result.room.hostParticipantId).toBe(result.participant.id);
    expect(result.participant.displayName).toBe("Alice");

    const rooms = store.listRooms();
    expect(rooms).toHaveLength(1);
    expect(rooms[0]!.code).toBe(result.room.code);
    expect(rooms[0]!.gameId).toBe("hand-and-foot");
    expect(rooms[0]!.status).toBe("waiting");
    expect(rooms[0]!.hostParticipantId).toBe(result.participant.id);
  });

  test("room code is 6 characters from valid alphabet", () => {
    const result = store.createRoom({ displayName: "Bob" });
    const validChars = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;
    expect(result.room.code).toMatch(validChars);
  });

  test("host is initially a spectator", () => {
    const result = store.createRoom({ displayName: "Alice" });
    expect(result.room.spectatorIds).toContain(result.participant.id);
    expect(result.room.seats.every(seat => seat.participantId !== result.participant.id)).toBe(true);
  });

  test("room has four seats with correct teams", () => {
    const result = store.createRoom({ displayName: "Alice" });
    
    expect(result.room.seats).toHaveLength(4);
    expect(result.room.seats.find(s => s.id === "north")?.teamId).toBe("red");
    expect(result.room.seats.find(s => s.id === "east")?.teamId).toBe("blue");
    expect(result.room.seats.find(s => s.id === "south")?.teamId).toBe("red");
    expect(result.room.seats.find(s => s.id === "west")?.teamId).toBe("blue");
  });

  test("joinRoom adds a new user as spectator", () => {
    const { room, participant: host } = store.createRoom({ displayName: "Alice" });

    const { participant: guest } = store.joinRoom({
      code: room.code,
      displayName: "Bob"
    });

    expect(guest.displayName).toBe("Bob");
    expect(guest.id).not.toBe(host.id);

    const snapshot = store.getSnapshot({ code: room.code });
    expect(snapshot.spectatorIds).toContain(guest.id);
    expect(snapshot.spectatorIds).toHaveLength(2);
  });

  test("joinRoom is case-insensitive", () => {
    const { room } = store.createRoom({ displayName: "Alice" });
    
    const { participant } = store.joinRoom({
      code: room.code.toLowerCase(),
      displayName: "Bob"
    });

    expect(participant).toBeTruthy();
  });

  test("chooseSeat allows participant to take an empty seat", () => {
    const { room, participant: host } = store.createRoom({ displayName: "Alice" });

    const snapshot = store.chooseSeat({
      code: room.code,
      token: host.token,
      seatId: "north"
    });

    expect(snapshot.seats.find(s => s.id === "north")?.participantId).toBe(host.id);
    expect(snapshot.seats.find(s => s.id === "north")?.ready).toBe(false);
    expect(snapshot.spectatorIds).not.toContain(host.id);
  });

  test("chooseSeat fails if seat is occupied", () => {
    const { room, participant: host } = store.createRoom({ displayName: "Alice" });
    const { participant: guest } = store.joinRoom({ code: room.code, displayName: "Bob" });

    store.chooseSeat({ code: room.code, token: host.token, seatId: "north" });

    expect(() =>
      store.chooseSeat({ code: room.code, token: guest.token, seatId: "north" })
    ).toThrow();
  });

  test("chooseSeat clears participant from prior seat", () => {
    const { room, participant: host } = store.createRoom({ displayName: "Alice" });

    store.chooseSeat({ code: room.code, token: host.token, seatId: "north" });
    const snapshot = store.chooseSeat({ code: room.code, token: host.token, seatId: "south" });

    expect(snapshot.seats.find(s => s.id === "north")?.participantId).toBeNull();
    expect(snapshot.seats.find(s => s.id === "south")?.participantId).toBe(host.id);
  });

  test("setReady marks seated player as ready", () => {
    const { room, participant: host } = store.createRoom({ displayName: "Alice" });

    store.chooseSeat({ code: room.code, token: host.token, seatId: "north" });
    const snapshot = store.setReady({ code: room.code, token: host.token, ready: true });

    expect(snapshot.seats.find(s => s.id === "north")?.ready).toBe(true);
  });

  test("startGame works when all four seats are occupied and ready", () => {
    const { room, participant: p1 } = store.createRoom({ displayName: "P1" });
    const { participant: p2 } = store.joinRoom({ code: room.code, displayName: "P2" });
    const { participant: p3 } = store.joinRoom({ code: room.code, displayName: "P3" });
    const { participant: p4 } = store.joinRoom({ code: room.code, displayName: "P4" });

    store.chooseSeat({ code: room.code, token: p1.token, seatId: "north" });
    store.chooseSeat({ code: room.code, token: p2.token, seatId: "east" });
    store.chooseSeat({ code: room.code, token: p3.token, seatId: "south" });
    store.chooseSeat({ code: room.code, token: p4.token, seatId: "west" });

    store.setReady({ code: room.code, token: p1.token, ready: true });
    store.setReady({ code: room.code, token: p2.token, ready: true });
    store.setReady({ code: room.code, token: p3.token, ready: true });
    store.setReady({ code: room.code, token: p4.token, ready: true });

    const result = store.startGame({ code: room.code, token: p1.token });

    expect(result.status).toBe("playing");
    expect(result.gameState).toBeTruthy();
    expect(result.gameState?.phase).toBe("playing");
    expect(result.gameState?.players).toBeDefined();
  });

  test("startGame fails if not all seats are occupied", () => {
    const { room, participant: host } = store.createRoom({ displayName: "Alice" });

    store.chooseSeat({ code: room.code, token: host.token, seatId: "north" });
    store.setReady({ code: room.code, token: host.token, ready: true });

    expect(() => store.startGame({ code: room.code, token: host.token })).toThrow();
  });

  test("startGame fails if not all players are ready", () => {
    const { room, participant: p1 } = store.createRoom({ displayName: "P1" });
    const { participant: p2 } = store.joinRoom({ code: room.code, displayName: "P2" });
    const { participant: p3 } = store.joinRoom({ code: room.code, displayName: "P3" });
    const { participant: p4 } = store.joinRoom({ code: room.code, displayName: "P4" });

    store.chooseSeat({ code: room.code, token: p1.token, seatId: "north" });
    store.chooseSeat({ code: room.code, token: p2.token, seatId: "east" });
    store.chooseSeat({ code: room.code, token: p3.token, seatId: "south" });
    store.chooseSeat({ code: room.code, token: p4.token, seatId: "west" });

    store.setReady({ code: room.code, token: p1.token, ready: true });
    // Only p1 is ready

    expect(() => store.startGame({ code: room.code, token: p1.token })).toThrow();
  });

  test("startGame fails if caller is not the host", () => {
    const { room, participant: p1 } = store.createRoom({ displayName: "P1" });
    const { participant: p2 } = store.joinRoom({ code: room.code, displayName: "P2" });
    const { participant: p3 } = store.joinRoom({ code: room.code, displayName: "P3" });
    const { participant: p4 } = store.joinRoom({ code: room.code, displayName: "P4" });

    store.chooseSeat({ code: room.code, token: p1.token, seatId: "north" });
    store.chooseSeat({ code: room.code, token: p2.token, seatId: "east" });
    store.chooseSeat({ code: room.code, token: p3.token, seatId: "south" });
    store.chooseSeat({ code: room.code, token: p4.token, seatId: "west" });

    store.setReady({ code: room.code, token: p1.token, ready: true });
    store.setReady({ code: room.code, token: p2.token, ready: true });
    store.setReady({ code: room.code, token: p3.token, ready: true });
    store.setReady({ code: room.code, token: p4.token, ready: true });

    expect(() => store.startGame({ code: room.code, token: p2.token })).toThrow();
  });
});
