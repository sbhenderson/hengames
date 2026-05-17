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
        return (
          <article className={isCurrent ? "player-chip current" : "player-chip"} key={playerId}>
            {participant ? (
              <span
                className="avatar small"
                style={{ background: participant.avatar.color }}
                aria-label={`${participant.displayName}'s avatar`}
              >
                {participant.avatar.emoji}
              </span>
            ) : null}
            <div>
              <strong>{participant?.displayName ?? playerId}</strong>
              <span>Team {player.teamId}</span>
            </div>
            <div className="player-chip__counts">
              {isCurrent ? <span className="turn-dot">Turn</span> : null}
              <span>{player.activePile}: {activePileCount(player)}</span>
              {player.footCount !== undefined ? <span>Foot: {player.footCount}</span> : null}
            </div>
          </article>
        );
      })}
    </section>
  );
}

function activePileCount(player: PublicPlayerState): number {
  return player.hand?.length ?? player.handCount ?? 0;
}
