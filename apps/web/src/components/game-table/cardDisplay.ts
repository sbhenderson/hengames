import type { Card } from "@hengames/shared";
import type { MeldView } from "./types";

export const suitEmoji: Record<Card["suit"], string> = {
  clubs: "♣️",
  diamonds: "♦️",
  hearts: "♥️",
  spades: "♠️",
  joker: "🤡"
};

export function formatCardRank(card: Card): string {
  return card.rank === "JOKER" ? "🤡" : card.rank;
}

export function formatCard(card: Card): string {
  return card.rank === "JOKER" ? "🤡 Joker" : `${card.rank} ${suitEmoji[card.suit]}`;
}

export function bookLabel(meld: MeldView): string {
  const hasWilds = meld.cards.some((card) => card.rank === "2" || card.rank === "JOKER");
  if (meld.isBook) {
    return hasWilds ? "Black dirty book" : "Red clean book";
  }
  return hasWilds ? "Building black book" : "Building red book";
}

export function bookClassName(meld: MeldView): string {
  const hasWilds = meld.cards.some((card) => card.rank === "2" || card.rank === "JOKER");
  return hasWilds ? "book-badge dirty-book" : "book-badge clean-book";
}
