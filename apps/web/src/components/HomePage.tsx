import { useState } from "react";
import { trpc } from "../api/trpc";
import { loadSessionProfile, saveParticipantToken } from "../session";

export function HomePage(props: { onEnterRoom(code: string, participantToken?: string): void }) {
  const [sessionProfile] = useState(loadSessionProfile);
  const [displayName, setDisplayName] = useState("");
  const [deckCount, setDeckCount] = useState(6);
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
        <h1>HenGames</h1>
        <p>Play Hand and Foot together without shuffling five decks.</p>
        <p className="helper-text">
          Joining creates your player profile for this session. Leave the name blank for a generated identity like
          {" "}peeking-penguin with a matching avatar.
        </p>
        <div className="profile-card">
          <span className="avatar" style={{ background: sessionProfile.avatar.color }}>{sessionProfile.avatar.emoji}</span>
          <div>
            <strong>You are {displayName.trim() || sessionProfile.displayName}</strong>
            <p className="helper-text">This profile will be used when you create or join a room.</p>
          </div>
        </div>
        <label>
          Display name
          <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Generate one for me" />
        </label>
        <label>
          Decks
          <input
            min={2}
            max={8}
            type="number"
            value={deckCount}
            onChange={(event) => setDeckCount(Number(event.target.value))}
          />
        </label>
        <button
          onClick={() =>
            createRoom.mutate({
              displayName: displayName.trim() || sessionProfile.displayName,
              avatar: sessionProfile.avatar,
              options: { deckCount }
            })
          }
        >
          Create Hand and Foot room
        </button>
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
                 <button
                   onClick={() =>
                     joinRoom.mutate({
                       code: room.code,
                       displayName: displayName.trim() || sessionProfile.displayName,
                       avatar: sessionProfile.avatar
                     })
                   }
                 >
                   Join or spectate
                 </button>
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
