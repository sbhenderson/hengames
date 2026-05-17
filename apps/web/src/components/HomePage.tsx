import { useState } from "react";
import { trpc } from "../api/trpc";
import { saveParticipantToken } from "../session";

export function HomePage(props: { onEnterRoom(code: string, participantToken?: string): void }) {
  const [displayName, setDisplayName] = useState("");
  const rooms = trpc.listRooms.useQuery(undefined, { refetchInterval: 3000 });
  const utils = trpc.useUtils();
  const createRoom = trpc.createRoom.useMutation({
    onSuccess(result) {
      saveParticipantToken(result.participant.token);
      props.onEnterRoom(result.room.code, result.participant.token);
      void utils.listRooms.invalidate();
    }
  });
  const joinRoom = trpc.joinRoom.useMutation({
    onSuccess(result, variables) {
      saveParticipantToken(result.participant.token);
      props.onEnterRoom(variables.code, result.participant.token);
    }
  });

  return (
    <main className="page">
      <section className="hero">
        <h1>hengames</h1>
        <p>Play Hand and Foot together without shuffling five decks.</p>
        <label>
          Display name
          <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Anonymous is fine" />
        </label>
        <button onClick={() => createRoom.mutate({ displayName })}>Create Hand and Foot room</button>
      </section>

      <section className="panel">
        <h2>Active rooms</h2>
        {rooms.data?.length ? (
          <div className="room-list">
            {rooms.data.map((room) => (
              <article className="room-card" key={room.code}>
                <strong>{room.code}</strong>
                <span>{room.status}</span>
                <span>{room.playerCount} players</span>
                <button onClick={() => joinRoom.mutate({ code: room.code, displayName })}>Join or spectate</button>
              </article>
            ))}
          </div>
        ) : (
          <p>No active rooms yet.</p>
        )}
      </section>
    </main>
  );
}
