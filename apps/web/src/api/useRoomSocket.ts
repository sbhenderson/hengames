import { useEffect } from "react";
import type { PublicRoomSnapshot } from "@hengames/shared";

export function useRoomSocket(input: {
  code: string | null;
  participantToken?: string;
  onSnapshot(snapshot: PublicRoomSnapshot): void;
}) {
  const { code, onSnapshot, participantToken } = input;

  useEffect(() => {
    if (!code) {
      return;
    }

    const params = new URLSearchParams({ code });
    if (participantToken) {
      params.set("participantToken", participantToken);
    }

    const socket = new WebSocket(`ws://localhost:3000/ws?${params.toString()}`);
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data) as { type: "room-snapshot"; snapshot: PublicRoomSnapshot };
      if (message.type === "room-snapshot") {
        onSnapshot(message.snapshot);
      }
    });

    return () => socket.close();
  }, [code, onSnapshot, participantToken]);
}
