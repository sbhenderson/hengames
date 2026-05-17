import type { ParticipantAvatar } from "@hengames/shared";
import { AvatarPicker } from "../AvatarPicker";
import type { HandAndFootTableView, TeamId } from "./types";

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
  avatarDisabled: boolean;
  onBack(): void;
  onAvatarChange(avatar: ParticipantAvatar): void;
}) {
  return (
    <header className="game-hud">
      <div className="game-hud__topline">
        <button className="link-button game-hud__back" onClick={props.onBack}>Back</button>
        <span className="game-hud__room">Room {props.roomCode}</span>
        <span className={props.isOwnTurn ? "turn-pill active" : "turn-pill"}>{props.isOwnTurn ? "Your turn" : "Waiting"}</span>
      </div>
      <div className="game-hud__main">
        <div>
          <strong>Round {props.round}</strong>
          <p>{props.actionPrompt}</p>
        </div>
        <div className="score-strip" aria-label="Team scores">
          <span className="team-score red-team">Red {props.teamScores.red}</span>
          <span className="team-score blue-team">Blue {props.teamScores.blue}</span>
        </div>
      </div>
      <div className="game-hud__meta">
        <span>Current: {props.currentPlayerName}</span>
        <span>Step: {turnStepLabel(props.turnStep)}</span>
      </div>
      {props.participant ? (
        <div className="game-hud__player">
          <span className="avatar" style={{ background: props.participant.avatar.color }}>{props.participant.avatar.emoji}</span>
          <div>
            <strong>{props.participant.displayName}</strong>
            <p className="helper-text">
              Team {props.playerTeam ?? "spectator"}{props.activePile ? `; playing from ${props.activePile}` : ""}.
            </p>
            <AvatarPicker disabled={props.avatarDisabled} value={props.participant.avatar} onChange={props.onAvatarChange} />
          </div>
        </div>
      ) : null}
    </header>
  );
}

function turnStepLabel(turnStep: HandAndFootTableView["turnStep"]): string {
  if (turnStep === "must-draw") {
    return "Draw";
  }
  if (turnStep === "must-discard") {
    return "Meld or discard";
  }
  return "Meld";
}
