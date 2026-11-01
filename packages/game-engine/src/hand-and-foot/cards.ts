import type { Card, Rank } from "@hengames/shared";

export { createDecks, shuffle } from "../common/deck.js";

export function isWildRank(rank: Rank): boolean {
  return rank === "2" || rank === "JOKER";
}

export function isRedThree(card: Pick<Card, "rank" | "suit">): boolean {
  return card.rank === "3" && (card.suit === "hearts" || card.suit === "diamonds");
}

export function isBlackThree(card: Pick<Card, "rank" | "suit">): boolean {
  return card.rank === "3" && (card.suit === "clubs" || card.suit === "spades");
}
