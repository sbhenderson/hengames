export type Suit = "clubs" | "diamonds" | "hearts" | "spades";
export type StandardRank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";
export type Rank = StandardRank | "JOKER";

export type Card = {
  id: string;
  rank: Rank;
  suit: Suit | "joker";
  deckIndex: number;
};

export type CardId = Card["id"];

export function cardLabel(card: Pick<Card, "rank" | "suit">): string {
  return card.rank === "JOKER" ? "Joker" : `${card.rank} ${card.suit}`;
}
