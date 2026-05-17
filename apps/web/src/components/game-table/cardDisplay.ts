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
  if (meld.isBook) {
    return meld.isClean ? "Red clean book" : "Black dirty book";
  }
  return meld.isClean ? "Building red book" : "Building black book";
}

export function bookClassName(meld: MeldView): string {
  return meld.isClean ? "book-badge clean-book" : "book-badge dirty-book";
}
