import type { ParticipantAvatar } from "@hengames/shared";
import { Hen } from "./Hen";
import type { PublicPlayerState } from "./types";

export type PlayerStripParticipant = {
  displayName: string;
  avatar: ParticipantAvatar;
};

function cardCount(value: number | undefined, cards: unknown[] | undefined): number | undefined {
  if (cards) {
    return cards.length;
  }
  return value;
}

export function PlayerStrip(props: {
  players: Record<string, PublicPlayerState>;
  participants: Record<string, PlayerStripParticipant>;
  currentPlayerId: string;
  selfId?: string | null;
}) {
  return (
    <section className="player-strip" aria-label="Players">
      {Object.entries(props.players).map(([playerId, player]) => {
        const participant = props.participants[playerId];
        const isCurrent = playerId === props.currentPlayerId;
        const isSelf = playerId === props.selfId;
        const displayName = participant?.displayName ?? playerId;
        const handCount = cardCount(player.handCount, player.hand);
        const footCount = cardCount(player.footCount, player.foot);
        return (
          <article
            aria-current={isCurrent ? "true" : undefined}
            className={`place-card team-${player.teamId}${isCurrent ? " current" : ""}`}
            key={playerId}
          >
            {isCurrent ? (
              <span className="place-card__hen">
                <Hen size={20} title={`${displayName} to play`} />
              </span>
            ) : null}
            <div className="place-card__top">
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
              <span className="place-card__name">{isSelf ? `${displayName} (you)` : displayName}</span>
            </div>
            <div className="place-card__counts">
              <span className={`team-badge team-${player.teamId}`}>{player.teamId}</span>
              {handCount !== undefined ? (
                <span>{player.activePile === "hand" ? "In hand" : "Hand"} <b>{handCount}</b></span>
              ) : null}
              {footCount !== undefined ? (
                <span>{player.activePile === "foot" ? "In foot" : "Foot"} <b>{footCount}</b></span>
              ) : null}
            </div>
          </article>
        );
      })}
    </section>
  );
}

