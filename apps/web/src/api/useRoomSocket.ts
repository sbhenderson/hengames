import { useEffect } from "react";
import { z } from "zod";
import type { PublicRoomSnapshot } from "@hengames/shared";

const roomSnapshotMessageSchema = z.object({
  type: z.literal("room-snapshot"),
  snapshot: z.object({
    code: z.string()
  }).passthrough()
});

export function useRoomSocket(input: {
  code: string | null;
  participantToken?: string;
  onSnapshot(snapshot: PublicRoomSnapshot): void;
  onDisconnect?(): void;
}) {
  const { code, onSnapshot, participantToken, onDisconnect } = input;

  useEffect(() => {
    if (!code) {
      return;
    }

    const params = new URLSearchParams({ code });
    if (participantToken) {
      params.set("participantToken", participantToken);
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socketUrl = `${protocol}//${window.location.host}/ws?${params.toString()}`;
    let socket: WebSocket | null = null;
    let closed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectAttempt = 0;

    const clearReconnectTimer = () => {
      if (reconnectTimer !== null) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    const scheduleReconnect = () => {
      if (closed || reconnectTimer !== null) {
        return;
      }
      const delayMs = Math.min(1000 * (2 ** reconnectAttempt), 10_000);
      reconnectAttempt += 1;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, delayMs);
    };

    const connect = () => {
      if (closed) {
        return;
      }

      socket = new WebSocket(socketUrl);

      socket.addEventListener("open", () => {
        reconnectAttempt = 0;
      });

      socket.addEventListener("message", (event) => {
        try {
          const payload = JSON.parse(event.data);
          const parsed = roomSnapshotMessageSchema.safeParse(payload);
          if (parsed.success) {
            onSnapshot(parsed.data.snapshot as PublicRoomSnapshot);
          }
        } catch {
          // Ignore malformed payloads and keep the socket alive.
        }
      });

      socket.addEventListener("close", () => {
        onDisconnect?.();
        scheduleReconnect();
      });

      socket.addEventListener("error", () => {
        socket?.close();
      });
    };

    connect();

    return () => {
      closed = true;
      clearReconnectTimer();
      socket?.close();
    };
  }, [code, onDisconnect, onSnapshot, participantToken]);
}
