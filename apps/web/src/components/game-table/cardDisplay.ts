import type { Card } from "@hengames/shared";
import type { MeldView } from "./types";

export const suitChar: Record<Card["suit"], string> = {
  clubs: "\u2663",
  diamonds: "\u2666",
  hearts: "\u2665",
  spades: "\u2660",
  joker: "\u2605"
};

export function isRedSuit(suit: Card["suit"]): boolean {
  return suit === "hearts" || suit === "diamonds";
}

export function formatCardRank(card: Card): string {
  return card.rank === "JOKER" ? "JOKER" : card.rank;
}

export function formatCard(card: Card): string {
  return card.rank === "JOKER" ? "Joker" : `${card.rank} of ${card.suit}`;
}

function hasWildCards(meld: MeldView): boolean {
  return meld.cards.some((card) => card.rank === "2" || card.rank === "JOKER");
}

export type SealKind = "clean" | "dirty" | "building-clean" | "building-dirty";

export function meldSeal(meld: MeldView): { kind: SealKind; label: string } {
  if (meld.isBook) {
    return meld.isClean
      ? { kind: "clean", label: "Clean book" }
      : { kind: "dirty", label: "Dirty book" };
  }
  return hasWildCards(meld)
    ? { kind: "building-dirty", label: "Dirty" }
    : { kind: "building-clean", label: "Clean" };
}
