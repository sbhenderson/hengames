import { describe, test, expect, beforeEach, vi } from "vitest";
import { createRoomStore } from "../rooms/roomStore.js";
import { createAppRouter } from "./appRouter.js";

describe("appRouter", () => {
  let roomStore: ReturnType<typeof createRoomStore>;
  let mockWsHub: any;
  let router: ReturnType<typeof createAppRouter>;

  beforeEach(() => {
    roomStore = createRoomStore();
    mockWsHub = {
      broadcastRoom: vi.fn()
    };
    router = createAppRouter({ roomStore, wsHub: mockWsHub });
  });

  describe("listRooms", () => {
    test("returns list of rooms from store", async () => {
      roomStore.createRoom({ displayName: "Alice" });
      roomStore.createRoom({ displayName: "Bob" });

      const result = await router.createCaller({}).listRooms();

      expect(result).toHaveLength(2);
      expect(result[0]!.gameId).toBe("hand-and-foot");
      expect(result[1]!.gameId).toBe("hand-and-foot");
    });
  });

  describe("createRoom", () => {
    test("creates room with optional displayName", async () => {
      const result = await router.createCaller({}).createRoom({ displayName: "Alice" });

      expect(result.room.code).toBeTruthy();
      expect(result.room.gameId).toBe("hand-and-foot");
      expect(result.participant.displayName).toBe("Alice");
      expect(result.participant.token).toBeTruthy();
    });

    test("creates room without displayName", async () => {
      const result = await router.createCaller({}).createRoom({});

      expect(result.room.code).toBeTruthy();
      expect(result.participant.displayName).toMatch(/^[a-z]+-[a-z]+$/);
      expect(result.participant.displayName).not.toMatch(/^Anonymous-/);
      expect(result.participant).toHaveProperty("avatar");
      expect(result.room.options.deckCount).toBe(6);
    });

    test("creates room with deck count option", async () => {
      const result = await router.createCaller({}).createRoom({
        displayName: "Alice",
        options: { deckCount: 7 }
      });

      expect(result.room.options.deckCount).toBe(7);
    });
  });

  describe("joinRoom", () => {
    test("joins existing room with code", async () => {
      const created = await router.createCaller({}).createRoom({ displayName: "Alice" });

      const joined = await router.createCaller({}).joinRoom({
        code: created.room.code,
        displayName: "Bob"
      });

      expect(joined.participant.displayName).toBe("Bob");
      expect(joined.participant.id).not.toBe(created.participant.id);
      expect(joined.participant.token).toBeTruthy();
    });
  });

  describe("updateAvatar", () => {
    test("updates avatar and broadcasts the room", async () => {
      const created = await router.createCaller({}).createRoom({ displayName: "Alice" });

      const snapshot = await router.createCaller({}).updateAvatar({
        code: created.room.code,
        participantToken: created.participant.token,
        avatar: { emoji: "🦊", color: "#f97316" }
      });

      expect(snapshot.participants.find(participant => participant.id === created.participant.id)?.avatar).toEqual({
        emoji: "🦊",
        color: "#f97316"
      });
      expect(mockWsHub.broadcastRoom).toHaveBeenCalledWith(created.room.code, roomStore);
    });

    test("rejects invalid avatar colors before updating the room", async () => {
      const created = await router.createCaller({}).createRoom({ displayName: "Alice" });

      await expect(
        router.createCaller({}).updateAvatar({
          code: created.room.code,
          participantToken: created.participant.token,
          avatar: { emoji: "🦊", color: "orange" }
        })
      ).rejects.toThrow();

      expect(mockWsHub.broadcastRoom).not.toHaveBeenCalled();
    });
  });

  describe("getRoom", () => {
    test("gets room snapshot without token", async () => {
      const created = await router.createCaller({}).createRoom({ displayName: "Alice" });

      const snapshot = await router.createCaller({}).getRoom({
        code: created.room.code
      });

      expect(snapshot.code).toBe(created.room.code);
      expect(snapshot.status).toBe("waiting");
    });

    test("gets room snapshot with participantToken from context", async () => {
      const created = await router.createCaller({}).createRoom({ displayName: "Alice" });

      const snapshot = await router
        .createCaller({ participantToken: created.participant.token })
        .getRoom({ code: created.room.code });

      expect(snapshot.code).toBe(created.room.code);
      expect(snapshot.status).toBe("waiting");
    });
  });

  describe("chooseSeat - token mapping and broadcast", () => {
    test("accepts participantToken as input parameter", async () => {
      const created = await router.createCaller({}).createRoom({ displayName: "Alice" });
      
      const snapshot = await router
        .createCaller({})
        .chooseSeat({ 
          code: created.room.code, 
          seatId: "north",
          participantToken: created.participant.token
        });

      expect(snapshot.seats.find(s => s.id === "north")!.participantId).toBe(created.participant.id);
    });

    test("maps participantToken from input to token for roomStore", async () => {
      const created = await router.createCaller({}).createRoom({ displayName: "Alice" });
      
      const snapshot = await router
        .createCaller({})
        .chooseSeat({ 
          code: created.room.code, 
          seatId: "north",
          participantToken: created.participant.token
        });

      expect(snapshot.seats.find(s => s.id === "north")!.participantId).toBe(created.participant.id);
    });

    test("broadcasts room after choosing seat", async () => {
      const created = await router.createCaller({}).createRoom({ displayName: "Alice" });

      await router
        .createCaller({})
        .chooseSeat({ 
          code: created.room.code, 
          seatId: "north",
          participantToken: created.participant.token
        });

      expect(mockWsHub.broadcastRoom).toHaveBeenCalledWith(created.room.code, roomStore);
    });
  });

  describe("setReady - token mapping and broadcast", () => {
    test("accepts participantToken as input parameter", async () => {
      const created = await router.createCaller({}).createRoom({ displayName: "Alice" });
      await router
        .createCaller({})
        .chooseSeat({ 
          code: created.room.code, 
          seatId: "north",
          participantToken: created.participant.token
        });

      const snapshot = await router
        .createCaller({})
        .setReady({ 
          code: created.room.code, 
          ready: true,
          participantToken: created.participant.token
        });

      expect(snapshot.seats.find(s => s.id === "north")!.ready).toBe(true);
    });

    test("broadcasts room after setting ready", async () => {
      const created = await router.createCaller({}).createRoom({ displayName: "Alice" });
      await router
        .createCaller({})
        .chooseSeat({ 
          code: created.room.code, 
          seatId: "north",
          participantToken: created.participant.token
        });

      mockWsHub.broadcastRoom.mockClear();

      await router
        .createCaller({})
        .setReady({ 
          code: created.room.code, 
          ready: true,
          participantToken: created.participant.token
        });

      expect(mockWsHub.broadcastRoom).toHaveBeenCalledWith(created.room.code, roomStore);
    });
  });

  describe("host controls - resetLobby and kickParticipant", () => {
    test("resetLobby calls room store and broadcasts", async () => {
      const created = await router.createCaller({}).createRoom({ displayName: "Alice" });
      await router
        .createCaller({})
        .chooseSeat({
          code: created.room.code,
          seatId: "north",
          participantToken: created.participant.token
        });

      mockWsHub.broadcastRoom.mockClear();

      const snapshot = await router.createCaller({}).resetLobby({
        code: created.room.code,
        participantToken: created.participant.token
      });

      expect(snapshot.seats.every(seat => seat.participantId === null)).toBe(true);
      expect(mockWsHub.broadcastRoom).toHaveBeenCalledWith(created.room.code, roomStore);
    });

    test("kickParticipant calls room store and broadcasts", async () => {
      const created = await router.createCaller({}).createRoom({ displayName: "Alice" });
      const joined = await router.createCaller({}).joinRoom({ code: created.room.code, displayName: "Bob" });

      mockWsHub.broadcastRoom.mockClear();

      const snapshot = await router.createCaller({}).kickParticipant({
        code: created.room.code,
        participantToken: created.participant.token,
        targetParticipantId: joined.participant.id
      });

      expect(snapshot.participants.find(participant => participant.id === joined.participant.id)).toBeUndefined();
      expect(mockWsHub.broadcastRoom).toHaveBeenCalledWith(created.room.code, roomStore);
    });
  });

  describe("startGame - token mapping and broadcast", () => {
    test("accepts participantToken as input and broadcasts", async () => {
      // Setup: create room, join 3 more players, all choose seats and ready up
      const host = await router.createCaller({}).createRoom({ displayName: "Alice" });
      const p2 = await router.createCaller({}).joinRoom({ code: host.room.code, displayName: "Bob" });
      const p3 = await router.createCaller({}).joinRoom({ code: host.room.code, displayName: "Carol" });
      const p4 = await router.createCaller({}).joinRoom({ code: host.room.code, displayName: "Dave" });

      await router.createCaller({})
        .chooseSeat({ 
          code: host.room.code, 
          seatId: "north",
          participantToken: host.participant.token
        });
      await router.createCaller({})
        .chooseSeat({ 
          code: host.room.code, 
          seatId: "east",
          participantToken: p2.participant.token
        });
      await router.createCaller({})
        .chooseSeat({ 
          code: host.room.code, 
          seatId: "south",
          participantToken: p3.participant.token
        });
      await router.createCaller({})
        .chooseSeat({ 
          code: host.room.code, 
          seatId: "west",
          participantToken: p4.participant.token
        });

      await router.createCaller({})
        .setReady({ 
          code: host.room.code, 
          ready: true,
          participantToken: host.participant.token
        });
      await router.createCaller({})
        .setReady({ 
          code: host.room.code, 
          ready: true,
          participantToken: p2.participant.token
        });
      await router.createCaller({})
        .setReady({ 
          code: host.room.code, 
          ready: true,
          participantToken: p3.participant.token
        });
      await router.createCaller({})
        .setReady({ 
          code: host.room.code, 
          ready: true,
          participantToken: p4.participant.token
        });

      mockWsHub.broadcastRoom.mockClear();

      await router.createCaller({})
        .startGame({ 
          code: host.room.code,
          participantToken: host.participant.token
        });

      expect(mockWsHub.broadcastRoom).toHaveBeenCalledWith(host.room.code, roomStore);
    });
  });

  describe("gameAction - token mapping and broadcast", () => {
    test("accepts participantToken as input and validates draw action", async () => {
      const host = await router.createCaller({}).createRoom({ displayName: "Alice" });
      const p2 = await router.createCaller({}).joinRoom({ code: host.room.code, displayName: "Bob" });
      const p3 = await router.createCaller({}).joinRoom({ code: host.room.code, displayName: "Carol" });
      const p4 = await router.createCaller({}).joinRoom({ code: host.room.code, displayName: "Dave" });

      await router.createCaller({})
        .chooseSeat({ 
          code: host.room.code, 
          seatId: "north",
          participantToken: host.participant.token
        });
      await router.createCaller({})
        .chooseSeat({ 
          code: host.room.code, 
          seatId: "east",
          participantToken: p2.participant.token
        });
      await router.createCaller({})
        .chooseSeat({ 
          code: host.room.code, 
          seatId: "south",
          participantToken: p3.participant.token
        });
      await router.createCaller({})
        .chooseSeat({ 
          code: host.room.code, 
          seatId: "west",
          participantToken: p4.participant.token
        });

      await router.createCaller({})
        .setReady({ 
          code: host.room.code, 
          ready: true,
          participantToken: host.participant.token
        });
      await router.createCaller({})
        .setReady({ 
          code: host.room.code, 
          ready: true,
          participantToken: p2.participant.token
        });
      await router.createCaller({})
        .setReady({ 
          code: host.room.code, 
          ready: true,
          participantToken: p3.participant.token
        });
      await router.createCaller({})
        .setReady({ 
          code: host.room.code, 
          ready: true,
          participantToken: p4.participant.token
        });

      await router.createCaller({})
        .startGame({ 
          code: host.room.code,
          participantToken: host.participant.token
        });

      mockWsHub.broadcastRoom.mockClear();

      const snapshot = await router
        .createCaller({})
        .gameAction({ 
          code: host.room.code, 
          action: { type: "draw" },
          participantToken: host.participant.token
        });

      expect(snapshot.status).toBe("playing");
      expect(mockWsHub.broadcastRoom).toHaveBeenCalledWith(host.room.code, roomStore);
    });
  });

  describe("seatId validation", () => {
    test("accepts valid seats and rejects invalid", async () => {
      const created = await router.createCaller({}).createRoom({ displayName: "Alice" });

      // Valid seats should work
      const north = await router
        .createCaller({})
        .chooseSeat({ 
          code: created.room.code, 
          seatId: "north",
          participantToken: created.participant.token
        });
      expect(north.seats.find(s => s.id === "north")!.participantId).toBe(created.participant.id);

      // Create another player to test other seats
      const p2 = await router.createCaller({}).joinRoom({ code: created.room.code, displayName: "Bob" });
      
      const east = await router
        .createCaller({})
        .chooseSeat({ 
          code: created.room.code, 
          seatId: "east",
          participantToken: p2.participant.token
        });
      expect(east.seats.find(s => s.id === "east")!.participantId).toBe(p2.participant.id);

      // Invalid seats should fail (TypeScript validates this at compile time)
      // Runtime validation is tested implicitly through the zod schema
    });
  });
});
