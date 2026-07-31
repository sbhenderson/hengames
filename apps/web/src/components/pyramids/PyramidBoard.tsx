import { CardBack, PlayingCard } from "../game-table/PlayingCard";
import { formatCard } from "../game-table/cardDisplay";
import type { PyramidSlotView } from "./types";

/**
 * Renders the pyramid apex-first. Each row is one card wider than the one above
 * it, so centring the rows naturally staggers the cards; overlapping rows are
 * stacked with a rising z-index so the lower rows cover the ones above.
 */
export function PyramidBoard(props: {
  rows: PyramidSlotView[][];
  disabled: boolean;
  onPlay(cardId: string): void;
}) {
  return (
    <div className="pyramid-board" role="grid" aria-label="Pyramid">
      {props.rows.map((row, rowIndex) => (
        <div
          className="pyramid-row"
          key={rowIndex}
          role="row"
          style={{ zIndex: rowIndex + 1 }}
        >
          {row.map((slot) => (
            <PyramidSlot
              disabled={props.disabled}
              key={`${slot.row}-${slot.column}`}
              onPlay={props.onPlay}
              slot={slot}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function PyramidSlot(props: {
  slot: PyramidSlotView;
  disabled: boolean;
  onPlay(cardId: string): void;
}) {
  const { slot } = props;

  if (slot.state === "removed") {
    // Kept in the layout (but invisible) so the pyramid never reflows.
    return <div className="pyramid-slot is-cleared" role="gridcell" aria-hidden="true" />;
  }

  if (slot.state === "face-down") {
    return (
      <div className="pyramid-slot" role="gridcell">
        <CardBack size="sm" />
      </div>
    );
  }

  const playable = slot.playable && !props.disabled;

  return (
    <div className="pyramid-slot" role="gridcell">
      <button
        aria-label={`Play ${formatCard(slot.card)} for ${slot.points} points`}
        className={`pyramid-card-button${slot.playable ? " is-playable" : ""}`}
        disabled={!playable}
        onClick={() => props.onPlay(slot.card.id)}
        type="button"
      >
        <PlayingCard card={slot.card} size="sm" />
      </button>
    </div>
  );
}
