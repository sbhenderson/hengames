import type { ParticipantAvatar } from "@hengames/shared";
import type { PublicPlayerState } from "./types";

export type PlayerStripParticipant = {
  displayName: string;
  avatar: ParticipantAvatar;
};

export function PlayerStrip(props: {
  players: Record<string, PublicPlayerState>;
  participants: Record<string, PlayerStripParticipant>;
  currentPlayerId: string;
}) {
  return (
    <section className="player-strip" aria-label="Players">
      {Object.entries(props.players).map(([playerId, player]) => {
        const participant = props.participants[playerId];
        const isCurrent = playerId === props.currentPlayerId;
        const displayName = participant?.displayName ?? playerId;
        return (
          <article
            aria-current={isCurrent ? "true" : undefined}
            className={`player-chip team-${player.teamId}${isCurrent ? " current" : ""}`}
            key={playerId}
            title={`${displayName} — Team ${player.teamId}`}
          >
            {participant ? (
              <span
                className="avatar small"
                style={{ background: participant.avatar.color }}
                aria-label={`${displayName}'s avatar`}
                role="img"
              >
                {participant.avatar.emoji}
              </span>
            ) : null}
            <span className={`team-badge team-${player.teamId}`}>{player.teamId}</span>
            {isCurrent ? <span className="turn-dot" aria-label="Current turn">●</span> : null}
          </article>
        );
      })}
    </section>
  );
}
