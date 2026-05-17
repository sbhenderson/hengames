import type { ParticipantAvatar } from "@hengames/shared";
import type { PublicPlayerState } from "./types";

export type PlayerStripParticipant = {
  displayName: string;
  avatar: ParticipantAvatar;
};

function activePileLabel(activePile: PublicPlayerState["activePile"]): string {
  return activePile === "hand" ? "Hand" : "Foot";
}

function activePileCount(player: PublicPlayerState): number {
  if (player.activePile === "foot") {
    return player.foot?.length ?? player.footCount ?? 0;
  }
  return player.hand?.length ?? player.handCount ?? 0;
}

function secondaryPileCount(player: PublicPlayerState): { label: string; count: number } | null {
  if (player.activePile === "foot") {
    const handCount = player.hand?.length ?? player.handCount;
    return handCount === undefined ? null : { label: "Hand", count: handCount };
  }

  const footCount = player.foot?.length ?? player.footCount;
  return footCount === undefined ? null : { label: "Foot", count: footCount };
}

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
        const secondaryCount = secondaryPileCount(player);
        return (
          <article aria-current={isCurrent ? "true" : undefined} className={isCurrent ? "player-chip current" : "player-chip"} key={playerId}>
            {participant ? (
              <span
                className="avatar small"
                style={{ background: participant.avatar.color }}
                aria-label={`${participant.displayName}'s avatar`}
                role="img"
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
              <span>{activePileLabel(player.activePile)}: {activePileCount(player)} cards</span>
              {secondaryCount ? <span>{secondaryCount.label}: {secondaryCount.count} cards</span> : null}
            </div>
          </article>
        );
      })}
    </section>
  );
}
