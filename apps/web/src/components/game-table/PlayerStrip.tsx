import type { RoomSnapshot } from "../../api/trpc";
import type { PublicPlayerState } from "./types";

export function PlayerStrip(props: {
  players: Record<string, PublicPlayerState>;
  room: RoomSnapshot;
  currentPlayerId: string;
}) {
  return (
    <section className="player-strip" aria-label="Players">
      {Object.entries(props.players).map(([playerId, player]) => {
        const participant = props.room.participants.find((candidate) => candidate.id === playerId);
        const isCurrent = playerId === props.currentPlayerId;
        return (
          <article className={isCurrent ? "player-chip current" : "player-chip"} key={playerId}>
            {participant ? (
              <span className="avatar small" style={{ background: participant.avatar.color }}>{participant.avatar.emoji}</span>
            ) : null}
            <div>
              <strong>{participant?.displayName ?? playerId}</strong>
              <span>Team {player.teamId}</span>
            </div>
            <div className="player-chip__counts">
              {isCurrent ? <span className="turn-dot">Turn</span> : null}
              <span>{player.activePile}: {player.hand?.length ?? player.handCount ?? 0}</span>
              {player.footCount !== undefined ? <span>Foot: {player.footCount}</span> : null}
            </div>
          </article>
        );
      })}
    </section>
  );
}
