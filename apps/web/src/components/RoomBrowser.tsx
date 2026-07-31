import { useState } from "react";
import { findGame } from "@hengames/shared";
import { trpc } from "../api/trpc";
import { useProfile } from "../profile/ProfileProvider";
import { saveParticipantToken } from "../session";
import { ProfileCard } from "./ProfileCard";

const handAndFoot = findGame("hand-and-foot");

export function RoomBrowser(props: {
  onEnterRoom(code: string, participantToken?: string): void;
  onBack(): void;
}) {
  const profile = useProfile();
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

  const identity = { displayName: profile.displayName, avatar: profile.avatar };

  return (
    <main className="page">
      <button className="link-button" onClick={props.onBack}>← All games</button>

      <section className="hero">
        <h1>{handAndFoot.displayName}</h1>
        <p>{handAndFoot.description}</p>
        <ProfileCard helperText="This profile is used when you create or join a room." />
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
                <button onClick={() => joinRoom.mutate({ code: room.code, ...identity })}>
                  Join or spectate
                </button>
              </article>
            ))}
          </div>
        ) : (
          <p>No active rooms yet.</p>
        )}
      </section>

      <section className="panel">
        <h2>Create a room</h2>
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
          className="primary"
          onClick={() => createRoom.mutate({ ...identity, options: { deckCount } })}
        >
          Create Hand and Foot room
        </button>
      </section>
    </main>
  );
}
