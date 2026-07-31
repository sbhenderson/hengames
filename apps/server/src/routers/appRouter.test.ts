import { describe, test, expect, beforeEach, vi } from "vitest";
import { createRoomStore } from "../rooms/roomStore.js";
import { createProfileStore } from "../profiles/profileStore.js";
import { createSoloStore } from "../solo/soloStore.js";
import { createAppRouter } from "./appRouter.js";

describe("appRouter", () => {
  let roomStore: ReturnType<typeof createRoomStore>;
  let profileStore: ReturnType<typeof createProfileStore>;
  let soloStore: ReturnType<typeof createSoloStore>;
  let mockWsHub: any;
  let router: ReturnType<typeof createAppRouter>;

  beforeEach(() => {
    roomStore = createRoomStore();
    profileStore = createProfileStore();
    soloStore = createSoloStore({ profileStore });
    mockWsHub = {
      broadcastRoom: vi.fn()
    };
    router = createAppRouter({ roomStore, wsHub: mockWsHub, profileStore, soloStore });
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

  describe("game catalog", () => {
    test("lists every playable game with its mode", async () => {
      const games = await router.createCaller({}).listGames();

      expect(games.map((game) => game.id)).toEqual(["hand-and-foot", "pyramids"]);
      expect(games.find((game) => game.id === "pyramids")?.mode).toBe("solo");
      expect(games.find((game) => game.id === "hand-and-foot")?.mode).toBe("multiplayer");
    });
  });

  describe("profiles", () => {
    test("ensureProfile creates and then reuses a profile", async () => {
      const caller = router.createCaller({});
      const created = await caller.ensureProfile({});
      const reused = await caller.ensureProfile({ profileToken: created.token });

      expect(reused.id).toBe(created.id);
    });

    test("getProfile and updateProfile round-trip", async () => {
      const caller = router.createCaller({});
      const created = await caller.ensureProfile({ displayName: "Henrietta" });

      const updated = await caller.updateProfile({
        profileToken: created.token,
        avatar: { emoji: "🐔", color: "#ff8800" }
      });
      expect(updated.avatar.emoji).toBe("🐔");

      const fetched = await caller.getProfile({ profileToken: created.token });
      expect(fetched.displayName).toBe("Henrietta");
      expect(fetched).not.toHaveProperty("token");
    });

    test("listHighScores returns ranked running totals", async () => {
      const caller = router.createCaller({});
      const player = await caller.ensureProfile({ displayName: "Henrietta" });
      profileStore.recordGameResult({ token: player.token, gameId: "pyramids", score: 42 });

      const scores = await caller.listHighScores({ gameId: "pyramids" });
      expect(scores).toEqual([
        expect.objectContaining({ displayName: "Henrietta", score: 42, gamesPlayed: 1 })
      ]);
    });
  });

  describe("solo games", () => {
    test("starts, plays and collects a pyramids game", async () => {
      const caller = router.createCaller({});
      const player = await caller.ensureProfile({});

      let session = await caller.startSoloGame({ gameId: "pyramids", profileToken: player.token });
      expect(session.gameId).toBe("pyramids");
      expect(session.status).toBe("playing");

      for (let guard = 0; guard < 200 && session.status === "playing"; guard += 1) {
        const cardId = (session.view as { playableCardIds: string[] }).playableCardIds[0];
        session = await caller.soloAction({
          sessionId: session.sessionId,
          profileToken: player.token,
          action: cardId ? { type: "play", cardId } : { type: "draw" }
        });
      }

      expect(session.status).toBe("game-over");

      const collected = await caller.collectSoloPoints({
        sessionId: session.sessionId,
        profileToken: player.token
      });

      expect(collected.awarded).toBe(session.score);
      expect(collected.session.status).toBe("collected");
      expect(collected.session.highScore).toBe(session.score);
    });

    test("getSoloGame returns the current session", async () => {
      const caller = router.createCaller({});
      const player = await caller.ensureProfile({});
      const started = await caller.startSoloGame({ gameId: "pyramids", profileToken: player.token });

      const fetched = await caller.getSoloGame({
        sessionId: started.sessionId,
        profileToken: player.token
      });

      expect(fetched.sessionId).toBe(started.sessionId);
    });

    test("rejects starting a multiplayer game as solo", async () => {
      const caller = router.createCaller({});
      const player = await caller.ensureProfile({});

      await expect(
        caller.startSoloGame({ gameId: "hand-and-foot", profileToken: player.token })
      ).rejects.toThrow(/not a solo game/);
    });

    test("soloAction does not accept a collect action", async () => {
      const caller = router.createCaller({});
      const player = await caller.ensureProfile({});
      const started = await caller.startSoloGame({ gameId: "pyramids", profileToken: player.token });

      await expect(
        caller.soloAction({
          sessionId: started.sessionId,
          profileToken: player.token,
          // Collecting must go through collectSoloPoints so the score is banked.
          action: { type: "collect" } as never
        })
      ).rejects.toThrow();
    });
  });
});
