import type { Card } from "@hengames/shared";
import { meldSeal } from "./cardDisplay";
import { CardBack, DrawStack, PlayingCard } from "./PlayingCard";
import type { MeldView, TeamId } from "./types";

export function TableSurface(props: {
  topDiscard: Card | null;
  discardCount: number;
  drawCount: number;
  melds: MeldView[];
  lastEvent: string;
}) {
  return (
    <section className="table-surface" aria-label="Shared table">
      <div className="pile-row">
        <div className="pile">
          <DrawStack count={props.drawCount} />
          <span className="pile__label">Draw</span>
          <span className="pile__count">{props.drawCount}</span>
        </div>
        <div className="pile">
          <div className="discard-slot">
            {props.topDiscard ? (
              <PlayingCard card={props.topDiscard} size="lg" />
            ) : (
              <div className="discard-slot__empty">Empty</div>
            )}
          </div>
          <span className="pile__label">Discard</span>
          <span className="pile__count">{props.discardCount}</span>
        </div>
      </div>

      <div aria-live="polite" aria-atomic="true">
        {props.lastEvent ? <p className="event-banner">{props.lastEvent}</p> : null}
      </div>

      <div className="team-melds-grid">
        {(["red", "blue"] as const).map((teamId) => (
          <TeamMelds key={teamId} teamId={teamId} melds={props.melds.filter((meld) => meld.teamId === teamId)} />
        ))}
      </div>
    </section>
  );
}

const MAX_FANNED = 7;

function TeamMelds(props: { teamId: TeamId; melds: MeldView[] }) {
  const teamName = props.teamId === "red" ? "Red" : "Blue";
  return (
    <section className={`team-meld-zone ${props.teamId}-team`} aria-label={`Team ${props.teamId} books and melds`}>
      <h3>
        <span>{teamName} team</span>
        <span className={`team-badge team-${props.teamId}`}>{props.melds.length} melds</span>
      </h3>
      {props.melds.length ? (
        <div className="meld-list">
          {props.melds.map((meld) => {
            const seal = meldSeal(meld);
            const shown = meld.cards.slice(0, MAX_FANNED);
            const hidden = meld.cards.length - shown.length;
            return (
              <article className={meld.isBook ? "meld-card complete" : "meld-card"} key={meld.id}>
                <div className="meld-fan" aria-label={`${meld.cards.length} ${meld.rank}s`}>
                  {shown.map((card) => (
                    <PlayingCard card={card} key={card.id} size="sm" />
                  ))}
                </div>
                <div className="meld-card__meta">
                  <span className={`book-seal ${seal.kind}`}>{seal.label}</span>
                  <span className="pile__count">
                    {meld.cards.length}
                    {hidden > 0 ? " cards" : ""}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="helper-text">No melds yet.</p>
      )}
    </section>
  );
}
