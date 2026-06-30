import type { ParticipantAvatar } from "@hengames/shared";
import { AvatarPicker } from "../AvatarPicker";
import { SoundToggle } from "../SoundToggle";
import { Hen } from "./Hen";
import { NotificationsMenu, type GameNotification } from "./NotificationsMenu";
import type { HandAndFootTableView, TeamId } from "./types";

function turnStepLabel(turnStep: HandAndFootTableView["turnStep"]): string {
  if (turnStep === "must-draw") {
    return "Draw a card";
  }
  if (turnStep === "must-discard") {
    return "Meld or discard";
  }
  return "Meld your cards";
}

export function GameHud(props: {
  roomCode: string;
  round: number;
  currentPlayerName: string;
  actionPrompt: string;
  teamScores: Record<TeamId, number>;
  isOwnTurn: boolean;
  participant?: {
    displayName: string;
    avatar: ParticipantAvatar;
  };
  playerTeam?: TeamId;
  activePile?: "hand" | "foot";
  turnStep: HandAndFootTableView["turnStep"];
  notifications: GameNotification[];
  avatarDisabled: boolean;
  avatarError?: string | null;
  onBack(): void;
  onAvatarChange?(avatar: ParticipantAvatar): void;
}) {
  return (
    <header className="game-hud">
      <div className="game-hud__topline">
        <button type="button" className="link-button game-hud__back" onClick={props.onBack}>Back</button>
        <span className="game-hud__room">Room {props.roomCode}</span>
        <span className={props.isOwnTurn ? "turn-pill active" : "turn-pill"}>{props.isOwnTurn ? "Your turn" : "Waiting"}</span>
        <SoundToggle />
        <NotificationsMenu notifications={props.notifications} />
      </div>
      <div className="game-hud__main">
        <span className="round-badge" aria-label={`Round ${props.round}`}>
          <small>Round</small>
          <strong>{props.round}</strong>
        </span>
        <div aria-live="polite" aria-atomic="true">
          <p className={props.isOwnTurn ? "action-prompt is-yours" : "action-prompt"}>{props.actionPrompt}</p>
          <span className="hen-turn">
            <Hen size={18} tone={props.isOwnTurn ? "amber" : "cream"} title="Turn marker" />
            <span className="game-hud__meta">{turnStepLabel(props.turnStep)} · {props.currentPlayerName}</span>
          </span>
        </div>
        <div className="score-strip" aria-label="Team scores">
          <span className="team-score red-team">Red {props.teamScores.red}</span>
          <span className="team-score blue-team">Blue {props.teamScores.blue}</span>
        </div>
      </div>
      {props.participant ? (
        <div className="game-hud__player">
          <span
            className="avatar"
            style={{ background: props.participant.avatar.color }}
            aria-label={`${props.participant.displayName}'s avatar`}
            role="img"
          >
            {props.participant.avatar.emoji}
          </span>
          <div>
            <strong>{props.participant.displayName}</strong>
            <p className="helper-text">
              Team {props.playerTeam ?? "spectator"}{props.activePile ? `; playing from ${props.activePile}` : ""}.
            </p>
            {props.onAvatarChange ? (
              <AvatarPicker disabled={props.avatarDisabled} value={props.participant.avatar} onChange={props.onAvatarChange} />
            ) : null}
            {props.avatarError ? <p className="action-error" role="alert">{props.avatarError}</p> : null}
          </div>
        </div>
      ) : null}
    </header>
  );
}
