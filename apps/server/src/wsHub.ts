import { Server } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { createRoomStore } from "./rooms/roomStore.js";

type Client = {
  socket: WebSocket;
  code: string;
  participantToken?: string;
};

export function createWsHub(server: Server) {
  const clients = new Set<Client>();

  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (socket, req) => {
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const code = url.searchParams.get("code");
    const participantToken = url.searchParams.get("participantToken") ?? undefined;

    if (!code) {
      socket.close(1008, "Room code is required.");
      return;
    }

    const normalizedCode = code.toUpperCase();

    const client: Client = {
      socket,
      code: normalizedCode,
      participantToken
    };

    clients.add(client);

    socket.on("close", () => {
      clients.delete(client);
    });
  });

  function broadcastRoom(code: string, roomStore: ReturnType<typeof createRoomStore>) {
    const normalizedCode = code.toUpperCase();

    for (const client of clients) {
      if (client.code === normalizedCode && client.socket.readyState === WebSocket.OPEN) {
        try {
          const snapshot = roomStore.getSnapshot({
            code: normalizedCode,
            token: client.participantToken
          });

          const message = JSON.stringify({
            type: "room-snapshot",
            snapshot
          });

          client.socket.send(message);
        } catch (error) {
          console.error(`Failed to broadcast to client in room ${normalizedCode}:`, error instanceof Error ? error.message : error);
        }
      }
    }
  }

  function getActiveRoomCodes(): Set<string> {
    const codes = new Set<string>();
    for (const client of clients) {
      if (client.socket.readyState === WebSocket.OPEN) {
        codes.add(client.code);
      }
    }
    return codes;
  }

  return {
    broadcastRoom,
    getActiveRoomCodes
  };
}

export type WsHub = ReturnType<typeof createWsHub>;
