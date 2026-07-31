import { useEffect, useState } from "react";
import { useProfile } from "../profile/ProfileProvider";
import { AvatarPicker } from "./AvatarPicker";

/**
 * The app-level identity card. Shown on the landing page and the room browser so
 * a player always sees the name and icon everyone else will see.
 */
export function ProfileCard(props: { helperText?: string }) {
  const profile = useProfile();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(profile.displayName);

  useEffect(() => {
    if (!editing) {
      setDraft(profile.displayName);
    }
  }, [editing, profile.displayName]);

  const commit = () => {
    profile.setDisplayName(draft);
    setEditing(false);
  };

  return (
    <div className="profile-card profile-card--editable">
      <span className="avatar" style={{ background: profile.avatar.color }}>{profile.avatar.emoji}</span>
      <div className="profile-card__body">
        {editing ? (
          <div className="profile-name-edit">
            <input
              autoFocus
              aria-label="Display name"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  commit();
                }
                if (event.key === "Escape") {
                  setDraft(profile.displayName);
                  setEditing(false);
                }
              }}
              placeholder="Choose a name"
            />
            <button type="button" className="icon-button" aria-label="Save name" onClick={commit}>✔️</button>
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
                setDraft(profile.displayName);
                setEditing(true);
              }}
            >
              ✏️
            </button>
            <button
              type="button"
              className="icon-button"
              aria-label="Generate a new name"
              title="Generate a new name and icon"
              onClick={() => {
                setEditing(false);
                profile.regenerate();
              }}
            >
              ♻️
            </button>
          </div>
        )}
        <p className="helper-text">
          {props.helperText ?? "This profile follows you into every game and keeps your scores."}
        </p>
        <AvatarPicker value={profile.avatar} onChange={profile.setAvatar} />
      </div>
    </div>
  );
}
