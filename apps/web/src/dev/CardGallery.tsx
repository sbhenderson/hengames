import type { Card } from "@hengames/shared";
import { PlayingCard, CardBack, DrawStack } from "../components/game-table/PlayingCard";

let n = 0;
const c = (rank: Card["rank"], suit: Card["suit"]): Card => ({ id: `g${n++}`, rank, suit, deckIndex: 0 } as Card);

const ranks: Card["rank"][] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

export function CardGallery() {
  return (
    <main className="page">
      <h1>Card gallery</h1>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", alignItems: "center" }}>
        {ranks.map((r) => (
          <PlayingCard key={`h${r}`} card={c(r, "hearts")} />
        ))}
        {ranks.map((r) => (
          <PlayingCard key={`s${r}`} card={c(r, "spades")} />
        ))}
        <PlayingCard card={c("Q", "diamonds")} />
        <PlayingCard card={c("J", "clubs")} />
        <PlayingCard card={c("JOKER", "joker")} />
        <CardBack />
        <DrawStack count={213} />
      </div>
      <h2 style={{ marginTop: "1rem" }}>Sizes</h2>
      <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
        <PlayingCard card={c("10", "diamonds")} size="sm" />
        <PlayingCard card={c("10", "diamonds")} size="md" />
        <PlayingCard card={c("10", "diamonds")} size="lg" />
        <PlayingCard card={c("K", "hearts")} size="lg" />
        <PlayingCard card={c("A", "spades")} size="lg" />
      </div>
    </main>
  );
}
