import { useCallback, useEffect, useRef, useState } from "react";
import type { PublicRoomSnapshot } from "@hengames/shared";
import { trpc, type RoomSnapshot } from "./api/trpc";
import { useRoomSocket } from "./api/useRoomSocket";
import { GameTable } from "./components/GameTable";
import { HomePage } from "./components/HomePage";
import { Lobby } from "./components/Lobby";
import type { GameNotification } from "./components/game-table/NotificationsMenu";

const MAX_NOTIFICATIONS = 50;

function readEvent(room: RoomSnapshot | null): { message: string; seq: number } | null {
  const view = room?.currentView as { lastEvent?: unknown; lastEventSeq?: unknown } | null;
  if (typeof view?.lastEvent === "string" && view.lastEvent.length > 0 && typeof view.lastEventSeq === "number") {
    return { message: view.lastEvent, seq: view.lastEventSeq };
  }
  return null;
}

export function App() {
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [participantToken, setParticipantToken] = useState<string | undefined>();
  const [socketSnapshot, setSocketSnapshot] = useState<RoomSnapshot | null>(null);
  const [notifications, setNotifications] = useState<GameNotification[]>([]);
  // Highest event sequence already recorded. Guards against duplicates and
  // out-of-order/stale snapshots (e.g. a slow tRPC poll after a socket drop).
  const maxSeqRef = useRef(-1);
  const gameInstanceRef = useRef<string | null>(null);

  const roomQuery = trpc.getRoom.useQuery(
    { code: roomCode ?? "", participantToken },
    {
      enabled: Boolean(roomCode),
      refetchInterval: roomCode ? 5000 : false
    }
  );
  const handleSnapshot = useCallback((snapshot: PublicRoomSnapshot) => {
    setSocketSnapshot(snapshot);
  }, []);
  const handleDisconnect = useCallback(() => {
    setSocketSnapshot(null);
  }, []);

  useRoomSocket({
    code: roomCode,
    participantToken,
    onSnapshot: handleSnapshot,
    onDisconnect: handleDisconnect
  });

  const room = socketSnapshot ?? roomQuery.data ?? null;
  const gameInstanceId = room?.gameInstanceId ?? null;
  const event = readEvent(room);
  const eventSeq = event?.seq ?? null;
  const eventMessage = event?.message ?? null;

  // Reset notification history when a new game instance starts in this room.
  // Keying on the server-issued instance id (rather than a status transition)
  // is robust even if the client never observed the intervening lobby state.
  useEffect(() => {
    if (gameInstanceId !== gameInstanceRef.current) {
      gameInstanceRef.current = gameInstanceId;
      maxSeqRef.current = -1;
      setNotifications([]);
    }
  }, [gameInstanceId]);

  useEffect(() => {
    if (eventMessage === null || eventSeq === null || eventSeq <= maxSeqRef.current) {
      return;
    }
    maxSeqRef.current = eventSeq;
    setNotifications((current) => {
      const next = [
        ...current,
        {
          id: (current[current.length - 1]?.id ?? 0) + 1,
          seq: eventSeq,
          message: eventMessage,
          at: new Date().toISOString()
        }
      ];
      return next.length > MAX_NOTIFICATIONS ? next.slice(next.length - MAX_NOTIFICATIONS) : next;
    });
  }, [eventSeq, eventMessage]);

  const leaveRoom = useCallback(() => {
    setRoomCode(null);
    setParticipantToken(undefined);
    setSocketSnapshot(null);
    setNotifications([]);
    maxSeqRef.current = -1;
  }, []);

  const enterRoom = useCallback((code: string, token?: string) => {
    setRoomCode(code);
    setParticipantToken(token);
    setSocketSnapshot(null);
    setNotifications([]);
    maxSeqRef.current = -1;
  }, []);

  if (!roomCode || !participantToken) {
    return <HomePage onEnterRoom={enterRoom} />;
  }

  if (!room) {
    return <main className="page">Loading room...</main>;
  }

  if (room.status === "playing") {
    return (
      <GameTable
        room={room}
        participantToken={participantToken}
        notifications={notifications}
        onBack={leaveRoom}
      />
    );
  }

  return (
    <Lobby
      room={room}
      participantToken={participantToken}
      onBack={leaveRoom}
    />
  );
}
