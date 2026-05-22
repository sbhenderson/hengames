import { useCallback, useState } from "react";
import type { PublicRoomSnapshot } from "@hengames/shared";
import { trpc, type RoomSnapshot } from "./api/trpc";
import { useRoomSocket } from "./api/useRoomSocket";
import { GameTable } from "./components/GameTable";
import { HomePage } from "./components/HomePage";
import { Lobby } from "./components/Lobby";

export function App() {
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [participantToken, setParticipantToken] = useState<string | undefined>();
  const [socketSnapshot, setSocketSnapshot] = useState<RoomSnapshot | null>(null);
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

  useRoomSocket({
    code: roomCode,
    participantToken,
    onSnapshot: handleSnapshot,
    onDisconnect: () => setSocketSnapshot(null)
  });

  const leaveRoom = () => {
    setRoomCode(null);
    setParticipantToken(undefined);
    setSocketSnapshot(null);
  };
  const room = socketSnapshot ?? roomQuery.data ?? null;

  if (!roomCode || !participantToken) {
    return (
      <HomePage
        onEnterRoom={(code, token) => {
          setRoomCode(code);
          setParticipantToken(token);
          setSocketSnapshot(null);
        }}
      />
    );
  }

  if (!room) {
    return <main className="page">Loading room...</main>;
  }

  if (room.status === "playing") {
    return <GameTable room={room} participantToken={participantToken} onBack={leaveRoom} />;
  }

  return (
    <Lobby
      room={room}
      participantToken={participantToken}
      onBack={leaveRoom}
    />
  );
}
