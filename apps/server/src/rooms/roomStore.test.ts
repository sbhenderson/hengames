import { describe, test, expect, beforeEach } from "vitest";
import { createRoomStore } from "./roomStore.js";
import type { HandAndFootPlayerView } from "@hengames/game-engine";

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
    expect(result.phase).toBe("playing");
    expect(result.currentView).toBeTruthy();
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

  test("startGame does not expose mutable internal room state or participant tokens", () => {
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

    // Should not expose gameState directly
    expect(result).not.toHaveProperty("gameState");

    // Participants in the returned snapshot should not have token
    if (result.participants) {
      result.participants.forEach(p => {
        expect(p).not.toHaveProperty("token");
      });
    }

    // Mutate the returned snapshot status/seats
    result.status = "waiting";
    if (result.seats && result.seats.length > 0) {
      result.seats[0]!.participantId = null;
    }

    // Assert a fresh getSnapshot still shows the real internal status/seats
    const freshSnapshot = store.getSnapshot({ code: room.code });
    expect(freshSnapshot.status).toBe("playing");
    expect(freshSnapshot.seats.find(s => s.id === "north")?.participantId).toBe(p1.id);
  });

  test("cross-room token cannot choose a seat in another room", () => {
    const { room: roomA, participant: participantA } = store.createRoom({ displayName: "PlayerA" });
    const { room: roomB } = store.createRoom({ displayName: "PlayerB" });

    expect(() => 
      store.chooseSeat({ code: roomB.code, token: participantA.token, seatId: "north" })
    ).toThrow();
  });

  test("cross-room token cannot set ready in another room", () => {
    const { room: roomA, participant: participantA } = store.createRoom({ displayName: "PlayerA" });
    const { room: roomB, participant: participantB } = store.createRoom({ displayName: "PlayerB" });

    // Participant B takes a seat in room B
    store.chooseSeat({ code: roomB.code, token: participantB.token, seatId: "north" });

    // Participant A from room A tries to set ready in room B
    expect(() => 
      store.setReady({ code: roomB.code, token: participantA.token, ready: true })
    ).toThrow();
  });

  test("cross-room token cannot start game in another room", () => {
    const { room: roomA, participant: participantA } = store.createRoom({ displayName: "PlayerA" });
    const { room: roomB, participant: participantB } = store.createRoom({ displayName: "PlayerB" });
    const { participant: p3 } = store.joinRoom({ code: roomB.code, displayName: "P3" });
    const { participant: p4 } = store.joinRoom({ code: roomB.code, displayName: "P4" });
    const { participant: p5 } = store.joinRoom({ code: roomB.code, displayName: "P5" });

    // Fill and ready all seats in room B
    store.chooseSeat({ code: roomB.code, token: participantB.token, seatId: "north" });
    store.chooseSeat({ code: roomB.code, token: p3.token, seatId: "east" });
    store.chooseSeat({ code: roomB.code, token: p4.token, seatId: "south" });
    store.chooseSeat({ code: roomB.code, token: p5.token, seatId: "west" });

    store.setReady({ code: roomB.code, token: participantB.token, ready: true });
    store.setReady({ code: roomB.code, token: p3.token, ready: true });
    store.setReady({ code: roomB.code, token: p4.token, ready: true });
    store.setReady({ code: roomB.code, token: p5.token, ready: true });

    // Participant A from room A tries to start room B (even though participantB is host of room B)
    expect(() => 
      store.startGame({ code: roomB.code, token: participantA.token })
    ).toThrow();
  });

  test("setReady throws after the game has started", () => {
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

    store.startGame({ code: room.code, token: p1.token });

    // Try to toggle ready after game has started
    expect(() => 
      store.setReady({ code: room.code, token: p1.token, ready: false })
    ).toThrow();
  });

  test("chooseSeat on the same seat is a no-op and preserves ready status", () => {
    const { room, participant } = store.createRoom({ displayName: "Alice" });

    // Choose seat and set ready
    store.chooseSeat({ code: room.code, token: participant.token, seatId: "north" });
    store.setReady({ code: room.code, token: participant.token, ready: true });

    const beforeSnapshot = store.getSnapshot({ code: room.code });
    expect(beforeSnapshot.seats.find(s => s.id === "north")?.ready).toBe(true);

    // Choose the same seat again
    const afterSnapshot = store.chooseSeat({ code: room.code, token: participant.token, seatId: "north" });

    // Ready status should be preserved
    expect(afterSnapshot.seats.find(s => s.id === "north")?.participantId).toBe(participant.id);
    expect(afterSnapshot.seats.find(s => s.id === "north")?.ready).toBe(true);
  });

  test("snapshot currentView mutation does not corrupt server game state", () => {
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

    store.startGame({ code: room.code, token: p1.token });

    // Check internal gameState before mutation
    const gameStateBefore = (store as any)._getInternalGameState(room.code);
    const internalHandLengthBefore = gameStateBefore?.players[p1.id]?.hand.length;
    
    const snapshot1 = store.getSnapshot({ code: room.code, token: p1.token });
    const snapshot2Before = store.getSnapshot({ code: room.code, token: p1.token });
    
    // Verify both snapshots have current view
    expect(snapshot1.currentView).toBeTruthy();
    expect(snapshot2Before.currentView).toBeTruthy();
    
    const view1 = snapshot1.currentView as HandAndFootPlayerView;
    const view2Before = snapshot2Before.currentView as HandAndFootPlayerView;
    
    const p1HandBefore = view2Before.players[p1.id]?.hand?.length;
    const teamScoresBefore = view2Before.teamScores.red;
    
    // Mutate snapshot1
    if (view1.players[p1.id]?.hand) {
      view1.players[p1.id]!.hand!.pop();
    }
    view1.teamScores.red = 999;
    view1.roundScores.push({ red: 100, blue: 200 });

    // Check internal gameState after mutation - it should NOT have changed
    const gameStateAfter = (store as any)._getInternalGameState(room.code);
    const internalHandLengthAfter = gameStateAfter?.players[p1.id]?.hand.length;
    expect(internalHandLengthAfter).toBe(internalHandLengthBefore);

    // Get fresh snapshot
    const snapshot3After = store.getSnapshot({ code: room.code, token: p1.token });
    const view3After = snapshot3After.currentView as HandAndFootPlayerView;
    
    // Fresh snapshot should match the pre-mutation snapshot
    expect(view3After.players[p1.id]?.hand?.length).toBe(p1HandBefore);
    expect(view3After.teamScores.red).toBe(teamScoresBefore);
  });

  test("applyGameAction rejects spectators", () => {
    const { room, participant: p1 } = store.createRoom({ displayName: "P1" });
    const { participant: p2 } = store.joinRoom({ code: room.code, displayName: "P2" });
    const { participant: p3 } = store.joinRoom({ code: room.code, displayName: "P3" });
    const { participant: p4 } = store.joinRoom({ code: room.code, displayName: "P4" });
    const { participant: spectator } = store.joinRoom({ code: room.code, displayName: "Spectator" });

    store.chooseSeat({ code: room.code, token: p1.token, seatId: "north" });
    store.chooseSeat({ code: room.code, token: p2.token, seatId: "east" });
    store.chooseSeat({ code: room.code, token: p3.token, seatId: "south" });
    store.chooseSeat({ code: room.code, token: p4.token, seatId: "west" });

    store.setReady({ code: room.code, token: p1.token, ready: true });
    store.setReady({ code: room.code, token: p2.token, ready: true });
    store.setReady({ code: room.code, token: p3.token, ready: true });
    store.setReady({ code: room.code, token: p4.token, ready: true });

    store.startGame({ code: room.code, token: p1.token });

    expect(() => 
      store.applyGameAction({ code: room.code, token: spectator.token, action: { type: "draw" } as any })
    ).toThrow("Only seated players can perform game actions");
  });

  test("startGame throws when attempting to start an already playing room", () => {
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

    store.startGame({ code: room.code, token: p1.token });

    expect(() => 
      store.startGame({ code: room.code, token: p1.token })
    ).toThrow("Cannot start game: room is not in waiting status");
  });

  test("resetLobby lets the host clear seats and return players to spectators", () => {
    const { room, participant: host } = store.createRoom({ displayName: "Host" });
    const { participant: guest } = store.joinRoom({ code: room.code, displayName: "Guest" });

    store.chooseSeat({ code: room.code, token: host.token, seatId: "north" });
    store.chooseSeat({ code: room.code, token: guest.token, seatId: "east" });
    store.setReady({ code: room.code, token: host.token, ready: true });
    store.setReady({ code: room.code, token: guest.token, ready: true });

    const snapshot = store.resetLobby({ code: room.code, participantToken: host.token });

    expect(snapshot.status).toBe("waiting");
    expect(snapshot.seats.every(seat => seat.participantId === null && seat.ready === false)).toBe(true);
    expect(snapshot.spectatorIds).toContain(host.id);
    expect(snapshot.spectatorIds).toContain(guest.id);
    expect(snapshot.currentParticipantId).toBe(host.id);
  });

  test("resetLobby rejects non-hosts and active games", () => {
    const { room, participant: host } = store.createRoom({ displayName: "Host" });
    const { participant: guest } = store.joinRoom({ code: room.code, displayName: "Guest" });
    const { participant: p3 } = store.joinRoom({ code: room.code, displayName: "P3" });
    const { participant: p4 } = store.joinRoom({ code: room.code, displayName: "P4" });

    expect(() => store.resetLobby({ code: room.code, participantToken: guest.token })).toThrow("Only the host can do that.");

    store.chooseSeat({ code: room.code, token: host.token, seatId: "north" });
    store.chooseSeat({ code: room.code, token: guest.token, seatId: "east" });
    store.chooseSeat({ code: room.code, token: p3.token, seatId: "south" });
    store.chooseSeat({ code: room.code, token: p4.token, seatId: "west" });
    store.setReady({ code: room.code, token: host.token, ready: true });
    store.setReady({ code: room.code, token: guest.token, ready: true });
    store.setReady({ code: room.code, token: p3.token, ready: true });
    store.setReady({ code: room.code, token: p4.token, ready: true });
    store.startGame({ code: room.code, token: host.token });

    expect(() => store.resetLobby({ code: room.code, participantToken: host.token })).toThrow(
      "Only waiting rooms can be reset in the first version."
    );
  });

  test("kickParticipant lets the host remove a non-host before the game starts", () => {
    const { room, participant: host } = store.createRoom({ displayName: "Host" });
    const { participant: guest } = store.joinRoom({ code: room.code, displayName: "Guest" });

    store.chooseSeat({ code: room.code, token: guest.token, seatId: "east" });
    store.setReady({ code: room.code, token: guest.token, ready: true });

    const snapshot = store.kickParticipant({
      code: room.code,
      participantToken: host.token,
      targetParticipantId: guest.id
    });

    expect(snapshot.participants.find(participant => participant.id === guest.id)).toBeUndefined();
    expect(snapshot.spectatorIds).not.toContain(guest.id);
    expect(snapshot.seats.find(seat => seat.id === "east")?.participantId).toBeNull();
    expect(snapshot.seats.find(seat => seat.id === "east")?.ready).toBe(false);
    expect(snapshot.currentParticipantId).toBe(host.id);
  });

  test("kickParticipant rejects non-hosts, self-kicks, missing participants, and active games", () => {
    const { room, participant: host } = store.createRoom({ displayName: "Host" });
    const { participant: guest } = store.joinRoom({ code: room.code, displayName: "Guest" });
    const { participant: p3 } = store.joinRoom({ code: room.code, displayName: "P3" });
    const { participant: p4 } = store.joinRoom({ code: room.code, displayName: "P4" });

    expect(() =>
      store.kickParticipant({ code: room.code, participantToken: guest.token, targetParticipantId: p3.id })
    ).toThrow("Only the host can do that.");
    expect(() =>
      store.kickParticipant({ code: room.code, participantToken: host.token, targetParticipantId: host.id })
    ).toThrow("The host cannot kick themselves.");
    expect(() =>
      store.kickParticipant({ code: room.code, participantToken: host.token, targetParticipantId: "missing" })
    ).toThrow("Participant not found.");

    store.chooseSeat({ code: room.code, token: host.token, seatId: "north" });
    store.chooseSeat({ code: room.code, token: guest.token, seatId: "east" });
    store.chooseSeat({ code: room.code, token: p3.token, seatId: "south" });
    store.chooseSeat({ code: room.code, token: p4.token, seatId: "west" });
    store.setReady({ code: room.code, token: host.token, ready: true });
    store.setReady({ code: room.code, token: guest.token, ready: true });
    store.setReady({ code: room.code, token: p3.token, ready: true });
    store.setReady({ code: room.code, token: p4.token, ready: true });
    store.startGame({ code: room.code, token: host.token });

    expect(() =>
      store.kickParticipant({ code: room.code, participantToken: host.token, targetParticipantId: guest.id })
    ).toThrow("Participants can only be kicked before the game starts.");
  });
});
