import { useState } from "react";
import type { ParticipantAvatar } from "@hengames/shared";
import { trpc } from "../api/trpc";
import {
  loadSessionProfile,
  regenerateSessionProfile,
  saveParticipantToken,
  saveSessionProfile,
  type SessionProfile
} from "../session";
import { AvatarPicker } from "./AvatarPicker";

export function HomePage(props: { onEnterRoom(code: string, participantToken?: string): void }) {
  const [profile, setProfile] = useState<SessionProfile>(loadSessionProfile);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(profile.displayName);
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

  const commitName = () => {
    const trimmed = nameDraft.trim();
    const nextProfile = saveSessionProfile({
      ...profile,
      displayName: trimmed || profile.displayName
    });
    setProfile(nextProfile);
    setNameDraft(nextProfile.displayName);
    setEditingName(false);
  };

  const regenerate = () => {
    const nextProfile = regenerateSessionProfile();
    setProfile(nextProfile);
    setNameDraft(nextProfile.displayName);
    setEditingName(false);
  };

  const changeAvatar = (avatar: ParticipantAvatar) => {
    setProfile(saveSessionProfile({ ...profile, avatar }));
  };

  // Honour an in-progress name edit that the user hasn't explicitly saved yet.
  const resolveProfile = (): SessionProfile => {
    if (!editingName) {
      return profile;
    }
    const trimmed = nameDraft.trim();
    return trimmed ? saveSessionProfile({ ...profile, displayName: trimmed }) : profile;
  };

  return (
    <main className="page">
      <section className="hero">
        <h1>HenGames</h1>
        <p>Play Hand and Foot together without shuffling five decks.</p>

        <div className="profile-card profile-card--editable">
          <span className="avatar" style={{ background: profile.avatar.color }}>{profile.avatar.emoji}</span>
          <div className="profile-card__body">
            {editingName ? (
              <div className="profile-name-edit">
                <input
                  autoFocus
                  aria-label="Display name"
                  value={nameDraft}
                  onChange={(event) => setNameDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      commitName();
                    }
                    if (event.key === "Escape") {
                      setNameDraft(profile.displayName);
                      setEditingName(false);
                    }
                  }}
                  placeholder="Choose a name"
                />
                <button type="button" className="icon-button" aria-label="Save name" onClick={commitName}>✔️</button>
              </div>
            ) : (
              <div className="profile-name-row">
                <strong>You are {profile.displayName}</strong>
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Edit name"
                  title="Set a custom name"
                  onClick={() => {
                    setNameDraft(profile.displayName);
                    setEditingName(true);
                  }}
                >
                  ✏️
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Generate a new name"
                  title="Generate a new name and icon"
                  onClick={regenerate}
                >
                  ♻️
                </button>
              </div>
            )}
            <p className="helper-text">This profile is used when you create or join a room.</p>
            <AvatarPicker value={profile.avatar} onChange={changeAvatar} />
          </div>
        </div>
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
                  onClick={() => {
                    const active = resolveProfile();
                    joinRoom.mutate({
                      code: room.code,
                      displayName: active.displayName,
                      avatar: active.avatar
                    });
                  }}
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
          onClick={() => {
            const active = resolveProfile();
            createRoom.mutate({
              displayName: active.displayName,
              avatar: active.avatar,
              options: { deckCount }
            });
          }}
        >
          Create Hand and Foot room
        </button>
      </section>
    </main>
  );
}
