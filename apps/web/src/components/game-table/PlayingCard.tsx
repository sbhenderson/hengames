import type { Card } from "@hengames/shared";
import { Hen } from "./Hen";
import { formatCard, isRedSuit, suitChar } from "./cardDisplay";

type Pip = { x: number; y: number; flip?: boolean };

const L = 26;
const C = 50;
const R = 74;

const PIP_LAYOUTS: Record<number, Pip[]> = {
  2: [{ x: C, y: 16 }, { x: C, y: 84, flip: true }],
  3: [{ x: C, y: 16 }, { x: C, y: 50 }, { x: C, y: 84, flip: true }],
  4: [{ x: L, y: 18 }, { x: R, y: 18 }, { x: L, y: 82, flip: true }, { x: R, y: 82, flip: true }],
  5: [{ x: L, y: 18 }, { x: R, y: 18 }, { x: C, y: 50 }, { x: L, y: 82, flip: true }, { x: R, y: 82, flip: true }],
  6: [{ x: L, y: 18 }, { x: R, y: 18 }, { x: L, y: 50 }, { x: R, y: 50 }, { x: L, y: 82, flip: true }, { x: R, y: 82, flip: true }],
  7: [{ x: L, y: 16 }, { x: R, y: 16 }, { x: C, y: 33 }, { x: L, y: 50 }, { x: R, y: 50 }, { x: L, y: 84, flip: true }, { x: R, y: 84, flip: true }],
  8: [{ x: L, y: 16 }, { x: R, y: 16 }, { x: C, y: 33 }, { x: L, y: 50 }, { x: R, y: 50 }, { x: C, y: 67, flip: true }, { x: L, y: 84, flip: true }, { x: R, y: 84, flip: true }],
  9: [{ x: L, y: 15 }, { x: R, y: 15 }, { x: L, y: 38 }, { x: R, y: 38 }, { x: C, y: 50 }, { x: L, y: 62, flip: true }, { x: R, y: 62, flip: true }, { x: L, y: 85, flip: true }, { x: R, y: 85, flip: true }],
  10: [{ x: L, y: 14 }, { x: R, y: 14 }, { x: C, y: 26 }, { x: L, y: 38 }, { x: R, y: 38 }, { x: L, y: 62, flip: true }, { x: R, y: 62, flip: true }, { x: C, y: 74, flip: true }, { x: L, y: 86, flip: true }, { x: R, y: 86, flip: true }]
};

const PIP_RANK: Record<string, number> = { "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10 };

export type CardSize = "sm" | "md" | "lg";

export function PlayingCard(props: { card: Card; size?: CardSize; className?: string }) {
  const { card } = props;
  const sizeClass = props.size && props.size !== "md" ? ` ${props.size}` : "";
  const extra = props.className ? ` ${props.className}` : "";

  if (card.rank === "JOKER") {
    return (
      <div className={`playing-card joker${sizeClass}${extra}`} aria-label={formatCard(card)} role="img">
        <span className="playing-card__corner tl"><Hen size={12} /></span>
        <span className="playing-card__corner br"><Hen size={12} /></span>
        <span className="playing-card__center">
          <span className="joker-hen"><Hen size={34} /></span>
        </span>
      </div>
    );
  }

  const red = isRedSuit(card.suit);
  const suit = suitChar[card.suit];
  const colorClass = red ? "suit-red" : "suit-black";

  return (
    <div className={`playing-card ${colorClass}${sizeClass}${extra}`} aria-label={formatCard(card)} role="img">
      <span className="playing-card__corner tl">
        <span className="rank">{card.rank}</span>
        <span className="suit">{suit}</span>
      </span>
      <span className="playing-card__corner br">
        <span className="rank">{card.rank}</span>
        <span className="suit">{suit}</span>
      </span>
      <span className="playing-card__center">{renderCenter(card.rank, suit)}</span>
    </div>
  );
}

function renderCenter(rank: Exclude<Card["rank"], "JOKER">, suit: string) {
  if (rank === "A") {
    return <span className="card-ace">{suit}</span>;
  }
  if (rank === "J" || rank === "Q" || rank === "K") {
    return (
      <span className="card-court">
        <span className="card-court__suit">{suit}</span>
        <span className="card-court__letter">{rank}</span>
        <span className="card-court__suit flip">{suit}</span>
      </span>
    );
  }
  const count = PIP_RANK[rank];
  const pips = count ? PIP_LAYOUTS[count] : undefined;
  if (!pips) {
    return <span className="card-ace">{suit}</span>;
  }
  return (
    <span className="card-pips">
      {pips.map((pip, index) => (
        <span
          className="pip"
          key={index}
          style={{ left: `${pip.x}%`, top: `${pip.y}%`, transform: `translate(-50%, -50%)${pip.flip ? " rotate(180deg)" : ""}` }}
        >
          {suit}
        </span>
      ))}
    </span>
  );
}

export function CardBack(props: { size?: CardSize; className?: string }) {
  const sizeClass = props.size && props.size !== "md" ? ` ${props.size}` : "";
  const extra = props.className ? ` ${props.className}` : "";
  return (
    <div className={`card-back${sizeClass}${extra}`} role="img" aria-label="Face-down card">
      <span className="card-back__medallion">
        <Hen size={26} tone="cream" />
      </span>
    </div>
  );
}

export function DrawStack(props: { count: number }) {
  const layers = Math.max(1, Math.min(4, Math.ceil(props.count / 20)));
  return (
    <div className="draw-stack" aria-hidden="true">
      {Array.from({ length: layers }).map((_, index) => (
        <div className="draw-stack__layer" key={index} style={{ transform: `translate(${index * 2}px, ${-index * 2}px)` }} />
      ))}
      <CardBack className="draw-stack__top" />
    </div>
  );
}
