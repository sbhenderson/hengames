import { describe, test, expect, beforeEach, vi, afterEach } from "vitest";
import http from "node:http";
import { WebSocket } from "ws";
import { createWsHub } from "./wsHub";
import { createRoomStore } from "./rooms/roomStore";

describe("wsHub", () => {
  let server: http.Server;
  let wsHub: ReturnType<typeof createWsHub>;
  let roomStore: ReturnType<typeof createRoomStore>;
  let port: number;

  beforeEach(async () => {
    server = http.createServer();
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        port = (server.address() as any).port;
        resolve();
      });
    });
    
    wsHub = createWsHub(server);
    roomStore = createRoomStore();
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  test("closes connection if code is missing", async () => {
    const ws = new WebSocket(`ws://localhost:${port}/ws`);
    
    const closePromise = new Promise<{ code: number; reason: string }>((resolve) => {
      ws.on("close", (code, reason) => {
        resolve({ code, reason: reason.toString() });
      });
    });

    const result = await closePromise;
    expect(result.code).toBe(1008);
    expect(result.reason).toBe("Room code is required.");
  });

  test("accepts connection with valid code", async () => {
    const { room } = roomStore.createRoom({ displayName: "Alice" });
    
    const ws = new WebSocket(`ws://localhost:${port}/ws?code=${room.code}`);

    const openPromise = new Promise<void>((resolve) => {
      ws.on("open", () => resolve());
    });

    await openPromise;
    expect(ws.readyState).toBe(WebSocket.OPEN);
    ws.close();
  });

  test("normalizes room code to uppercase", async () => {
    const { room } = roomStore.createRoom({ displayName: "Alice" });
    const lowerCode = room.code.toLowerCase();
    
    const ws = new WebSocket(`ws://localhost:${port}/ws?code=${lowerCode}`);

    const openPromise = new Promise<void>((resolve) => {
      ws.on("open", () => resolve());
    });

    await openPromise;
    expect(ws.readyState).toBe(WebSocket.OPEN);

    // Should receive broadcasts for the normalized uppercase code
    const messagePromise = new Promise<any>((resolve) => {
      ws.on("message", (data) => {
        resolve(JSON.parse(data.toString()));
      });
    });

    wsHub.broadcastRoom(room.code, roomStore);

    const message = await messagePromise;
    expect(message.type).toBe("room-snapshot");
    expect(message.snapshot.code).toBe(room.code);

    ws.close();
  });

  test("accepts participantToken from query string", async () => {
    const { room, participant } = roomStore.createRoom({ displayName: "Alice" });
    
    const ws = new WebSocket(
      `ws://localhost:${port}/ws?code=${room.code}&participantToken=${participant.token}`
    );

    const openPromise = new Promise<void>((resolve) => {
      ws.on("open", () => resolve());
    });

    await openPromise;
    expect(ws.readyState).toBe(WebSocket.OPEN);
    ws.close();
  });

  test("broadcastRoom sends participant-specific snapshots", async () => {
    const { room, participant: host } = roomStore.createRoom({ displayName: "Alice" });
    const { participant: guest } = roomStore.joinRoom({ code: room.code, displayName: "Bob" });

    // Connect host
    const wsHost = new WebSocket(
      `ws://localhost:${port}/ws?code=${room.code}&participantToken=${host.token}`
    );
    await new Promise<void>((resolve) => wsHost.on("open", () => resolve()));

    // Connect guest
    const wsGuest = new WebSocket(
      `ws://localhost:${port}/ws?code=${room.code}&participantToken=${guest.token}`
    );
    await new Promise<void>((resolve) => wsGuest.on("open", () => resolve()));

    // Connect spectator (no token)
    const wsSpectator = new WebSocket(`ws://localhost:${port}/ws?code=${room.code}`);
    await new Promise<void>((resolve) => wsSpectator.on("open", () => resolve()));

    // Collect messages
    const hostMessages: any[] = [];
    const guestMessages: any[] = [];
    const spectatorMessages: any[] = [];

    wsHost.on("message", (data) => hostMessages.push(JSON.parse(data.toString())));
    wsGuest.on("message", (data) => guestMessages.push(JSON.parse(data.toString())));
    wsSpectator.on("message", (data) => spectatorMessages.push(JSON.parse(data.toString())));

    // Trigger broadcast
    wsHub.broadcastRoom(room.code, roomStore);

    // Wait for messages
    await new Promise((resolve) => setTimeout(resolve, 100));

    // All should receive messages
    expect(hostMessages).toHaveLength(1);
    expect(guestMessages).toHaveLength(1);
    expect(spectatorMessages).toHaveLength(1);

    // All should be room-snapshot type
    expect(hostMessages[0]!.type).toBe("room-snapshot");
    expect(guestMessages[0]!.type).toBe("room-snapshot");
    expect(spectatorMessages[0]!.type).toBe("room-snapshot");

    // All should have the same room code
    expect(hostMessages[0]!.snapshot.code).toBe(room.code);
    expect(guestMessages[0]!.snapshot.code).toBe(room.code);
    expect(spectatorMessages[0]!.snapshot.code).toBe(room.code);

    wsHost.close();
    wsGuest.close();
    wsSpectator.close();
  });

  test("broadcastRoom only sends to matching room code", async () => {
    const { room: room1 } = roomStore.createRoom({ displayName: "Alice" });
    const { room: room2 } = roomStore.createRoom({ displayName: "Bob" });

    const ws1 = new WebSocket(`ws://localhost:${port}/ws?code=${room1.code}`);
    await new Promise<void>((resolve) => ws1.on("open", () => resolve()));

    const ws2 = new WebSocket(`ws://localhost:${port}/ws?code=${room2.code}`);
    await new Promise<void>((resolve) => ws2.on("open", () => resolve()));

    const messages1: any[] = [];
    const messages2: any[] = [];

    ws1.on("message", (data) => messages1.push(JSON.parse(data.toString())));
    ws2.on("message", (data) => messages2.push(JSON.parse(data.toString())));

    // Broadcast to room1 only
    wsHub.broadcastRoom(room1.code, roomStore);

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(messages1).toHaveLength(1);
    expect(messages1[0]!.snapshot.code).toBe(room1.code);
    expect(messages2).toHaveLength(0);

    ws1.close();
    ws2.close();
  });

  test("does not leak participant tokens in snapshots", async () => {
    const { room, participant } = roomStore.createRoom({ displayName: "Alice" });
    
    const ws = new WebSocket(
      `ws://localhost:${port}/ws?code=${room.code}&participantToken=${participant.token}`
    );
    await new Promise<void>((resolve) => ws.on("open", () => resolve()));

    const messagePromise = new Promise<any>((resolve) => {
      ws.on("message", (data) => {
        resolve(JSON.parse(data.toString()));
      });
    });

    wsHub.broadcastRoom(room.code, roomStore);

    const message = await messagePromise;
    
    // Snapshot should not contain participant tokens
    const snapshotString = JSON.stringify(message.snapshot);
    expect(snapshotString).not.toContain(participant.token);

    ws.close();
  });

  test("removes client on disconnect", async () => {
    const { room } = roomStore.createRoom({ displayName: "Alice" });
    
    const ws = new WebSocket(`ws://localhost:${port}/ws?code=${room.code}`);
    await new Promise<void>((resolve) => ws.on("open", () => resolve()));

    ws.close();
    await new Promise<void>((resolve) => ws.on("close", () => resolve()));

    // Create a new connection to verify the old one is gone
    const ws2 = new WebSocket(`ws://localhost:${port}/ws?code=${room.code}`);
    await new Promise<void>((resolve) => ws2.on("open", () => resolve()));

    const messages: any[] = [];
    ws2.on("message", (data) => messages.push(JSON.parse(data.toString())));

    wsHub.broadcastRoom(room.code, roomStore);

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Should only receive one message (for ws2), not two
    expect(messages).toHaveLength(1);

    ws2.close();
  });

  test("broadcast continues to valid clients even if one client has invalid token", async () => {
    const { room, participant } = roomStore.createRoom({ displayName: "Alice" });
    
    // Connect client with invalid token
    const wsInvalid = new WebSocket(
      `ws://localhost:${port}/ws?code=${room.code}&participantToken=INVALID_TOKEN`
    );
    await new Promise<void>((resolve) => wsInvalid.on("open", () => resolve()));

    // Connect valid client with correct token
    const wsValid = new WebSocket(
      `ws://localhost:${port}/ws?code=${room.code}&participantToken=${participant.token}`
    );
    await new Promise<void>((resolve) => wsValid.on("open", () => resolve()));

    const validMessages: any[] = [];
    wsValid.on("message", (data) => validMessages.push(JSON.parse(data.toString())));

    // Broadcast should not throw and should still reach valid client
    expect(() => wsHub.broadcastRoom(room.code, roomStore)).not.toThrow();

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Valid client should still receive the broadcast
    expect(validMessages).toHaveLength(1);
    expect(validMessages[0]!.type).toBe("room-snapshot");

    wsInvalid.close();
    wsValid.close();
  });
});
