import type { Card } from "@hengames/shared";
import { formatCardRank, suitEmoji } from "./cardDisplay";
import type { CardHint } from "./types";

export function PlayingCardButton(props: {
  card: Card;
  selected: boolean;
  hint?: CardHint;
  draggable: boolean;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  onToggle(): void;
  onMoveLeft(): void;
  onMoveRight(): void;
  onDragStart(): void;
  onDragEnter(): void;
  onDragEnd(): void;
  onDragOver(): void;
}) {
  const hintClass = props.hint ? ` hint-${props.hint}` : "";
  return (
    <div className={props.selected ? "hand-card-shell selected" : "hand-card-shell"}>
      <button
        aria-label={formatCardAccessibleName(props.card)}
        aria-pressed={props.selected}
        className={`playing-card${hintClass}`}
        draggable={props.draggable}
        onClick={props.onToggle}
        onDragStart={props.onDragStart}
        onDragEnter={props.onDragEnter}
        onDragEnd={props.onDragEnd}
        onDragOver={(event) => {
          event.preventDefault();
          props.onDragOver();
        }}
        type="button"
      >
        <span>{formatCardRank(props.card)}</span>
        <small>{suitEmoji[props.card.suit]}</small>
      </button>
      {props.selected ? (
        <div className="card-reorder-controls" role="group" aria-label={`Reorder ${formatCardAccessibleName(props.card)}`}>
          <button disabled={!props.canMoveLeft} onClick={props.onMoveLeft} type="button">Move left</button>
          <button disabled={!props.canMoveRight} onClick={props.onMoveRight} type="button">Move right</button>
        </div>
      ) : null}
    </div>
  );
}

function formatCardAccessibleName(card: Card): string {
  if (card.rank === "JOKER") {
    return "Joker";
  }
  return `${card.rank} of ${card.suit}`;
}
