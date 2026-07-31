import type { Rank } from "@hengames/shared";

export { createDecks, shuffle } from "../common/deck.js";

export function isWildRank(rank: Rank): boolean {
  return rank === "2" || rank === "JOKER";
}
