import type { Card, Rank, StandardRank, Suit } from "@hengames/shared";

const suits: Suit[] = ["clubs", "diamonds", "hearts", "spades"];
const ranks: StandardRank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

export function createDecks(deckCount: number): Card[] {
  const cards: Card[] = [];

  for (let deckIndex = 0; deckIndex < deckCount; deckIndex += 1) {
    for (const suit of suits) {
      for (const rank of ranks) {
        cards.push({ id: `${deckIndex}-${suit}-${rank}`, suit, rank, deckIndex });
      }
    }

    cards.push({ id: `${deckIndex}-joker-1`, suit: "joker", rank: "JOKER", deckIndex });
    cards.push({ id: `${deckIndex}-joker-2`, suit: "joker", rank: "JOKER", deckIndex });
  }

  return cards;
}

export function isWildRank(rank: Rank): boolean {
  return rank === "2" || rank === "JOKER";
}

export function shuffle(cards: Card[], seed: string): Card[] {
  const copy = [...cards];
  let state = hashSeed(seed);

  for (let index = copy.length - 1; index > 0; index -= 1) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const swapIndex = state % (index + 1);
    const current = copy[index];
    const swap = copy[swapIndex];

    if (!current || !swap) {
      throw new Error("Shuffle index out of bounds");
    }

    copy[index] = swap;
    copy[swapIndex] = current;
  }

  return copy;
}

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (const char of seed) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
