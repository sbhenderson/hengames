import type { Card } from "@hengames/shared";
import { bookClassName, bookLabel, formatCard } from "./cardDisplay";
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
        <article className="pile-card">
          <span>Draw pile</span>
          <strong>{props.drawCount}</strong>
          <small>cards</small>
        </article>
        <article className="pile-card discard-pile">
          <span>Top discard</span>
          <strong>{props.topDiscard ? formatCard(props.topDiscard) : "None"}</strong>
          <small>{props.discardCount} cards</small>
        </article>
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

function TeamMelds(props: {
  teamId: TeamId;
  melds: MeldView[];
}) {
  return (
    <section className={`team-meld-zone ${props.teamId}-team`} aria-label={`Team ${props.teamId} books and melds`}>
      <h3>Team {props.teamId}</h3>
      {props.melds.length ? (
        <div className="meld-list">
          {props.melds.map((meld) => (
            <article className={meld.isBook ? "meld-card complete" : "meld-card"} key={meld.id}>
              <strong>{meld.rank}</strong>
              <span>{meld.cards.length} cards</span>
              <span className={bookClassName(meld)}>{bookLabel(meld)}</span>
            </article>
          ))}
        </div>
      ) : (
        <p className="helper-text">No melds or books yet.</p>
      )}
    </section>
  );
}
