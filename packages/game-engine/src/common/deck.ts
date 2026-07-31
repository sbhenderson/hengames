import type { Card, StandardRank, Suit } from "@hengames/shared";

export const SUITS: readonly Suit[] = ["clubs", "diamonds", "hearts", "spades"];
export const RANKS: readonly StandardRank[] = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K"
];

/** A single 52 card deck with no jokers. */
export function createStandardDeck(deckIndex = 0): Card[] {
  const cards: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push({ id: `${deckIndex}-${suit}-${rank}`, suit, rank, deckIndex });
    }
  }
  return cards;
}

/** `deckCount` decks of 52 cards plus two jokers each. */
export function createDecks(deckCount: number): Card[] {
  const cards: Card[] = [];

  for (let deckIndex = 0; deckIndex < deckCount; deckIndex += 1) {
    cards.push(...createStandardDeck(deckIndex));
    cards.push({ id: `${deckIndex}-joker-1`, suit: "joker", rank: "JOKER", deckIndex });
    cards.push({ id: `${deckIndex}-joker-2`, suit: "joker", rank: "JOKER", deckIndex });
  }

  return cards;
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

export function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (const char of seed) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
