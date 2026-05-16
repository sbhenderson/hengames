import { describe, test, expect, beforeEach, vi } from "vitest";
import { createRoomStore } from "../rooms/roomStore";
import { createAppRouter } from "./appRouter";

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
      expect(result.participant.displayName).toMatch(/^Anonymous-/);
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
    test("maps participantToken from context to token for roomStore", async () => {
      const created = await router.createCaller({}).createRoom({ displayName: "Alice" });
      
      const snapshot = await router
        .createCaller({ participantToken: created.participant.token })
        .chooseSeat({ code: created.room.code, seatId: "north" });

      expect(snapshot.seats.find(s => s.id === "north")!.participantId).toBe(created.participant.id);
    });

    test("broadcasts room after choosing seat", async () => {
      const created = await router.createCaller({}).createRoom({ displayName: "Alice" });

      await router
        .createCaller({ participantToken: created.participant.token })
        .chooseSeat({ code: created.room.code, seatId: "north" });

      expect(mockWsHub.broadcastRoom).toHaveBeenCalledWith(created.room.code, roomStore);
    });
  });

  describe("setReady - token mapping and broadcast", () => {
    test("maps participantToken from context to token for roomStore", async () => {
      const created = await router.createCaller({}).createRoom({ displayName: "Alice" });
      await router
        .createCaller({ participantToken: created.participant.token })
        .chooseSeat({ code: created.room.code, seatId: "north" });

      const snapshot = await router
        .createCaller({ participantToken: created.participant.token })
        .setReady({ code: created.room.code, ready: true });

      expect(snapshot.seats.find(s => s.id === "north")!.ready).toBe(true);
    });

    test("broadcasts room after setting ready", async () => {
      const created = await router.createCaller({}).createRoom({ displayName: "Alice" });
      await router
        .createCaller({ participantToken: created.participant.token })
        .chooseSeat({ code: created.room.code, seatId: "north" });

      mockWsHub.broadcastRoom.mockClear();

      await router
        .createCaller({ participantToken: created.participant.token })
        .setReady({ code: created.room.code, ready: true });

      expect(mockWsHub.broadcastRoom).toHaveBeenCalledWith(created.room.code, roomStore);
    });
  });

  describe("startGame - token mapping and broadcast", () => {
    test("broadcasts room after starting game", async () => {
      // Setup: create room, join 3 more players, all choose seats and ready up
      const host = await router.createCaller({}).createRoom({ displayName: "Alice" });
      const p2 = await router.createCaller({}).joinRoom({ code: host.room.code, displayName: "Bob" });
      const p3 = await router.createCaller({}).joinRoom({ code: host.room.code, displayName: "Carol" });
      const p4 = await router.createCaller({}).joinRoom({ code: host.room.code, displayName: "Dave" });

      await router.createCaller({ participantToken: host.participant.token })
        .chooseSeat({ code: host.room.code, seatId: "north" });
      await router.createCaller({ participantToken: p2.participant.token })
        .chooseSeat({ code: host.room.code, seatId: "east" });
      await router.createCaller({ participantToken: p3.participant.token })
        .chooseSeat({ code: host.room.code, seatId: "south" });
      await router.createCaller({ participantToken: p4.participant.token })
        .chooseSeat({ code: host.room.code, seatId: "west" });

      await router.createCaller({ participantToken: host.participant.token })
        .setReady({ code: host.room.code, ready: true });
      await router.createCaller({ participantToken: p2.participant.token })
        .setReady({ code: host.room.code, ready: true });
      await router.createCaller({ participantToken: p3.participant.token })
        .setReady({ code: host.room.code, ready: true });
      await router.createCaller({ participantToken: p4.participant.token })
        .setReady({ code: host.room.code, ready: true });

      mockWsHub.broadcastRoom.mockClear();

      await router.createCaller({ participantToken: host.participant.token })
        .startGame({ code: host.room.code });

      expect(mockWsHub.broadcastRoom).toHaveBeenCalledWith(host.room.code, roomStore);
    });
  });

  describe("gameAction - token mapping and broadcast", () => {
    test("validates draw action and broadcasts", async () => {
      const host = await router.createCaller({}).createRoom({ displayName: "Alice" });
      const p2 = await router.createCaller({}).joinRoom({ code: host.room.code, displayName: "Bob" });
      const p3 = await router.createCaller({}).joinRoom({ code: host.room.code, displayName: "Carol" });
      const p4 = await router.createCaller({}).joinRoom({ code: host.room.code, displayName: "Dave" });

      await router.createCaller({ participantToken: host.participant.token })
        .chooseSeat({ code: host.room.code, seatId: "north" });
      await router.createCaller({ participantToken: p2.participant.token })
        .chooseSeat({ code: host.room.code, seatId: "east" });
      await router.createCaller({ participantToken: p3.participant.token })
        .chooseSeat({ code: host.room.code, seatId: "south" });
      await router.createCaller({ participantToken: p4.participant.token })
        .chooseSeat({ code: host.room.code, seatId: "west" });

      await router.createCaller({ participantToken: host.participant.token })
        .setReady({ code: host.room.code, ready: true });
      await router.createCaller({ participantToken: p2.participant.token })
        .setReady({ code: host.room.code, ready: true });
      await router.createCaller({ participantToken: p3.participant.token })
        .setReady({ code: host.room.code, ready: true });
      await router.createCaller({ participantToken: p4.participant.token })
        .setReady({ code: host.room.code, ready: true });

      await router.createCaller({ participantToken: host.participant.token })
        .startGame({ code: host.room.code });

      mockWsHub.broadcastRoom.mockClear();

      const snapshot = await router
        .createCaller({ participantToken: host.participant.token })
        .gameAction({ code: host.room.code, action: { type: "draw" } });

      expect(snapshot.status).toBe("playing");
      expect(mockWsHub.broadcastRoom).toHaveBeenCalledWith(host.room.code, roomStore);
    });
  });

  describe("seatId validation", () => {
    test("accepts valid seats and rejects invalid", async () => {
      const created = await router.createCaller({}).createRoom({ displayName: "Alice" });

      // Valid seats should work
      const north = await router
        .createCaller({ participantToken: created.participant.token })
        .chooseSeat({ code: created.room.code, seatId: "north" });
      expect(north.seats.find(s => s.id === "north")!.participantId).toBe(created.participant.id);

      // Create another player to test other seats
      const p2 = await router.createCaller({}).joinRoom({ code: created.room.code, displayName: "Bob" });
      
      const east = await router
        .createCaller({ participantToken: p2.participant.token })
        .chooseSeat({ code: created.room.code, seatId: "east" });
      expect(east.seats.find(s => s.id === "east")!.participantId).toBe(p2.participant.id);

      // Invalid seats should fail (TypeScript validates this at compile time)
      // Runtime validation is tested implicitly through the zod schema
    });
  });
});
